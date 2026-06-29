import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { IMessageCredentialManager } from './credential-manager'
import type { IMessageAccount } from './types'

const testDirs: string[] = []
const saved: Record<string, string | undefined> = {}

function setup(): IMessageCredentialManager {
  const dir = join(import.meta.dir, `.test-imsg-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  testDirs.push(dir)
  return new IMessageCredentialManager(dir)
}

function makeAccount(overrides?: Partial<IMessageAccount>): IMessageAccount {
  const now = new Date().toISOString()
  return {
    account_id: 'home',
    provider: 'imsg',
    binary_path: '/opt/homebrew/bin/imsg',
    region: 'US',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function clearEnv(): void {
  for (const k of ['AGENT_IMESSAGE_BIN', 'AGENT_IMESSAGE_REGION']) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
}

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  for (const dir of testDirs) rmSync(dir, { recursive: true, force: true })
})

describe('IMessageCredentialManager', () => {
  it('persists provider-aware schema with enforced 0600', async () => {
    clearEnv()
    const manager = setup()
    await manager.setAccount(makeAccount())
    const path = join(testDirs[testDirs.length - 1]!, 'imessage-credentials.json')
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).mode & 0o777).toBe(0o600)
    const config = await manager.loadConfig()
    expect(config.accounts.home?.provider).toBe('imsg')
  })

  it('resolveAccount: env AGENT_IMESSAGE_BIN/REGION override stored, not persisted', async () => {
    clearEnv()
    const manager = setup()
    await manager.setAccount(makeAccount({ binary_path: '/stored/imsg', region: 'GB' }))

    expect(await manager.resolveAccount()).toEqual({ binary_path: '/stored/imsg', region: 'GB' })

    process.env.AGENT_IMESSAGE_BIN = '/env/imsg'
    process.env.AGENT_IMESSAGE_REGION = 'US'
    expect(await manager.resolveAccount()).toEqual({ binary_path: '/env/imsg', region: 'US' })

    const fresh = await manager.getAccount('home')
    expect(fresh?.binary_path).toBe('/stored/imsg')
  })

  it('resolveAccount returns env-only when no account but AGENT_IMESSAGE_BIN set', async () => {
    clearEnv()
    const manager = setup()
    expect(await manager.resolveAccount()).toBeNull()
    process.env.AGENT_IMESSAGE_BIN = '/env/imsg'
    expect(await manager.resolveAccount()).toEqual({ binary_path: '/env/imsg', region: undefined })
  })

  it('coerces malformed config and drops invalid accounts', async () => {
    clearEnv()
    const dir = join(import.meta.dir, `.test-imsg-bad-${Date.now()}`)
    testDirs.push(dir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'imessage-credentials.json'),
      JSON.stringify({ current: 'missing', accounts: { good: { account_id: 'good' }, junk: 'x' } }),
    )
    const config = await new IMessageCredentialManager(dir).loadConfig()
    expect(Object.keys(config.accounts)).toEqual(['good'])
    expect(config.current).toBe('good')
  })

  it('re-indexes accounts by validated account_id when the persisted key differs', async () => {
    clearEnv()
    const dir = join(import.meta.dir, `.test-imsg-reindex-${Date.now()}`)
    testDirs.push(dir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'imessage-credentials.json'),
      JSON.stringify({
        current: 'home',
        accounts: { 'stale-key': { account_id: 'home', server_url: undefined, binary_path: '/x/imsg' } },
      }),
    )
    const manager = new IMessageCredentialManager(dir)
    const config = await manager.loadConfig()
    expect(Object.keys(config.accounts)).toEqual(['home'])
    expect(config.current).toBe('home')
    expect((await manager.getAccount('home'))?.binary_path).toBe('/x/imsg')
  })

  it('removeAccount reassigns current; setCurrent false for unknown', async () => {
    clearEnv()
    const manager = setup()
    await manager.setAccount(makeAccount({ account_id: 'a' }))
    await manager.setAccount(makeAccount({ account_id: 'b' }))
    expect(await manager.removeAccount('a')).toBe(true)
    expect((await manager.getAccount())?.account_id).toBe('b')
    expect(await manager.setCurrent('ghost')).toBe(false)
  })
})
