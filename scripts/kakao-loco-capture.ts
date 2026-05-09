#!/usr/bin/env bun
/**
 * KakaoTalk LOCO wire-format capture (diagnostic only).
 *
 * Issues a small, throttled set of LOCO requests against a real account and
 * writes the BSON response bodies to /tmp for offline schema inspection. PII
 * is redacted (user IDs hashed, profile URLs scrubbed, message content elided)
 * before anything is written to disk.
 *
 * Defaults are intentionally conservative: 3 chats max, 1500ms between LOCO
 * calls, dry-run unless `--confirm` is passed. The goal is to avoid bursting
 * KakaoTalk's servers from a real account during local investigation.
 *
 * Usage:
 *   bun scripts/kakao-loco-capture.ts                 # Dry-run plan (no LOCO calls)
 *   bun scripts/kakao-loco-capture.ts --confirm       # Execute with defaults
 *   bun scripts/kakao-loco-capture.ts --chat-id 123 --confirm
 *   bun scripts/kakao-loco-capture.ts --commands CHATINFO,CHATONROOM --confirm
 *
 * NOT shipped to npm consumers: this is a developer tool under scripts/, never
 * imported by published code.
 */

import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

import { Long } from 'bson'

import { KakaoTalkClient } from '../src/platforms/kakaotalk/client'
import type { LocoSession } from '../src/platforms/kakaotalk/protocol/session'

const SUPPORTED_COMMANDS = ['CHATINFO', 'CHATONROOM', 'MEMBER', 'GETMEM', 'INFOLINK', 'LCHATLIST'] as const
type Command = (typeof SUPPORTED_COMMANDS)[number]

