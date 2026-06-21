import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { WebexPerson } from '../../webex/types'

const mockTestAuth = mock(() =>
  Promise.resolve({
    id: 'bot123',
    emails: ['bot@example.com'],
    displayName: 'Test Bot',
    orgId: 'org123',
    type: 'bot' as const,
    created: '2024-01-01T00:00:00Z',
  }),
)

mock.module('../client', () => ({
  WebexBotClient: class MockWebexBotClient {
    async login(_credentials?: { token: string }): Promise<this> {
      return this
    }
    testAuth = mockTestAuth
  },
}))

import { WebexBotCredentialManager } from '../credential-manager'
import { clearAction, listAction, removeAction, setAction, statusAction, useAction } from './auth'

describe('webexbot auth commands', () => {
  let tempDir: string
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    tempDir = join(tmpdir(), `webexbot-auth-test-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    originalEnv = { ...process.env }
    delete process.env.E2E_WEBEXBOT_TOKEN
    mockTestAuth.mockClear()
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
    process.env = originalEnv
  })

  it('validates and stores bot token with default bot_id from auth', async () => {
    const manager = new WebexBotCredentialManager(tempDir)

    const result = await setAction('token123', { _credManager: manager })

    expect(result.success).toBe(true)
    expect(result.bot_id).toBe('bot123')
    expect(result.bot_name).toBe('Test Bot')

    const creds = await manager.getCredentials()
    expect(creds?.token).toBe('token123')
    expect(creds?.bot_id).toBe('bot123')
  })

  it('uses --bot flag as bot_id', async () => {
    const manager = new WebexBotCredentialManager(tempDir)

    const result = await setAction('token123', { bot: 'mybot', _credManager: manager })

    expect(result.bot_id).toBe('mybot')
    const creds = await manager.getCredentials('mybot')
    expect(creds?.token).toBe('token123')
  })

  it('rejects user tokens', async () => {
    mockTestAuth.mockImplementationOnce(() =>
      Promise.resolve({
        id: 'user123',
        emails: ['user@example.com'],
        displayName: 'Test User',
        orgId: 'org123',
        type: 'person',
        created: '2024-01-01T00:00:00Z',
      } satisfies WebexPerson),
    )

    const manager = new WebexBotCredentialManager(tempDir)

    const result = await setAction('token123', { _credManager: manager })

    expect(result.error).toBeDefined()
    expect(result.error).toContain('not a bot token')
  })

  it('handles client errors', async () => {
    mockTestAuth.mockImplementationOnce(() => Promise.reject(new Error('Invalid token')))

    const manager = new WebexBotCredentialManager(tempDir)

    const result = await setAction('invalid', { _credManager: manager })

    expect(result.error).toBeDefined()
    expect(result.error).toContain('Invalid token')
  })

  it('clearAction removes all stored credentials', async () => {
    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token123', bot_id: 'mybot', bot_name: 'My Bot' })

    const result = await clearAction({ _credManager: manager })

    expect(result.success).toBe(true)
    expect(await manager.getCredentials()).toBeNull()
  })

  it('statusAction returns no credentials when none set', async () => {
    const manager = new WebexBotCredentialManager(tempDir)

    const result = await statusAction({ _credManager: manager })

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('statusAction returns valid status for current bot', async () => {
    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token123', bot_id: 'mybot', bot_name: 'My Bot' })

    const result = await statusAction({ _credManager: manager })

    expect(result.valid).toBe(true)
    expect(result.bot_id).toBe('bot123')
    expect(result.bot_name).toBe('Test Bot')
  })

  it('statusAction returns invalid when token test fails', async () => {
    mockTestAuth.mockImplementationOnce(() => Promise.reject(new Error('Unauthorized')))

    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'invalid-token', bot_id: 'mybot', bot_name: 'My Bot' })

    const result = await statusAction({ _credManager: manager })

    expect(result.valid).toBe(false)
  })

  it('listAction returns all stored bots', async () => {
    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token1', bot_id: 'bot1', bot_name: 'Bot 1' })
    await manager.setCredentials({ token: 'token2', bot_id: 'bot2', bot_name: 'Bot 2' })

    const result = await listAction({ _credManager: manager })

    expect(result.bots).toHaveLength(2)
    expect(result.bots?.find((b) => b.bot_id === 'bot2')?.is_current).toBe(true)
  })

  it('useAction switches current bot', async () => {
    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token1', bot_id: 'bot1', bot_name: 'Bot 1' })
    await manager.setCredentials({ token: 'token2', bot_id: 'bot2', bot_name: 'Bot 2' })

    const result = await useAction('bot1', { _credManager: manager })

    expect(result.success).toBe(true)
    expect(result.bot_id).toBe('bot1')
  })

  it('useAction returns error for unknown bot', async () => {
    const manager = new WebexBotCredentialManager(tempDir)

    const result = await useAction('nonexistent', { _credManager: manager })
    expect(result.error).toBeDefined()
  })

  it('removeAction removes a stored bot', async () => {
    const manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token1', bot_id: 'bot1', bot_name: 'Bot 1' })

    const result = await removeAction('bot1', { _credManager: manager })

    expect(result.success).toBe(true)
    expect(await manager.getCredentials('bot1')).toBeNull()
  })
})
