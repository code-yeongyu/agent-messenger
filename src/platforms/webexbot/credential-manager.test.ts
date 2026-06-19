import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { WebexBotCredentialManager } from './credential-manager'

const CREDS_A = {
  token: 'bot-token-a',
  bot_id: 'bot-123',
  bot_name: 'Bot A',
}

const CREDS_B = {
  token: 'bot-token-b',
  bot_id: 'bot-456',
  bot_name: 'Bot B',
}

describe('WebexBotCredentialManager', () => {
  let tempDir: string
  let manager: WebexBotCredentialManager

  beforeEach(async () => {
    tempDir = join(tmpdir(), `webexbot-cred-test-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    manager = new WebexBotCredentialManager(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
    delete process.env.E2E_WEBEXBOT_TOKEN
  })

  it('returns empty config when no file exists', async () => {
    const config = await manager.load()

    expect(config.current).toBeNull()
    expect(config.bots).toEqual({})
  })

  it('persists config to file', async () => {
    const config = {
      current: { bot_id: 'bot-123' },
      bots: {
        'bot-123': { bot_id: 'bot-123', bot_name: 'Test Bot', token: 'test-token' },
      },
    }

    await manager.save(config)
    const loaded = await manager.load()

    expect(loaded).toEqual(config)
  })

  it('returns null when no credentials exist', async () => {
    expect(await manager.getCredentials()).toBeNull()
  })

  it('returns current bot credentials', async () => {
    await manager.setCredentials(CREDS_A)

    const creds = await manager.getCredentials()

    expect(creds).toEqual(CREDS_A)
  })

  it('returns specific bot by id', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    const creds = await manager.getCredentials('bot-123')

    expect(creds).toEqual(CREDS_A)
  })

  it('returns null for non-existent bot id', async () => {
    await manager.setCredentials(CREDS_A)

    const creds = await manager.getCredentials('nonexistent')

    expect(creds).toBeNull()
  })

  it('env var takes precedence when no botId specified', async () => {
    await manager.setCredentials(CREDS_A)

    process.env.E2E_WEBEXBOT_TOKEN = 'env-token'

    const creds = await manager.getCredentials()

    expect(creds).toEqual({ token: 'env-token', bot_id: 'env', bot_name: 'env' })
  })

  it('env var is ignored when botId explicitly provided', async () => {
    await manager.setCredentials(CREDS_A)

    process.env.E2E_WEBEXBOT_TOKEN = 'env-token'

    const creds = await manager.getCredentials('bot-123')

    expect(creds).toEqual(CREDS_A)
  })

  it('stores multiple bots and sets latest as current', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    const config = await manager.load()
    expect(Object.keys(config.bots)).toEqual(['bot-123', 'bot-456'])
    expect(config.current).toEqual({ bot_id: 'bot-456' })
  })

  it('returns all bots with current flag', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    const all = await manager.listAll()

    expect(all).toHaveLength(2)
    expect(all.find((b) => b.bot_id === 'bot-123')?.is_current).toBe(false)
    expect(all.find((b) => b.bot_id === 'bot-456')?.is_current).toBe(true)
  })

  it('switches current bot', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    const switched = await manager.setCurrent('bot-123')

    expect(switched).toBe(true)
    const creds = await manager.getCredentials()
    expect(creds?.bot_id).toBe('bot-123')
  })

  it('returns false when switching to unknown bot', async () => {
    expect(await manager.setCurrent('nonexistent')).toBe(false)
  })

  it('removes a bot by id', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    const removed = await manager.removeBot('bot-123')

    expect(removed).toBe(true)
    const config = await manager.load()
    expect(Object.keys(config.bots)).toEqual(['bot-456'])
  })

  it('clears current when current bot is removed', async () => {
    await manager.setCredentials(CREDS_A)

    await manager.removeBot('bot-123')

    const config = await manager.load()
    expect(config.current).toBeNull()
  })

  it('clears all credentials', async () => {
    await manager.setCredentials(CREDS_A)
    await manager.setCredentials(CREDS_B)

    await manager.clearCredentials()

    const config = await manager.load()
    expect(config.current).toBeNull()
    expect(config.bots).toEqual({})
  })

  it('saves file with secure permissions', async () => {
    await manager.setCredentials(CREDS_A)

    const credPath = join(tempDir, 'webexbot-credentials.json')
    const stats = await stat(credPath)

    expect(stats.mode & 0o777).toBe(0o600)
  })
})
