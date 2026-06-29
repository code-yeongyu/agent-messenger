import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { IMessageCredentialManager } from '../credential-manager'
import { performSetup } from './setup'

const STUB = join(import.meta.dir, '..', 'test-stub-imsg.mjs')
const testDirs: string[] = []
const saved: Record<string, string | undefined> = {}

function freshManager(): { manager: IMessageCredentialManager; dir: string } {
  const dir = join(import.meta.dir, `.test-setup-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  testDirs.push(dir)
  return { manager: new IMessageCredentialManager(dir), dir }
}

function setEnv(bin?: string): void {
  saved.IMSG_STUB_MODE = process.env.IMSG_STUB_MODE
  saved.AGENT_IMESSAGE_BIN = process.env.AGENT_IMESSAGE_BIN
  process.env.IMSG_STUB_MODE = 'ok'
  if (bin === undefined) delete process.env.AGENT_IMESSAGE_BIN
  else process.env.AGENT_IMESSAGE_BIN = bin
}

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  for (const dir of testDirs) rmSync(dir, { recursive: true, force: true })
})

describe('performSetup', () => {
  it('saves the account when the supplied --bin verifies', async () => {
    setEnv()
    const { manager, dir } = freshManager()
    const result = await performSetup({ bin: STUB, manager })
    expect(result.ok).toBe(true)
    expect(existsSync(join(dir, 'imessage-credentials.json'))).toBe(true)
    expect((await manager.resolveAccount())?.binary_path).toBe(STUB)
  })

  it('does NOT persist an account when an invalid --bin fails, even if the default binary is valid', async () => {
    setEnv(STUB)
    const { manager, dir } = freshManager()
    const result = await performSetup({ bin: '/nonexistent/custom-imsg', manager })
    expect(result.ok).toBe(false)
    expect(result.report.code).toBe('imsg_not_found')
    expect(existsSync(join(dir, 'imessage-credentials.json'))).toBe(false)
  })
})
