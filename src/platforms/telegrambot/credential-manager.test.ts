import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { TelegramBotCredentialManager } from './credential-manager'

const CREDS_A = {
  token: '123456789:ABC-A',
  bot_id: 'bot-a',
  bot_name: 'Bot A',
}

const CREDS_B = {
  token: '987654321:XYZ-B',
  bot_id: 'bot-b',
  bot_name: 'Bot B',
}

describe('TelegramBotCredentialManager', () => {
  let tempDir: string
  let manager: TelegramBotCredentialManager

  beforeEach(async () => {
    tempDir = join(tmpdir(), `telegrambot-cred-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tempDir, { recursive: true })
    manager = new TelegramBotCredentialManager(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
    delete process.env.E2E_TELEGRAMBOT_TOKEN
  })

  describe('load', () => {
    it('returns empty config when no file exists', async () => {
      const config = await manager.load()
      expect(config.current).toBeNull()
      expect(config.bots).toEqual({})
    })
  })

  describe('save and load', () => {
    it('persists config to file', async () => {
      const config = {
        current: { bot_id: 'bot-a' },
        bots: {
          'bot-a': { bot_id: 'bot-a', bot_name: 'Bot A', token: '123:abc' },
        },
      }
      await manager.save(config)
      const loaded = await manager.load()
      expect(loaded).toEqual(config)
    })
  })

  describe('getCredentials', () => {
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
      const creds = await manager.getCredentials('bot-a')
      expect(creds).toEqual(CREDS_A)
    })

    it('returns null for non-existent bot id', async () => {
      await manager.setCredentials(CREDS_A)
      const creds = await manager.getCredentials('nope')
      expect(creds).toBeNull()
    })

    it('env var takes precedence when no botId specified', async () => {
      await manager.setCredentials(CREDS_A)
      process.env.E2E_TELEGRAMBOT_TOKEN = 'env-token'
      const creds = await manager.getCredentials()
      expect(creds?.token).toBe('env-token')
      expect(creds?.bot_id).toBe('env')
    })

    it('env var ignored when botId explicitly provided', async () => {
      await manager.setCredentials(CREDS_A)
      process.env.E2E_TELEGRAMBOT_TOKEN = 'env-token'
      const creds = await manager.getCredentials('bot-a')
      expect(creds?.token).toBe(CREDS_A.token)
    })
  })

  describe('setCredentials', () => {
    it('stores bot and sets as current', async () => {
      await manager.setCredentials(CREDS_A)
      const config = await manager.load()
      expect(config.current).toEqual({ bot_id: 'bot-a' })
      expect(config.bots['bot-a'].token).toBe(CREDS_A.token)
    })

    it('stores multiple bots', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials(CREDS_B)
      const config = await manager.load()
      expect(Object.keys(config.bots).sort()).toEqual(['bot-a', 'bot-b'])
      expect(config.current).toEqual({ bot_id: 'bot-b' })
    })

    it('overwrites existing bot with same id', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials({ ...CREDS_A, bot_name: 'Updated' })
      const config = await manager.load()
      expect(Object.keys(config.bots)).toHaveLength(1)
      expect(config.bots['bot-a'].bot_name).toBe('Updated')
    })
  })

  describe('listAll', () => {
    it('returns all bots with current flag', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials(CREDS_B)
      const all = await manager.listAll()
      expect(all).toHaveLength(2)
      expect(all.find((b) => b.bot_id === 'bot-a')?.is_current).toBe(false)
      expect(all.find((b) => b.bot_id === 'bot-b')?.is_current).toBe(true)
    })

    it('returns empty array when no bots exist', async () => {
      expect(await manager.listAll()).toEqual([])
    })
  })

  describe('setCurrent', () => {
    it('switches current bot', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials(CREDS_B)
      const switched = await manager.setCurrent('bot-a')
      expect(switched).toBe(true)
      const creds = await manager.getCredentials()
      expect(creds?.bot_id).toBe('bot-a')
    })

    it('returns false for unknown bot', async () => {
      expect(await manager.setCurrent('nope')).toBe(false)
    })
  })

  describe('removeBot', () => {
    it('removes a bot by id', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials(CREDS_B)
      const removed = await manager.removeBot('bot-a')
      expect(removed).toBe(true)
      const config = await manager.load()
      expect(Object.keys(config.bots)).toEqual(['bot-b'])
    })

    it('clears current when current bot removed', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.removeBot('bot-a')
      const config = await manager.load()
      expect(config.current).toBeNull()
    })

    it('returns false for unknown bot', async () => {
      expect(await manager.removeBot('nope')).toBe(false)
    })
  })

  describe('clearCredentials', () => {
    it('removes all credentials', async () => {
      await manager.setCredentials(CREDS_A)
      await manager.setCredentials(CREDS_B)
      await manager.clearCredentials()
      const config = await manager.load()
      expect(config.current).toBeNull()
      expect(config.bots).toEqual({})
    })
  })

  describe('file permissions', () => {
    it('saves file with secure permissions (600)', async () => {
      await manager.setCredentials(CREDS_A)
      const credPath = join(tempDir, 'telegrambot-credentials.json')
      const stats = await stat(credPath)
      expect(stats.mode & 0o777).toBe(0o600)
    })
  })
})
