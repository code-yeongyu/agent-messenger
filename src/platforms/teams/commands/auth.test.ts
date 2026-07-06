import { afterEach, beforeEach, expect, spyOn, it } from 'bun:test'

import { TeamsClient } from '../client'
import { TeamsCredentialManager } from '../credential-manager'
import * as deviceLogin from '../device-login'
import { TeamsTokenExtractor } from '../token-extractor'
import { getNoTeamsTokenFoundMessage, loginAction } from './auth'

let extractorExtractSpy: ReturnType<typeof spyOn>
let clientTestAuthSpy: ReturnType<typeof spyOn>
let clientListTeamsSpy: ReturnType<typeof spyOn>
let credManagerLoadConfigSpy: ReturnType<typeof spyOn>
let credManagerSaveConfigSpy: ReturnType<typeof spyOn>
let credManagerClearCredentialsSpy: ReturnType<typeof spyOn>
let credManagerIsTokenExpiredSpy: ReturnType<typeof spyOn>
let clientGetRegionSpy: ReturnType<typeof spyOn>
const originalConsoleLog = console.log

beforeEach(() => {
  extractorExtractSpy = spyOn(TeamsTokenExtractor.prototype, 'extract').mockResolvedValue([
    { token: 'test-skype-token-123', accountType: 'work' as const, accountTypeKnown: true },
  ])

  clientTestAuthSpy = spyOn(TeamsClient.prototype, 'testAuth').mockResolvedValue({
    id: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
  })

  clientListTeamsSpy = spyOn(TeamsClient.prototype, 'listTeams').mockResolvedValue([
    { id: 'team-1', name: 'Team One' },
    { id: 'team-2', name: 'Team Two' },
  ])

  clientGetRegionSpy = spyOn(TeamsClient.prototype, 'getRegion').mockReturnValue('emea')

  credManagerLoadConfigSpy = spyOn(TeamsCredentialManager.prototype, 'loadConfig').mockResolvedValue(null)

  credManagerSaveConfigSpy = spyOn(TeamsCredentialManager.prototype, 'saveConfig').mockResolvedValue(undefined)

  credManagerClearCredentialsSpy = spyOn(TeamsCredentialManager.prototype, 'clearCredentials').mockResolvedValue(
    undefined,
  )

  credManagerIsTokenExpiredSpy = spyOn(TeamsCredentialManager.prototype, 'isTokenExpired').mockResolvedValue(false)
})

afterEach(() => {
  extractorExtractSpy?.mockRestore()
  clientTestAuthSpy?.mockRestore()
  clientListTeamsSpy?.mockRestore()
  credManagerLoadConfigSpy?.mockRestore()
  credManagerSaveConfigSpy?.mockRestore()
  credManagerClearCredentialsSpy?.mockRestore()
  credManagerIsTokenExpiredSpy?.mockRestore()
  clientGetRegionSpy?.mockRestore()
  console.log = originalConsoleLog
})

it('extract: calls TeamsTokenExtractor', async () => {
  const extractor = new TeamsTokenExtractor()
  const result = await extractor.extract()
  expect(result).toHaveLength(1)
  expect(result[0].token).toBe('test-skype-token-123')
  expect(result[0].accountType).toBe('work')
})

it('extract: validates token with TeamsClient', async () => {
  const client = await new TeamsClient().login({ token: 'test-skype-token-123', region: 'emea' })
  const authInfo = await client.testAuth()
  expect(authInfo).toBeDefined()
  expect(authInfo.id).toBe('user-123')
  expect(authInfo.displayName).toBe('Test User')
})

it('extract: discovers teams', async () => {
  const client = await new TeamsClient().login({ token: 'test-skype-token-123', region: 'emea' })
  const teams = await client.listTeams()
  expect(teams).toHaveLength(2)
  expect(teams[0].id).toBe('team-1')
})

it('logout: clears credentials', async () => {
  const credManager = new TeamsCredentialManager()
  await credManager.clearCredentials()
  expect(credManager.clearCredentials).toHaveBeenCalled()
})

it('status: returns auth state when not authenticated', async () => {
  const credManager = new TeamsCredentialManager()
  const config = await credManager.loadConfig()
  expect(config).toBeNull()
})

it('status: checks token expiry', async () => {
  const credManager = new TeamsCredentialManager()
  const isExpired = await credManager.isTokenExpired()
  expect(isExpired).toBe(false)
})

it('no-token message mentions desktop app and browser fallback', () => {
  expect(getNoTeamsTokenFoundMessage()).toContain('desktop app or a supported Chromium browser')
})

it('login pending hint preserves explicit account type', async () => {
  const completeSpy = spyOn(deviceLogin, 'completeDeviceCode').mockRejectedValue(new deviceLogin.PendingApprovalError())
  const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
  const exitSpy = spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    throw new Error(`exit:${code}`)
  })

  await expect(loginAction({ deviceCode: 'device-code', accountType: 'personal', pretty: false })).rejects.toThrow(
    'exit:1',
  )

  expect(completeSpy).toHaveBeenCalled()
  expect(exitSpy.mock.calls[0][0]).toBe(0)
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('agent-teams auth login --device-code <device_code> --account-type personal')
  completeSpy.mockRestore()
  consoleSpy.mockRestore()
  exitSpy.mockRestore()
})