interface Args {
  chatId: string | null
  maxChats: number
  delayMs: number
  commands: Command[]
  confirm: boolean
  account: string | null
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    chatId: null,
    maxChats: 3,
    delayMs: 1500,
    commands: [...SUPPORTED_COMMANDS],
    confirm: false,
    account: null,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--confirm') {
      args.confirm = true
      continue
    }
    const next = argv[i + 1]
    if (arg === '--chat-id' && next) {
      args.chatId = next
      i++
    } else if (arg === '--max-chats' && next) {
      args.maxChats = Math.max(1, Number.parseInt(next, 10) || 1)
      i++
    } else if (arg === '--delay-ms' && next) {
      args.delayMs = Math.max(0, Number.parseInt(next, 10) || 0)
      i++
    } else if (arg === '--commands' && next) {
      const requested = next.split(',').map((s) => s.trim().toUpperCase())
      const unknown = requested.filter((c): c is Command => !SUPPORTED_COMMANDS.includes(c as Command))
      if (unknown.length > 0) {
        throw new Error(`Unknown commands: ${unknown.join(', ')}. Supported: ${SUPPORTED_COMMANDS.join(', ')}`)
      }
      args.commands = requested as Command[]
      i++
    } else if (arg === '--account' && next) {
      args.account = next
      i++
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`)
    }
  }

  return args
}

function printHelp(): void {
  console.log(`
kakao-loco-capture — diagnostic LOCO wire dumper (developer tool)

Usage:
  bun scripts/kakao-loco-capture.ts [options]

Options:
  --chat-id <id>      Probe only this chat (skips --max-chats limit for the chosen chat)
  --max-chats <n>     Number of chats to probe from your login snapshot (default: 3)
  --delay-ms <n>      Delay between LOCO calls in ms (default: 1500)
  --commands <list>   Comma-separated subset of: ${SUPPORTED_COMMANDS.join(', ')}
                      (default: all)
  --account <id>      Use a specific KakaoTalk account
  --confirm           Actually issue LOCO calls. Without this, prints the plan only.
  --help, -h          Show this help

Output: /tmp/kakao-loco-capture-<timestamp>.json (PII redacted)
`)
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function hashUserId(id: unknown): string {
  if (id === null || id === undefined) return '<null>'
  return `user_${createHash('sha256').update(String(id)).digest('hex').slice(0, 8)}`
}

function isLong(v: unknown): v is { low: number; high: number } {
  return typeof v === 'object' && v !== null && 'low' in v && 'high' in v
}

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi
const USERID_KEYS = new Set(['userId', 'authorId', 'uid', 'i', 'mid', 'mids', 'memberIds', 'memberId', 'olu', 'opt'])
const CONTENT_KEYS = new Set(['message', 'msg', 'content', 'statusMessage', 'desc', 'description'])

function redact(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) return value
  if (isLong(value)) {
    if (key && USERID_KEYS.has(key)) return hashUserId(`${value.high}_${value.low}`)
    return { __long: true, low: value.low, high: value.high }
  }
  if (typeof value === 'number') {
    if (key && USERID_KEYS.has(key)) return hashUserId(value)
    return value
  }
  if (typeof value === 'string') {
    if (key && CONTENT_KEYS.has(key)) {
      return value.length > 32 ? `<redacted:${value.length}chars>` : '<redacted>'
    }
    return value.replace(URL_PATTERN, '<url>')
  }
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, key))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = redact(v, k)
    }
    return out
  }
  return value
}

function parseLong(s: string): Long {
  const big = BigInt(s)
  const low = Number(big & 0xffffffffn)
  const high = Number((big >> 32n) & 0xffffffffn)
  return new Long(low, high)
}

interface CaptureEntry {
  command: Command
  chatId: string
  status: 'ok' | 'error'
  status_code?: number
  body?: unknown
  error?: string
  duration_ms: number
}

interface SessionWithConnection {
  connection: { sendPacket: (method: string, body: Record<string, unknown>) => Promise<unknown> } | null
}

async function sendRaw(
  session: LocoSession,
  command: string,
  body: Record<string, unknown>,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  // Diagnostic-only escape hatch: reach into the session's private connection to
  // send commands that aren't yet exposed as typed methods (MEMBER/GETMEM/INFOLINK).
  // This is intentional in a developer tool; production code should add typed
  // methods to LocoSession (PRs 3 & 4 will).
  const conn = (session as unknown as SessionWithConnection).connection
  if (!conn) throw new Error('LocoSession has no active connection')
  const packet = (await conn.sendPacket(command, body)) as { statusCode: number; body: Record<string, unknown> }
  return packet
}

async function probe(
  session: LocoSession,
  command: Command,
  chat: Record<string, unknown>,
  delayMs: number,
): Promise<CaptureEntry> {
  const chatId = parseLong(String(chat.c))
  const chatIdStr = String(chat.c)
  const start = Date.now()

  await sleep(delayMs)

  try {
    let body: Record<string, unknown>
    let statusCode = 0

    switch (command) {
      case 'CHATINFO': {
        const res = await session.getChannelInfo(chatId)
        body = res.body
        statusCode = res.statusCode
        break
      }
      case 'CHATONROOM': {
        const res = await session.getChatInfo(chatId)
        body = res.body
        statusCode = res.statusCode
        break
      }
      case 'LCHATLIST': {
        const res = await session.getChatList()
        body = res.body
        statusCode = res.statusCode
        break
      }
      case 'MEMBER': {
        const memberIds = (chat.i as Array<{ low: number; high: number }> | undefined) ?? []
        const sample = memberIds.slice(0, 3).map((m) => new Long(m.low, m.high))
        if (sample.length === 0) {
          return {
            command,
            chatId: chatIdStr,
            status: 'error',
            error: 'no member ids available in chat data — skipping',
            duration_ms: Date.now() - start,
          }
        }
        const res = await sendRaw(session, 'MEMBER', { chatId, memberIds: sample })
        body = res.body
        statusCode = res.statusCode
        break
      }
      case 'GETMEM': {
        const res = await sendRaw(session, 'GETMEM', { chatId })
        body = res.body
        statusCode = res.statusCode
        break
      }
      case 'INFOLINK': {
        const linkId = chat.li
        if (!linkId) {
          return {
            command,
            chatId: chatIdStr,
            status: 'error',
            error: 'not an open chat (no `li` field) — skipping',
            duration_ms: Date.now() - start,
          }
        }
        const res = await sendRaw(session, 'INFOLINK', { lis: [linkId], ref: 'EW' })
        body = res.body
        statusCode = res.statusCode
        break
      }
    }

    return {
      command,
      chatId: chatIdStr,
      status: 'ok',
      status_code: statusCode,
      body: redact(body),
      duration_ms: Date.now() - start,
    }
  } catch (error) {
    return {
      command,
      chatId: chatIdStr,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - start,
    }
  }
}

function selfCheckRedact(): void {
  // Defensive: any change that breaks redaction would silently leak PII into the
  // capture file. Verify on every run against a known fixture before any LOCO
  // calls happen. Fail loud if the contract changes.
  const fixture = {
    chatInfo: {
      type: 'MultiChat',
      chatMetas: [
        { type: 3, content: 'My Group' },
        { type: 1, content: 'Pinned message body' },
      ],
      displayMembers: [{ userId: 42, nickName: 'Alice', profileImageUrl: 'https://kakao.com/p/alice.jpg' }],
    },
    authorId: 1234567890,
    message: 'secret hi',
    l: { low: 999, high: 0 },
  }
  const out = redact(fixture) as Record<string, unknown>
  const info = out.chatInfo as Record<string, unknown>
  const display = (info.displayMembers as Array<Record<string, unknown>>)[0]
  const metas = info.chatMetas as Array<Record<string, unknown>>

  const failures: string[] = []
  if (out.authorId === 1234567890) failures.push('authorId not hashed')
  if (display.userId === 42) failures.push('displayMembers[].userId not hashed')
  if ((display.profileImageUrl as string) !== '<url>') failures.push('profileImageUrl not scrubbed')
  if (out.message !== '<redacted>') failures.push('message content not redacted')
  if (metas[0].content !== '<redacted>') failures.push('chatMetas content not redacted')
  if (typeof out.l !== 'object' || (out.l as Record<string, unknown>).__long !== true) {
    failures.push('non-user Long not preserved as tagged shape')
  }

  if (failures.length > 0) {
    throw new Error(`redact() self-check failed:\n  - ${failures.join('\n  - ')}`)
  }
}

async function main(): Promise<void> {
  selfCheckRedact()

  const args = parseArgs(process.argv.slice(2))

  console.log('kakao-loco-capture — plan:')
  console.log(`  max_chats: ${args.maxChats}`)
  console.log(`  delay_ms:  ${args.delayMs}`)
  console.log(`  commands:  ${args.commands.join(', ')}`)
  console.log(`  chat_id:   ${args.chatId ?? '<from login snapshot>'}`)
  console.log(`  account:   ${args.account ?? '<current>'}`)
  console.log(`  confirm:   ${args.confirm}`)
  console.log()

  if (!args.confirm) {
    console.log('Dry run (no --confirm). Re-run with --confirm to actually issue LOCO calls.')
    return
  }

  const client = new KakaoTalkClient()
  await client.login(undefined, args.account ?? undefined)

  try {
    const allChats = await client.getChats()
    if (allChats.length === 0) {
      console.error('No chats in login snapshot. Aborting.')
      return
    }

    const session = await client.acquireSession()

    const sessionState = (
      client as unknown as { state: { loginResult: { chatDatas?: Array<Record<string, unknown>> } } }
    ).state
    const chatDatas = sessionState?.loginResult?.chatDatas ?? []

    let targets: Array<Record<string, unknown>>
    if (args.chatId) {
      const match = chatDatas.find((c) => String(c.c) === args.chatId)
      if (!match) {
        console.error(`chat ${args.chatId} not in login snapshot`)
        return
      }
      targets = [match]
    } else {
      targets = chatDatas.slice(0, args.maxChats)
    }

    console.log(`Probing ${targets.length} chat(s) with ${args.commands.length} command(s) each...`)
    console.log(`Estimated wire calls: ${targets.length * args.commands.length}`)
    console.log(`Estimated duration: ~${Math.ceil((targets.length * args.commands.length * args.delayMs) / 1000)}s`)
    console.log()

    const entries: CaptureEntry[] = []

    if (args.commands.includes('LCHATLIST')) {
      entries.push({
        command: 'LCHATLIST',
        chatId: '<login_snapshot>',
        status: 'ok',
        body: redact({ chatDatas: chatDatas.slice(0, args.maxChats) }),
        duration_ms: 0,
      })
    }

    for (const chat of targets) {
      for (const command of args.commands) {
        if (command === 'LCHATLIST') continue
        const result = await probe(session, command, chat, args.delayMs)
        const tag = result.status === 'ok' ? 'ok ' : 'ERR'
        console.log(
          `  [${tag}] ${command.padEnd(10)} chat=${result.chatId} ${result.duration_ms}ms${result.error ? `: ${result.error}` : ''}`,
        )
        entries.push(result)
      }
    }

    const outPath = `/tmp/kakao-loco-capture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const payload = {
      captured_at: new Date().toISOString(),
      args: { ...args, account: args.account ? '<redacted>' : null },
      entries,
    }
    writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
    console.log()
    console.log(`Wrote ${entries.length} entries to ${outPath}`)
  } finally {
    client.close()
  }
}

main().catch((error) => {
  console.error('kakao-loco-capture failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
