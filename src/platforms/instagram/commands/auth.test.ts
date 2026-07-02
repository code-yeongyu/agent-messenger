import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'

const originalConsoleLog = console.log
import type { Command } from 'commander'

import { InstagramClient } from '../client'
import { InstagramCredentialManager } from '../credential-manager'

const mockGetAccount = mock(() => Promise.resolve(null))
const mockListAccounts = mock(() => Promise.resolve([]))
const mockSetCurrent = mock(() => Promise.resolve(true))
const mockRemoveAccount = mock(() => Promise.resolve(true))

import { authCommand, sanitizePassword } from './auth'

function resetCommandState(cmd: Command): void {
  for (const sub of cmd.commands) {
    ;(
      sub as unknown as { _optionValues: Record<string, unknown>; _optionValueSources: Record<string, unknown> }
    )._optionValues = {}
    ;(
      sub as unknown as { _optionValues: Record<string, unknown>; _optionValueSources: Record<string, unknown> }
    )._optionValueSources = {}
  }
}

describe('auth commands', () => {
  let consoleLogSpy: ReturnType<typeof mock>
  let processExitSpy: ReturnType<typeof spyOn>
  const managerSpies: ReturnType<typeof spyOn>[] = []

  beforeEach(() => {
    resetCommandState(authCommand)

    mockGetAccount.mockReset()
    mockListAccounts.mockReset()
    mockSetCurrent.mockReset()
    mockRemoveAccount.mockReset()

    managerSpies.push(
      spyOn(InstagramCredentialManager.prototype, 'getAccount').mockImplementation(mockGetAccount),
      spyOn(InstagramCredentialManager.prototype, 'listAccounts').mockImplementation(mockListAccounts),
      spyOn(InstagramCredentialManager.prototype, 'setCurrent').mockImplementation(mockSetCurrent),
      spyOn(InstagramCredentialManager.prototype, 'removeAccount').mockImplementation(mockRemoveAccount),
    )

    consoleLogSpy = mock((..._args: unknown[]) => {})
    console.log = consoleLogSpy
    processExitSpy = spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    console.log = originalConsoleLog
    for (const spy of managerSpies.splice(0)) spy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('status', () => {
    it('outputs error and exits when no account found', async () => {
      mockGetAccount.mockImplementation(() => Promise.resolve(null))

      await expect(authCommand.parseAsync(['status'], { from: 'user' })).rejects.toThrow('process.exit called')

      expect(processExitSpy).toHaveBeenCalledWith(1)
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.error).toContain('No Instagram account configured')
    })

    it('outputs account info when account exists', async () => {
      mockGetAccount.mockImplementation(() =>
        Promise.resolve({
          account_id: 'user_testuser',
          username: 'testuser',
          pk: '12345',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
      )

      await authCommand.parseAsync(['status'], { from: 'user' })

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.account_id).toBe('user_testuser')
      expect(output.username).toBe('testuser')
      expect(output.pk).toBe('12345')
    })

    it('outputs error for specific account not found', async () => {
      mockGetAccount.mockImplementation(() => Promise.resolve(null))

      await expect(
        authCommand.parseAsync(['status', '--account', 'missing_account'], { from: 'user' }),
      ).rejects.toThrow('process.exit called')

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.error).toContain('missing_account')
    })
  })

  describe('list', () => {
    it('outputs empty array when no accounts', async () => {
      mockListAccounts.mockImplementation(() => Promise.resolve([]))

      await authCommand.parseAsync(['list'], { from: 'user' })

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toEqual([])
    })

    it('outputs accounts list', async () => {
      mockListAccounts.mockImplementation(() =>
        Promise.resolve([
          {
            account_id: 'user_alice',
            username: 'alice',
            pk: '111',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            is_current: true,
          },
          {
            account_id: 'user_bob',
            username: 'bob',
            pk: '222',
            created_at: '2024-01-02T00:00:00.000Z',
            updated_at: '2024-01-02T00:00:00.000Z',
            is_current: false,
          },
        ]),
      )

      await authCommand.parseAsync(['list'], { from: 'user' })

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toHaveLength(2)
      expect(output[0].account_id).toBe('user_alice')
      expect(output[0].is_current).toBe(true)
      expect(output[1].account_id).toBe('user_bob')
      expect(output[1].is_current).toBe(false)
    })
  })

  describe('use', () => {
    it('switches to specified account', async () => {
      mockSetCurrent.mockImplementation(() => Promise.resolve(true))
      mockGetAccount.mockImplementation(() =>
        Promise.resolve({
          account_id: 'user_alice',
          username: 'alice',
          pk: '111',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
      )

      await authCommand.parseAsync(['use', 'user_alice'], { from: 'user' })

      expect(mockSetCurrent).toHaveBeenCalledWith('user_alice')
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.success).toBe(true)
      expect(output.account_id).toBe('user_alice')
    })

    it('outputs error when account not found', async () => {
      mockSetCurrent.mockImplementation(() => Promise.resolve(false))

      await expect(authCommand.parseAsync(['use', 'missing_account'], { from: 'user' })).rejects.toThrow(
        'process.exit called',
      )

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.error).toContain('missing_account')
    })
  })

  describe('logout', () => {
    it('removes account and outputs success', async () => {
      mockGetAccount.mockImplementation(() =>
        Promise.resolve({
          account_id: 'user_alice',
          username: 'alice',
          pk: '111',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
      )
      mockRemoveAccount.mockImplementation(() => Promise.resolve(true))

      await authCommand.parseAsync(['logout'], { from: 'user' })

      expect(mockRemoveAccount).toHaveBeenCalledWith('user_alice')
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.success).toBe(true)
      expect(output.logged_out).toBe(true)
      expect(output.account_id).toBe('user_alice')
    })

    it('outputs error when no account configured', async () => {
      mockGetAccount.mockImplementation(() => Promise.resolve(null))

      await expect(authCommand.parseAsync(['logout'], { from: 'user' })).rejects.toThrow('process.exit called')

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.error).toContain('No Instagram account configured')
    })

    it('outputs error for specific account not found', async () => {
      mockGetAccount.mockImplementation(() => Promise.resolve(null))

      await expect(
        authCommand.parseAsync(['logout', '--account', 'missing_account'], { from: 'user' }),
      ).rejects.toThrow('process.exit called')

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.error).toContain('missing_account')
    })
  })

  describe('sanitizePassword', () => {
    it('preserves leading and trailing whitespace', () => {
      expect(sanitizePassword('  pass word  ')).toBe('  pass word  ')
      expect(sanitizePassword('\tpw\t')).toBe('\tpw\t')
    })

    it('preserves internal characters exactly', () => {
      expect(sanitizePassword('p@$$ w0rd!#')).toBe('p@$$ w0rd!#')
    })

    it('strips only a trailing carriage return', () => {
      expect(sanitizePassword('secret\r')).toBe('secret')
      expect(sanitizePassword('sec\rret')).toBe('sec\rret')
    })

    it('returns undefined for empty input', () => {
      expect(sanitizePassword('')).toBeUndefined()
      expect(sanitizePassword('\r')).toBeUndefined()
    })

    it('keeps a whitespace-only password (not treated as empty)', () => {
      expect(sanitizePassword('   ')).toBe('   ')
    })
  })

  describe('login-email', () => {
    it('redeems uid/token non-interactively and saves the account', async () => {
      const oneClickSpy = spyOn(InstagramClient.prototype, 'oneClickLogin').mockResolvedValue({ userId: '4242' })
      const setSessionPathSpy = spyOn(InstagramClient.prototype, 'setSessionPath').mockImplementation(() => {})
      const ensurePathsSpy = spyOn(InstagramCredentialManager.prototype, 'ensureAccountPaths').mockResolvedValue({
        account_dir: '/tmp/x',
        session_path: '/tmp/x/session.json',
      })
      const setAccountSpy = spyOn(InstagramCredentialManager.prototype, 'setAccount').mockResolvedValue(undefined)

      await authCommand.parseAsync(
        ['login-email', '--username', 'alice', '--uid', 'ENCODED_UID', '--token', 'NONCE123', '--pretty'],
        { from: 'user' },
      )

      expect(oneClickSpy).toHaveBeenCalledWith('ENCODED_UID', 'NONCE123')
      expect(setAccountSpy).toHaveBeenCalled()
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.authenticated).toBe(true)
      expect(output.username).toBe('alice')

      for (const spy of [oneClickSpy, setSessionPathSpy, ensurePathsSpy, setAccountSpy]) spy.mockRestore()
    })

    it('parses uid/token from a pasted --link', async () => {
      const oneClickSpy = spyOn(InstagramClient.prototype, 'oneClickLogin').mockResolvedValue({ userId: '7' })
      const setSessionPathSpy = spyOn(InstagramClient.prototype, 'setSessionPath').mockImplementation(() => {})
      const ensurePathsSpy = spyOn(InstagramCredentialManager.prototype, 'ensureAccountPaths').mockResolvedValue({
        account_dir: '/tmp/x',
        session_path: '/tmp/x/session.json',
      })
      const setAccountSpy = spyOn(InstagramCredentialManager.prototype, 'setAccount').mockResolvedValue(undefined)

      await authCommand.parseAsync(
        [
          'login-email',
          '--username',
          'bob',
          '--link',
          'https://www.instagram.com/_n/web_emaillogin?uid=U1&token=T1&auto_send=0',
        ],
        { from: 'user' },
      )

      expect(oneClickSpy).toHaveBeenCalledWith('U1', 'T1')

      for (const spy of [oneClickSpy, setSessionPathSpy, ensurePathsSpy, setAccountSpy]) spy.mockRestore()
    })

    it('errors on an invalid --link instead of sending a new email', async () => {
      const oneClickSpy = spyOn(InstagramClient.prototype, 'oneClickLogin').mockResolvedValue({ userId: '1' })
      const sendEmailSpy = spyOn(InstagramClient.prototype, 'sendRecoveryFlowEmail').mockResolvedValue({
        sent: true,
        contactPoint: '',
      })

      await expect(
        authCommand.parseAsync(['login-email', '--username', 'alice', '--link', 'not-a-link', '--pretty'], {
          from: 'user',
        }),
      ).rejects.toThrow('process.exit called')

      expect(sendEmailSpy).not.toHaveBeenCalled()
      expect(oneClickSpy).not.toHaveBeenCalled()
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.error).toContain('Invalid login link')

      for (const spy of [oneClickSpy, sendEmailSpy]) spy.mockRestore()
    })

    it('errors when only --uid is provided without --token', async () => {
      const sendEmailSpy = spyOn(InstagramClient.prototype, 'sendRecoveryFlowEmail').mockResolvedValue({
        sent: true,
        contactPoint: '',
      })

      await expect(
        authCommand.parseAsync(['login-email', '--username', 'alice', '--uid', 'U1', '--pretty'], { from: 'user' }),
      ).rejects.toThrow('process.exit called')

      expect(sendEmailSpy).not.toHaveBeenCalled()
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.error).toContain('Invalid login link')

      sendEmailSpy.mockRestore()
    })

    it('treats an explicit empty --link as redeem intent and fails closed', async () => {
      const oneClickSpy = spyOn(InstagramClient.prototype, 'oneClickLogin').mockResolvedValue({ userId: '1' })
      const sendEmailSpy = spyOn(InstagramClient.prototype, 'sendRecoveryFlowEmail').mockResolvedValue({
        sent: true,
        contactPoint: '',
      })

      await expect(
        authCommand.parseAsync(['login-email', '--username', 'alice', '--link', '', '--pretty'], { from: 'user' }),
      ).rejects.toThrow('process.exit called')

      expect(sendEmailSpy).not.toHaveBeenCalled()
      expect(oneClickSpy).not.toHaveBeenCalled()
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.error).toContain('Invalid login link')

      for (const spy of [oneClickSpy, sendEmailSpy]) spy.mockRestore()
    })

    it('requires --username when redeeming non-interactively', async () => {
      const oneClickSpy = spyOn(InstagramClient.prototype, 'oneClickLogin').mockResolvedValue({ userId: '1' })

      await expect(
        authCommand.parseAsync(['login-email', '--uid', 'U1', '--token', 'T1', '--pretty'], { from: 'user' }),
      ).rejects.toThrow('process.exit called')

      expect(oneClickSpy).not.toHaveBeenCalled()
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.error).toContain('--username is required')

      oneClickSpy.mockRestore()
    })
  })

  describe('login email fallback', () => {
    it('non-interactively sends the login email when password login offers it', async () => {
      const authSpy = spyOn(InstagramClient.prototype, 'authenticate').mockResolvedValue({
        userId: '',
        oneClickEmailAvailable: true,
      })
      const sendEmailSpy = spyOn(InstagramClient.prototype, 'sendRecoveryFlowEmail').mockResolvedValue({
        sent: true,
        contactPoint: 'j***@example.com',
      })
      const ensurePathsSpy = spyOn(InstagramCredentialManager.prototype, 'ensureAccountPaths').mockResolvedValue({
        account_dir: '/tmp/x',
        session_path: '/tmp/x/session.json',
      })

      await authCommand.parseAsync(['login', '--username', 'alice', '--password', 'wrong', '--pretty'], {
        from: 'user',
      })

      expect(sendEmailSpy).toHaveBeenCalledWith('alice')
      const output = JSON.parse(consoleLogSpy.mock.calls[0]![0] as string)
      expect(output.one_click_email_available).toBe(true)
      expect(output.email_sent).toBe(true)
      expect(output.contact_point).toBe('j***@example.com')

      for (const spy of [authSpy, sendEmailSpy, ensurePathsSpy]) spy.mockRestore()
    })
  })
})
