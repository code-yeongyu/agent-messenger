import { afterAll, afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { TeamsClient } from './client'
import { TeamsCredentialManager } from './credential-manager'
import * as deviceCode from './device-code'
import type { DeviceCodeInfo } from './device-code'
import { loginWithDeviceCode, refreshDeviceCodeAccount } from './device-login'

const CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'
const MICROSOFT_SERVICES_TENANT_ID = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a'
const REAL_TENANT_ID = 'c0ffee00-1111-2222-3333-444455556666'

function fakeJwt(claims: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
}

function fakeDeviceCodeInfo(): DeviceCodeInfo {
  return {
    deviceCode: 'device-code',
    userCode: 'USER-CODE',
    verificationUri: 'https://microsoft.com/devicelogin',
    verificationUriComplete: 'https://microsoft.com/devicelogin?otc=USER-CODE',
    expiresIn: 900,
    interval: 1,
  }
}

const testDirs: string[] = []
const originalFetch = globalThis.fetch

function setup(): TeamsCredentialManager {
  const dir = join(import.meta.dir, `.test-teams-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  testDirs.push(dir)
  return new TeamsCredentialManager(dir)
}

function mockExchangeAndMint(skypeToken: string, rotatedRefresh: string): { tokenUrls: string[] } {
  const tokenUrls: string[] = []
  globalThis.fetch = mock((input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('/oauth2/v2.0/token')) {
      tokenUrls.push(url)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'spaces-at', refresh_token: rotatedRefresh }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ skypeToken: { skypetoken: skypeToken, skypeTokenExpiresIn: 3600 } }),
    } as Response)
  }) as typeof fetch
  return { tokenUrls }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

afterAll(() => {
  for (const dir of testDirs) rmSync(dir, { recursive: true, force: true })
})

describe('refreshDeviceCodeAccount', () => {
  it('re-mints the skype token, rotates the refresh token, and keeps the account current', async () => {
    const manager = setup()
    await manager.setDeviceCodeAccount({
      accountType: 'personal',
      token: 'old-skype',
      tokenExpiresAt: '2000-01-01T00:00:00Z',
      aadRefreshToken: 'old-refresh',
      aadClientId: 'client',
      teams: {},
      currentTeam: null,
    })

    mockExchangeAndMint('new-skype', 'new-refresh')
    const ok = await refreshDeviceCodeAccount('personal', manager)

    expect(ok).toBe(true)
    const config = await manager.loadConfig()
    expect(config?.accounts.personal?.token).toBe('new-skype')
    expect(config?.accounts.personal?.aad_refresh_token).toBe('new-refresh')
    expect(new Date(config!.accounts.personal!.token_expires_at!).getTime()).toBeGreaterThan(Date.now())
    expect(config?.current_account).toBe('personal')
  })

  it('refreshes work device-code accounts and persists the rotated refresh token', async () => {
    const manager = setup()
    await manager.setDeviceCodeAccount({
      accountType: 'work',
      token: 'old-skype',
      tokenExpiresAt: '2000-01-01T00:00:00Z',
      aadRefreshToken: 'old-refresh',
      aadClientId: 'client',
      teams: {},
      currentTeam: null,
    })

    mockExchangeAndMint('new-skype', 'new-work-refresh')
    const ok = await refreshDeviceCodeAccount('work', manager)

    expect(ok).toBe(true)
    const config = await manager.loadConfig()
    expect(config?.accounts.work?.token).toBe('new-skype')
    expect(config?.accounts.work?.aad_refresh_token).toBe('new-work-refresh')
    expect(config?.accounts.work?.auth_method).toBe('device-code')
  })

  it('refreshes a work account against its stored tenant authority', async () => {
    const manager = setup()
    const tenantId = 'c0ffee00-1111-2222-3333-444455556666'
    await manager.setDeviceCodeAccount({
      accountType: 'work',
      token: 'old-skype',
      tokenExpiresAt: '2000-01-01T00:00:00Z',
      aadRefreshToken: 'old-refresh',
      aadClientId: 'client',
      aadTenantId: tenantId,
      teams: {},
      currentTeam: null,
    })

    const { tokenUrls } = mockExchangeAndMint('new-skype', 'new-work-refresh')
    const ok = await refreshDeviceCodeAccount('work', manager)

    expect(ok).toBe(true)
    expect(tokenUrls.some((url) => url.includes(`/${tenantId}/oauth2/v2.0/token`))).toBe(true)
    const config = await manager.loadConfig()
    expect(config?.accounts.work?.aad_tenant_id).toBe(tenantId)
  })

  it('does not change current_account when refreshing a non-current account', async () => {
    const manager = setup()
    await manager.setDeviceCodeAccount({
      accountType: 'personal',
      token: 'p',
      tokenExpiresAt: '2000-01-01T00:00:00Z',
      aadRefreshToken: 'r',
      aadClientId: 'c',
      teams: {},
      currentTeam: null,
    })
    await manager.setToken('work-token', 'work', '2100-01-01T00:00:00Z')
    await manager.setCurrentAccount('work')

    mockExchangeAndMint('new-skype', 'new-refresh')
    await refreshDeviceCodeAccount('personal', manager)

    const config = await manager.loadConfig()
    expect(config?.current_account).toBe('work')
    expect(config?.accounts.personal?.token).toBe('new-skype')
  })

  it('returns false for a non-device-code account', async () => {
    const manager = setup()
    await manager.setToken('extracted-token', 'personal', '2100-01-01T00:00:00Z')

    const ok = await refreshDeviceCodeAccount('personal', manager)
    expect(ok).toBe(false)
  })

  it('returns false and leaves the token intact when the exchange fails', async () => {
    const manager = setup()
    await manager.setDeviceCodeAccount({
      accountType: 'personal',
      token: 'old-skype',
      tokenExpiresAt: '2000-01-01T00:00:00Z',
      aadRefreshToken: 'old-refresh',
      aadClientId: 'client',
      teams: {},
      currentTeam: null,
    })

    globalThis.fetch = mock(() =>
      Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: 'invalid_grant' }) } as Response),
    ) as typeof fetch

    const ok = await refreshDeviceCodeAccount('personal', manager)
    expect(ok).toBe(false)
    const config = await manager.loadConfig()
    expect(config?.accounts.personal?.token).toBe('old-skype')
  })
})

describe('loginWithDeviceCode personal-account detection', () => {
  const spies: Array<ReturnType<typeof spyOn>> = []

  function spy<T extends object, K extends keyof T>(obj: T, key: K): ReturnType<typeof spyOn> {
    const s = spyOn(obj, key as never)
    spies.push(s)
    return s
  }

  afterEach(() => {
    for (const s of spies.splice(0)) s.mockRestore()
  })

  function stubFinalizeChain(): void {
    spy(deviceCode, 'exchangeForSkypeScope').mockResolvedValue({ accessToken: 'spaces-at', refreshToken: 'rt' })
    spy(deviceCode, 'mintSkypeToken').mockResolvedValue({
      skypeToken: 'skype',
      skypeTokenExpiresAt: '2100-01-01T00:00:00Z',
    })
    spy(TeamsClient.prototype, 'login').mockResolvedValue(new TeamsClient())
    spy(TeamsClient.prototype, 'testAuth').mockResolvedValue({
      id: 'u',
      displayName: 'Work User',
      email: 'w@example.com',
    })
    spy(TeamsClient.prototype, 'listTeams').mockResolvedValue([])
    spy(TeamsClient.prototype, 'getRegion').mockReturnValue('emea')
    spy(TeamsCredentialManager.prototype, 'setDeviceCodeAccount').mockResolvedValue(undefined)
  }

  it('stops with an actionable hint when a work login resolves to a consumer account', async () => {
    const requestSpy = spy(deviceCode, 'requestDeviceCode').mockResolvedValue(fakeDeviceCodeInfo())
    spy(deviceCode, 'pollDeviceToken').mockResolvedValue({
      accessToken: fakeJwt({ tid: CONSUMER_TENANT_ID }),
      refreshToken: 'work-rt',
    })
    const tenantSpy = spy(deviceCode, 'resolveWorkTenantId')
    const exchangeSpy = spy(deviceCode, 'exchangeForSkypeScope')

    // given: a work login whose token carries a consumer tenant
    // then: it throws --account-type personal guidance without minting a token
    await expect(loginWithDeviceCode({ accountType: 'work', onCode: () => {} })).rejects.toThrow(
      /--account-type personal/,
    )
    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(tenantSpy).not.toHaveBeenCalled()
    expect(exchangeSpy).not.toHaveBeenCalled()
  })

  it('finishes a work login normally when it resolves to a real organizational tenant', async () => {
    const requestSpy = spy(deviceCode, 'requestDeviceCode').mockResolvedValue(fakeDeviceCodeInfo())
    spy(deviceCode, 'pollDeviceToken').mockResolvedValue({
      accessToken: fakeJwt({ tid: REAL_TENANT_ID }),
      refreshToken: 'work-rt',
    })
    const tenantSpy = spy(deviceCode, 'resolveWorkTenantId').mockResolvedValue(REAL_TENANT_ID)
    stubFinalizeChain()

    const result = await loginWithDeviceCode({ accountType: 'work', onCode: () => {} })

    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(tenantSpy).toHaveBeenCalledTimes(1)
    expect(result.accountType).toBe('work')
  })

  it('runs tenant discovery for a work login carrying the Microsoft Services placeholder', async () => {
    // given: a work token whose tid is the MSA-passthrough placeholder, which
    // legitimate work accounts also carry and which discovery can still resolve
    spy(deviceCode, 'requestDeviceCode').mockResolvedValue(fakeDeviceCodeInfo())
    spy(deviceCode, 'pollDeviceToken').mockResolvedValue({
      accessToken: fakeJwt({ tid: MICROSOFT_SERVICES_TENANT_ID }),
      refreshToken: 'work-rt',
    })
    const tenantSpy = spy(deviceCode, 'resolveWorkTenantId').mockResolvedValue(REAL_TENANT_ID)
    stubFinalizeChain()

    // then: it is not rejected early — discovery runs and the login completes
    const result = await loginWithDeviceCode({ accountType: 'work', onCode: () => {} })

    expect(tenantSpy).toHaveBeenCalledTimes(1)
    expect(result.accountType).toBe('work')
  })

  it('finishes a personal login without tenant discovery', async () => {
    const requestSpy = spy(deviceCode, 'requestDeviceCode').mockResolvedValue(fakeDeviceCodeInfo())
    spy(deviceCode, 'pollDeviceToken').mockResolvedValue({
      accessToken: fakeJwt({ tid: CONSUMER_TENANT_ID }),
      refreshToken: 'personal-rt',
    })
    const tenantSpy = spy(deviceCode, 'resolveWorkTenantId')
    stubFinalizeChain()

    const result = await loginWithDeviceCode({ accountType: 'personal', onCode: () => {} })

    expect(requestSpy.mock.calls[0][1]).toBe('personal')
    expect(tenantSpy).not.toHaveBeenCalled()
    expect(result.accountType).toBe('personal')
  })
})
