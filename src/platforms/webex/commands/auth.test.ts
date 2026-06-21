import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'
import * as childProcess from 'node:child_process'
import * as fs from 'node:fs'

import { WebexClient } from '../client'
import { WebexCredentialManager } from '../credential-manager'
import * as passwordLogin from '../password-login'
import { WebexTokenExtractor } from '../token-extractor'
import { WebexError } from '../types'
import { extractAction, loginAction, logoutAction, oauthAction, statusAction } from './auth'

let promptQueue: string[] = []
mock.module('node:readline/promises', () => ({
  createInterface: () => ({
    question: async () => promptQueue.shift() ?? '',
    close: () => {},
  }),
}))

class ProcessExit extends Error {
  constructor(readonly code?: string | number | null) {
    super(`process.exit(${code})`)
  }
}

describe('auth commands', () => {
  let consoleSpy: ReturnType<typeof spyOn>
  let consoleErrorSpy: ReturnType<typeof spyOn>
  let execSpy: ReturnType<typeof spyOn>
  let stderrWriteSpy: ReturnType<typeof spyOn>
  let stdoutWriteSpy: ReturnType<typeof spyOn>
  const protoSpies: ReturnType<typeof spyOn>[] = []
  let originalStdinTTY: boolean | undefined
  let originalStdoutTTY: boolean | undefined
  const mockPerson = {
    id: 'person-1',
    displayName: 'Test User',
    emails: ['test@example.com'],
    orgId: 'org-1',
    type: 'person' as const,
    created: '2024-01-01T00:00:00.000Z',
  }

  function protoSpy<T extends object>(target: T, method: keyof T) {
    const s = spyOn(target, method as any)
    protoSpies.push(s)
    return s
  }

  function setTTY(value: boolean | undefined): void {
    Object.defineProperty(process.stdin, 'isTTY', { value, writable: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value, writable: true, configurable: true })
  }

  beforeEach(() => {
    promptQueue = []
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {})
    execSpy = spyOn(childProcess, 'exec').mockImplementation((() => {}) as any)
    stderrWriteSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutWriteSpy = spyOn(process.stdout, 'write').mockImplementation(() => true)
    originalStdinTTY = process.stdin.isTTY
    originalStdoutTTY = process.stdout.isTTY
    // Default to interactive TTY for existing tests; non-interactive tests override.
    setTTY(true)
    // Fail loudly instead of running the real 300s network polling loop; tests that
    // exercise the Device Grant flow override this with a resolved value.
    protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken').mockImplementation(() => {
      throw new Error('Unexpected real device polling in test')
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    execSpy.mockRestore()
    stderrWriteSpy.mockRestore()
    stdoutWriteSpy.mockRestore()
    for (const s of protoSpies) s.mockRestore()
    protoSpies.length = 0
    setTTY(originalStdinTTY)
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalStdoutTTY,
      writable: true,
      configurable: true,
    })
  })

  describe('loginAction with --token', () => {
    it('authenticates with provided token (bot token flow)', async () => {
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

      await loginAction({ token: 'bot-token-123', pretty: false })

      expect(consoleSpy).toHaveBeenCalled()
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.user.displayName).toBe('Test User')
    })

    it('saves tokenType as manual with expiresAt 0', async () => {
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)
      const saveSpy = protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

      await loginAction({ token: 'bot-token-123', pretty: false })

      const savedConfig = saveSpy.mock.calls[0][0] as { tokenType: string; expiresAt: number; refreshToken: string }
      expect(savedConfig.tokenType).toBe('manual')
      expect(savedConfig.expiresAt).toBe(0)
      expect(savedConfig.refreshToken).toBe('')
    })

    it('still allows --token login when non-interactive (bot/PAT path)', async () => {
      setTTY(false)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

      await loginAction({ token: 'bot-token-123', pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.user.displayName).toBe('Test User')
    })
  })

  describe('loginAction with --email/--password', () => {
    const passwordConfig = {
      accessToken: 'pw-access-token',
      refreshToken: 'pw-refresh-token',
      expiresAt: Date.now() + 3_600_000,
      deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/test-device',
      userId: 'user-1',
    }

    it('logs in with email/password and saves the password token type', async () => {
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      const saveSpy = protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({ email: 'alice@example.com', password: 'hunter2', pretty: false })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', 'hunter2', { idbrokerHost: undefined })
      const savedConfig = saveSpy.mock.calls[0][0] as { tokenType: string; clientId: string }
      expect(savedConfig.tokenType).toBe('password')
      expect(savedConfig.clientId).toBe(passwordLogin.WEB_CLIENT_ID)

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.user.displayName).toBe('Test User')
    })

    it('forwards --idbroker-host to the password login flow', async () => {
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({
        email: 'alice@example.com',
        password: 'hunter2',
        idbrokerHost: 'https://idbroker.example.com',
        pretty: false,
      })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', 'hunter2', {
        idbrokerHost: 'https://idbroker.example.com',
      })
    })

    it('reads the password from stdin with --password-stdin', async () => {
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      protoSpy(fs, 'readFileSync').mockReturnValue('stdin-secret\n')
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({ email: 'alice@example.com', passwordStdin: true, pretty: false })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', 'stdin-secret', { idbrokerHost: undefined })
    })

    it('rejects passing both --password and --password-stdin', async () => {
      const exitSpy = protoSpy(process, 'exit').mockImplementation((code?: string | number | null) => {
        throw new ProcessExit(code)
      })

      await expect(
        loginAction({ email: 'alice@example.com', password: 'p', passwordStdin: true, pretty: false }),
      ).rejects.toThrow(ProcessExit)

      const lastCall = stderrWriteSpy.mock.calls[stderrWriteSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Use only one of --password or --password-stdin')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('loginAction interactive prompts', () => {
    const passwordConfig = {
      accessToken: 'pw-access-token',
      refreshToken: 'pw-refresh-token',
      expiresAt: Date.now() + 3_600_000,
      deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/test-device',
      userId: 'user-1',
    }

    it('prompts for email and password when none are provided', async () => {
      promptQueue = ['alice@example.com', 'prompted-secret']
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({ pretty: false })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', 'prompted-secret', { idbrokerHost: undefined })
    })

    it('prompts only for the password when --email is provided without a password', async () => {
      promptQueue = ['prompted-secret']
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({ email: 'alice@example.com', pretty: false })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', 'prompted-secret', { idbrokerHost: undefined })
    })

    it('preserves whitespace in the prompted password', async () => {
      promptQueue = ['  spaced secret  ']
      const pwSpy = protoSpy(passwordLogin, 'loginWithPassword').mockResolvedValue(passwordConfig)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await loginAction({ email: 'alice@example.com', pretty: false })

      expect(pwSpy).toHaveBeenCalledWith('alice@example.com', '  spaced secret  ', { idbrokerHost: undefined })
    })
  })

  describe('loginAction non-interactive without credentials', () => {
    it('errors when no email is provided and points to auth oauth', async () => {
      setTTY(false)
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await loginAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Email required')
      expect(output.error).toContain('auth oauth')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('errors when --email is provided but no password is available', async () => {
      setTTY(false)
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await loginAction({ email: 'alice@example.com', pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Password required')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('oauthAction with --client-id and --client-secret', () => {
    it('uses provided credentials for Device Grant flow', async () => {
      protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode').mockResolvedValue({
        deviceCode: 'd',
        userCode: 'u',
        verificationUri: 'https://v',
        verificationUriComplete: 'https://vc',
        expiresIn: 300,
        interval: 0.01,
      })
      protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3600000,
      })
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await oauthAction({ clientId: 'my-id', clientSecret: 'my-secret', pretty: false })

      expect(WebexCredentialManager.prototype.requestDeviceCode).toHaveBeenCalledWith('my-id')
      expect(WebexCredentialManager.prototype.pollDeviceToken).toHaveBeenCalledWith(
        'd',
        0.01,
        300,
        'my-id',
        'my-secret',
      )
    })

    it('saves tokenType as oauth in config', async () => {
      protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode').mockResolvedValue({
        deviceCode: 'd',
        userCode: 'u',
        verificationUri: 'https://v',
        verificationUriComplete: 'https://vc',
        expiresIn: 300,
        interval: 0.01,
      })
      protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3600000,
      })
      const saveSpy = protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await oauthAction({ clientId: 'my-id', clientSecret: 'my-secret', pretty: false })

      const savedConfig = saveSpy.mock.calls[0][0] as { tokenType: string }
      expect(savedConfig.tokenType).toBe('oauth')
    })

    it('saves clientId and clientSecret in config', async () => {
      protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode').mockResolvedValue({
        deviceCode: 'd',
        userCode: 'u',
        verificationUri: 'https://v',
        verificationUriComplete: 'https://vc',
        expiresIn: 300,
        interval: 0.01,
      })
      protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3600000,
      })
      const saveSpy = protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await oauthAction({ clientId: 'my-id', clientSecret: 'my-secret', pretty: false })

      const savedConfig = saveSpy.mock.calls[0][0] as { clientId: string; clientSecret: string }
      expect(savedConfig.clientId).toBe('my-id')
      expect(savedConfig.clientSecret).toBe('my-secret')
    })
  })

  describe('oauthAction non-interactive (no TTY)', () => {
    const device = {
      deviceCode: 'webex-device-code-abc123',
      userCode: 'USER-CODE',
      verificationUri: 'https://webex.com/verify',
      verificationUriComplete: 'https://webex.com/verify?user_code=USER-CODE',
      expiresIn: 300,
      interval: 1,
    }

    it('first call (no --device-code): requests device code and returns it in JSON', async () => {
      setTTY(false)
      const requestSpy = protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode').mockResolvedValue(device)
      const exchangeSpy = protoSpy(WebexCredentialManager.prototype, 'exchangeDeviceCode')
      const pollSpy = protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken')
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await oauthAction({ pretty: false })

      expect(requestSpy).toHaveBeenCalled()
      expect(exchangeSpy).not.toHaveBeenCalled()
      expect(pollSpy).not.toHaveBeenCalled()

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.next_action).toBe('authorize_in_browser')
      expect(output.verification_uri).toBe(device.verificationUri)
      expect(output.verification_uri_complete).toBe(device.verificationUriComplete)
      expect(output.user_code).toBe(device.userCode)
      expect(output.device_code).toBe(device.deviceCode)
      expect(output.message).toContain('auth oauth --device-code')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('does not open a browser on the first non-interactive call', async () => {
      setTTY(false)
      protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode').mockResolvedValue(device)
      protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await oauthAction({ pretty: false })

      expect(execSpy).not.toHaveBeenCalled()
    })

    it('second call (--device-code, pending): returns still_pending and echoes back the device_code', async () => {
      setTTY(false)
      protoSpy(WebexCredentialManager.prototype, 'exchangeDeviceCode').mockResolvedValue({ status: 'pending' })
      const requestSpy = protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode')
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await oauthAction({ deviceCode: 'webex-device-code-abc123', pretty: false })

      expect(requestSpy).not.toHaveBeenCalled()

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.next_action).toBe('still_pending')
      expect(output.device_code).toBe('webex-device-code-abc123')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('second call (--device-code, success): saves token and returns authenticated=true', async () => {
      setTTY(false)
      const exchangeSpy = protoSpy(WebexCredentialManager.prototype, 'exchangeDeviceCode').mockResolvedValue({
        status: 'success',
        config: { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3_600_000 },
      })
      const saveConfigSpy = protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await oauthAction({
        deviceCode: 'webex-device-code-abc123',
        clientId: 'my-id',
        clientSecret: 'my-secret',
        pretty: false,
      })

      expect(exchangeSpy).toHaveBeenCalledWith('webex-device-code-abc123', 'my-id', 'my-secret')
      const savedConfig = saveConfigSpy.mock.calls[0][0] as { tokenType: string; clientId: string }
      expect(savedConfig.tokenType).toBe('oauth')
      expect(savedConfig.clientId).toBe('my-id')

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.user.displayName).toBe('Test User')
    })

    it('second call (--device-code, expired): returns next_action=restart, exits 1', async () => {
      setTTY(false)
      protoSpy(WebexCredentialManager.prototype, 'exchangeDeviceCode').mockResolvedValue({ status: 'expired' })
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await oauthAction({ deviceCode: 'webex-device-code-abc123', pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.next_action).toBe('restart')
      expect(output.error).toContain('expired')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('--device-code works even with a TTY (interactive sessions can also resume)', async () => {
      setTTY(true)
      const exchangeSpy = protoSpy(WebexCredentialManager.prototype, 'exchangeDeviceCode').mockResolvedValue({
        status: 'success',
        config: { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3_600_000 },
      })
      const requestSpy = protoSpy(WebexCredentialManager.prototype, 'requestDeviceCode')
      const pollSpy = protoSpy(WebexCredentialManager.prototype, 'pollDeviceToken')
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await oauthAction({ deviceCode: 'webex-device-code-abc123', pretty: false })

      expect(exchangeSpy).toHaveBeenCalled()
      expect(requestSpy).not.toHaveBeenCalled()
      expect(pollSpy).not.toHaveBeenCalled()
    })
  })

  describe('statusAction', () => {
    it('shows authenticated status when token is valid', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue(null)
      protoSpy(WebexCredentialManager.prototype, 'getToken').mockResolvedValue('valid-token')
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await statusAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.user.displayName).toBe('Test User')
    })

    it('shows not authenticated when no token', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue(null)
      protoSpy(WebexCredentialManager.prototype, 'getToken').mockResolvedValue(null)
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await statusAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Not authenticated')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('shows not authenticated when token validation fails', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue(null)
      protoSpy(WebexCredentialManager.prototype, 'getToken').mockResolvedValue('invalid-token')
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockRejectedValue(new Error('401 Unauthorized'))

      await statusAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(false)
    })

    it('loads config for stored client credentials', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3600000,
        clientId: 'stored-id',
        clientSecret: 'stored-secret',
      })
      protoSpy(WebexCredentialManager.prototype, 'getToken').mockResolvedValue('valid-token')
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)

      await statusAction({ pretty: false })

      expect(WebexCredentialManager.prototype.getToken).toHaveBeenCalledWith('stored-id', 'stored-secret')
    })
  })

  describe('extractAction', () => {
    it('passes deviceUrl and tokenType to client.login', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue({
        accessToken: 'extracted-token-at-least-twenty-chars',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/test-device-id',
        userId: 'user-1',
      })
      const loginSpy = protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

      await extractAction({ pretty: false })

      expect(loginSpy).toHaveBeenCalledWith({
        token: 'extracted-token-at-least-twenty-chars',
        deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/test-device-id',
        tokenType: 'extracted',
      })
    })

    it('attempts refresh when token is expired', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue({
        accessToken: 'expired-token-at-least-twenty-chars-',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() - 7200000,
      })
      const refreshSpy = protoSpy(WebexCredentialManager.prototype, 'refreshToken').mockResolvedValue({
        accessToken: 'refreshed-token-at-least-twenty-ch',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600000,
      })
      const loginSpy = protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockResolvedValue(mockPerson)
      protoSpy(WebexCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

      await extractAction({ pretty: false })

      expect(refreshSpy).toHaveBeenCalled()
      expect(loginSpy).toHaveBeenCalledWith(expect.objectContaining({ token: 'refreshed-token-at-least-twenty-ch' }))
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.authenticated).toBe(true)
      expect(output.refreshed).toBe(true)
    })

    it('reports expired token with actionable hint when refresh fails', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue({
        accessToken: 'expired-token-at-least-twenty-chars-',
        refreshToken: 'bad-refresh-token',
        expiresAt: Date.now() - 7200000,
      })
      protoSpy(WebexCredentialManager.prototype, 'refreshToken').mockResolvedValue(null)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockRejectedValue(new WebexError('Unauthorized', 'http_401'))
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await extractAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('expired')
      expect(output.hint).toContain('web.webex.com')
      expect(output.hint).toContain('not webex.com')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('rethrows non-auth errors even when token is expired', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue({
        accessToken: 'expired-token-at-least-twenty-chars-',
        refreshToken: 'bad-refresh-token',
        expiresAt: Date.now() - 7200000,
      })
      protoSpy(WebexCredentialManager.prototype, 'refreshToken').mockResolvedValue(null)
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockRejectedValue(new Error('Network error'))
      const exitSpy = protoSpy(process, 'exit').mockImplementation((code?: string | number | null) => {
        throw new ProcessExit(code)
      })

      await expect(extractAction({ pretty: false })).rejects.toThrow(ProcessExit)

      const lastCall = stderrWriteSpy.mock.calls[stderrWriteSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Network error')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('rethrows non-expiry auth errors', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue({
        accessToken: 'valid-token-at-least-twenty-chars-xx',
        expiresAt: Date.now() + 3600000,
      })
      protoSpy(WebexClient.prototype, 'login').mockResolvedValue(new WebexClient())
      protoSpy(WebexClient.prototype, 'testAuth').mockRejectedValue(new Error('Network error'))
      const exitSpy = protoSpy(process, 'exit').mockImplementation((code?: string | number | null) => {
        throw new ProcessExit(code)
      })

      await expect(extractAction({ pretty: false })).rejects.toThrow(ProcessExit)

      const lastCall = stderrWriteSpy.mock.calls[stderrWriteSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Network error')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('outputs no token found when extract returns null', async () => {
      protoSpy(WebexTokenExtractor.prototype, 'extract').mockResolvedValue(null)
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await extractAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('No Webex token found')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('logoutAction', () => {
    it('clears credentials when authenticated', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      })
      const clearSpy = protoSpy(WebexCredentialManager.prototype, 'clearCredentials').mockResolvedValue(undefined)

      await logoutAction({ pretty: false })

      expect(clearSpy).toHaveBeenCalled()
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.success).toBe(true)
    })

    it('shows error when not authenticated', async () => {
      protoSpy(WebexCredentialManager.prototype, 'loadConfig').mockResolvedValue(null)
      const exitSpy = protoSpy(process, 'exit').mockImplementation(() => undefined as never)

      await logoutAction({ pretty: false })

      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string
      const output = JSON.parse(lastCall)
      expect(output.error).toContain('Not authenticated')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
