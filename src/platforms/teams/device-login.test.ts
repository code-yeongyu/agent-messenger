import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { TeamsCredentialManager } from './credential-manager'
import { refreshDeviceCodeAccount } from './device-login'

const testDirs: string[] = []
const originalFetch = globalThis.fetch

function setup(): TeamsCredentialManager {
  const dir = join(import.meta.dir, `.test-teams-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  testDirs.push(dir)
  return new TeamsCredentialManager(dir)
}

function mockExchangeAndMint(skypeToken: string, rotatedRefresh: string): void {
  globalThis.fetch = mock((input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('/oauth2/v2.0/token')) {
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
