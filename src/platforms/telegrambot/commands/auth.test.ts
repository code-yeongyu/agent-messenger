import { afterEach, beforeEach, describe, expect, mock, it } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mockGetMe = mock(() =>
  Promise.resolve({
    id: 123456,
    is_bot: true,
    first_name: 'Test',
    username: 'testbot',
  }),
)

mock.module('../client', () => ({
  TelegramBotClient: class MockTelegramBotClient {
    async login(_credentials?: unknown): Promise<this> {
      return this
    }
    getMe = mockGetMe
  },
}))

import { TelegramBotCredentialManager } from '../credential-manager'
import { clearAction, listAction, removeAction, setAction, statusAction, useAction } from './auth'

describe('auth commands', () => {
  let tempDir: string
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    tempDir = join(tmpdir(), `telegrambot-auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tempDir, { recursive: true })
    originalEnv = { ...process.env }
    delete process.env.E2E_TELEGRAMBOT_TOKEN
    mockGetMe.mockClear()
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
    process.env = originalEnv
  })

  describe('setAction', () => {
    it('validates and stores bot token using username as bot_id', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)

      const result = await setAction('123:abc', { _credManager: manager })

      expect(result.success).toBe(true)
      expect(result.bot_id).toBe('testbot')
      expect(result.bot_name).toBe('testbot')

      const creds = await manager.getCredentials()
      expect(creds?.token).toBe('123:abc')
      expect(creds?.bot_id).toBe('testbot')
    })

    it('uses --bot flag as bot_id', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)

      const result = await setAction('123:abc', { bot: 'deploy', _credManager: manager })

      expect(result.bot_id).toBe('deploy')
      expect(await manager.getCredentials('deploy')).not.toBeNull()
    })

    it('falls back to numeric id when username missing', async () => {
      mockGetMe.mockImplementationOnce(() =>
        Promise.resolve({
          id: 123456,
          is_bot: true,
          first_name: 'NoUsername',
        }),
      )

      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await setAction('123:abc', { _credManager: manager })

      expect(result.bot_id).toBe('123456')
    })

    it('rejects non-bot tokens (is_bot: false)', async () => {
      mockGetMe.mockImplementationOnce(() =>
        Promise.resolve({
          id: 123456,
          is_bot: false,
          first_name: 'User',
        }),
      )

      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await setAction('user-token', { _credManager: manager })

      expect(result.error).toBeDefined()
      expect(result.error).toContain('not')
    })

    it('handles client errors', async () => {
      mockGetMe.mockImplementationOnce(() => Promise.reject(new Error('Unauthorized: invalid token')))

      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await setAction('bad', { _credManager: manager })

      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('clearAction', () => {
    it('removes all stored credentials', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: 't', bot_id: 'b', bot_name: 'B' })

      const result = await clearAction({ _credManager: manager })

      expect(result.success).toBe(true)
      expect(await manager.getCredentials()).toBeNull()
    })
  })

  describe('statusAction', () => {
    it('returns no credentials when none set', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await statusAction({ _credManager: manager })

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns valid status for current bot', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: '123:abc', bot_id: 'mybot', bot_name: 'My Bot' })

      const result = await statusAction({ _credManager: manager })

      expect(result.valid).toBe(true)
      expect(result.bot_id).toBe('mybot')
    })

    it('returns invalid when getMe fails', async () => {
      mockGetMe.mockImplementationOnce(() => Promise.reject(new Error('401')))

      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: 'bad', bot_id: 'mybot', bot_name: 'My Bot' })

      const result = await statusAction({ _credManager: manager })
      expect(result.valid).toBe(false)
    })
  })

  describe('listAction', () => {
    it('returns empty list when no bots', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await listAction({ _credManager: manager })
      expect(result.bots).toEqual([])
    })

    it('returns all bots with current flag', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: 't1', bot_id: 'a', bot_name: 'A' })
      await manager.setCredentials({ token: 't2', bot_id: 'b', bot_name: 'B' })

      const result = await listAction({ _credManager: manager })
      expect(result.bots).toHaveLength(2)
      expect(result.bots?.find((x) => x.bot_id === 'b')?.is_current).toBe(true)
    })
  })

  describe('useAction', () => {
    it('switches active bot', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: 't1', bot_id: 'a', bot_name: 'A' })
      await manager.setCredentials({ token: 't2', bot_id: 'b', bot_name: 'B' })

      const result = await useAction('a', { _credManager: manager })

      expect(result.success).toBe(true)
      expect(result.bot_id).toBe('a')
    })

    it('returns error for unknown bot', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await useAction('nope', { _credManager: manager })
      expect(result.error).toContain('not found')
    })
  })

  describe('removeAction', () => {
    it('removes a stored bot', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      await manager.setCredentials({ token: 't', bot_id: 'a', bot_name: 'A' })

      const result = await removeAction('a', { _credManager: manager })

      expect(result.success).toBe(true)
      expect(await manager.getCredentials('a')).toBeNull()
    })

    it('returns error for unknown bot', async () => {
      const manager = new TelegramBotCredentialManager(tempDir)
      const result = await removeAction('nope', { _credManager: manager })
      expect(result.error).toContain('not found')
    })
  })
})
