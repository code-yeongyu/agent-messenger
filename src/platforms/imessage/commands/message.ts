import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { IMessageError, type IMessageMessageSummary } from '../types'
import { parseLimitOption, resolveChatId, resolveChatTarget, withImsgClient } from './shared'

async function listAction(
  chat: string,
  options: { account?: string; pretty?: boolean; limit?: string; start?: string },
): Promise<void> {
  try {
    const limit = parseLimitOption(options.limit, 25)
    const messages = await withImsgClient(options, async (client) => {
      const chatId = await resolveChatId(client, chat)
      return client.getMessages(chatId, limit, options.start)
    })
    console.log(formatOutput(messages, options.pretty))
    process.exit(0)
  } catch (error) {
    handleError(error as Error)
  }
}

async function sendAction(chat: string, text: string, options: { account?: string; pretty?: boolean }): Promise<void> {
  try {
    const message = await withImsgClient(options, (client) => client.sendMessage(resolveChatTarget(chat), text))
    console.log(formatOutput(message, options.pretty))
    process.exit(0)
  } catch (error) {
    handleError(error as Error)
  }
}

async function reactAction(
  chat: string,
  reaction: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    await withImsgClient(options, async (client) => {
      const chatId = await resolveChatId(client, chat)
      await client.sendReaction(chatId, reaction)
    })
    console.log(formatOutput({ success: true, chat, reaction }, options.pretty))
    process.exit(0)
  } catch (error) {
    handleError(error as Error)
  }
}

function parseRowId(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  if (!/^\d+$/.test(raw.trim())) {
    throw new IMessageError('--since-rowid must be a non-negative integer.', 'invalid_limit')
  }
  return Number.parseInt(raw.trim(), 10)
}

async function watchAction(options: {
  account?: string
  pretty?: boolean
  chat?: string
  sinceRowid?: string
  jsonl?: boolean
}): Promise<void> {
  try {
    const sinceRowId = parseRowId(options.sinceRowid)
    await withImsgClient(options, async (client) => {
      const chatId = options.chat && options.chat !== 'all' ? await resolveChatId(client, options.chat) : undefined
      const seen = new Set<string>()
      const SEEN_CAP = 2000
      let running = true

      const emit = (msg: IMessageMessageSummary): void => {
        if (msg.guid) {
          if (seen.has(msg.guid)) return
          seen.add(msg.guid)
          if (seen.size > SEEN_CAP) {
            const oldest = seen.values().next().value
            if (oldest !== undefined) seen.delete(oldest)
          }
        }
        console.log(options.jsonl ? JSON.stringify(msg) : formatOutput(msg, options.pretty))
      }

      const stop = await client.watch(emit, {
        chatId,
        sinceRowId,
        onError: (m) => console.error(JSON.stringify({ warning: m })),
      })

      await new Promise<void>((resolve) => {
        const shutdown = (): void => {
          if (!running) return
          running = false
          void stop().finally(resolve)
        }
        process.on('SIGINT', shutdown)
        process.on('SIGTERM', shutdown)
      })
    })
    process.exit(0)
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('iMessage message commands')
  .addCommand(
    new Command('list')
      .description('List messages from a chat')
      .argument('<chat>', 'Chat id, guid, or identifier')
      .option('--limit <n>', 'Number of messages to fetch', '25')
      .option('--start <iso>', 'Only messages on/after this ISO timestamp')
      .option('--account <id>', 'Use a specific iMessage account')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('send')
      .description('Send a text message to a chat or recipient')
      .argument('<chat>', 'Chat id/guid, or a phone/email recipient')
      .argument('<text>', 'Message text')
      .option('--account <id>', 'Use a specific iMessage account')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction),
  )
  .addCommand(
    new Command('react')
      .description('React to the most recent incoming message in a chat (standard tapbacks)')
      .argument('<chat>', 'Chat id, guid, or identifier')
      .argument('<reaction>', 'love | like | dislike | laugh | emphasis | question')
      .option('--account <id>', 'Use a specific iMessage account')
      .option('--pretty', 'Pretty print JSON output')
      .action(reactAction),
  )
  .addCommand(
    new Command('watch')
      .description('Stream new messages via imsg (resumable with --since-rowid)')
      .option('--chat <ref|all>', 'Watch a specific chat or "all"', 'all')
      .option('--since-rowid <n>', 'Replay messages after this message rowid, then stream live')
      .option('--jsonl', 'Emit one JSON object per line')
      .option('--account <id>', 'Use a specific iMessage account')
      .option('--pretty', 'Pretty print JSON output')
      .action(watchAction),
  )

export { parseRowId }
