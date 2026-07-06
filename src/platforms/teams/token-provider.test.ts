import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { TeamsCredentialManager } from './credential-manager'
import { TeamsTokenProvider } from './token-provider'
import { TeamsAuthCapabilityError } from './types'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const CLIENT_ID = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
const SUBSTRATE_AUD = 'https://substrate.office.com'
const GRAPH_AUD = 'https://graph.microsoft.com'
const originalFetch = globalThis.fetch
const testDirs: string[] = []

interface FetchCall {
  url: string
  init: RequestInit
  body: URLSearchParams
}

interface TokenResponseConfig {
  aud: string
  refreshToken: string
  expiresIn?: number
  marker?: string
}

function setup(): TeamsCredentialManager {
  const dir = join(import.meta.dir, `.test-teams-provider-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  testDirs.push(dir)
  return new TeamsCredentialManager(dir)
}

async function seedDeviceAccount(manager: TeamsCredentialManager, refreshToken = 'old-refresh'): Promise<void> {
  await manager.setDeviceCodeAccount({
    accountType: 'work',
    token: 'skype-token',
    tokenExpiresAt: '2100-01-01T00:00:00Z',
    aadRefreshToken: refreshToken,
    aadClientId: CLIENT_ID,
    teams: {},
    currentTeam: null,
  })
}

async function seedPersonalDeviceAccount(
  manager: TeamsCredentialManager,
  refreshToken = 'personal-refresh',
): Promise<void> {
  await manager.setDeviceCodeAccount({
    accountType: 'personal',
    token: 'personal-skype-token',
    tokenExpiresAt: '2100-01-01T00:00:00Z',
    aadRefreshToken: refreshToken,
    aadClientId: CLIENT_ID,
    teams: {},
    currentTeam: null,
  })
}

function createJwt(aud: string, marker = 'token'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ aud, tid: TENANT_ID, oid: USER_ID, exp: Math.floor(Date.now() / 1000) + 3600, jti: marker }),
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

function bodyParams(body: BodyInit | null | undefined): URLSearchParams {
  if (body instanceof URLSearchParams) return body
  if (typeof body === 'string') return new URLSearchParams(body)
  return new URLSearchParams()
}

function headerValue(init: RequestInit, name: string): string | undefined {
  const headers = init.headers
  if (headers instanceof Headers) return headers.get(name) ?? undefined
  if (Array.isArray(headers)) {
    const pair = headers.find(([key]) => key.toLowerCase() === name.toLowerCase())
    return pair?.[1]
  }
  return headers?.[name]
}

function mockTokenResponses(responses: TokenResponseConfig[]): { calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const queue = [...responses]
  globalThis.fetch = mock((input: string | URL | Request, init?: RequestInit) => {
    const requestInit = init ?? {}
    calls.push({ url: String(input), init: requestInit, body: bodyParams(requestInit.body) })
    const next = queue.shift()
    if (!next) {
      return Promise.resolve(new Response(JSON.stringify({ error: 'no_mock_response' }), { status: 500 }))
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          access_token: createJwt(next.aud, next.marker),
          refresh_token: next.refreshToken,
          expires_in: next.expiresIn ?? 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
  }) as typeof fetch
  return { calls }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

afterAll(() => {
  for (const dir of testDirs) rmSync(dir, { recursive: true, force: true })
})

describe('TeamsTokenProvider', () => {
  it('refresh-exchanges substrate tokens with Origin and persists rotated refresh tokens', async () => {
    const manager = setup()
    await seedDeviceAccount(manager)
    const { calls } = mockTokenResponses([{ aud: SUBSTRATE_AUD, refreshToken: 'rotated-refresh' }])

    const provider = new TeamsTokenProvider(manager)
    const token = await provider.getSubstrateToken()

    expect(token).toContain('.signature')
    expect(calls[0].url).toContain('/organizations/oauth2/v2.0/token')
    expect(calls[0].body.get('grant_type')).toBe('refresh_token')
    expect(calls[0].body.get('client_id')).toBe(CLIENT_ID)
    expect(calls[0].body.get('refresh_token')).toBe('old-refresh')
    expect(calls[0].body.get('scope')).toBe('https://substrate.office.com/.default offline_access')
    expect(headerValue(calls[0].init, 'Origin')).toBe('https://teams.microsoft.com')

    const config = await manager.loadConfig()
    expect(config?.accounts.work?.aad_refresh_token).toBe('rotated-refresh')
  })

  it('throws when the acquired token audience does not match the requested audience', async () => {
    const manager = setup()
    await seedDeviceAccount(manager)
    mockTokenResponses([{ aud: GRAPH_AUD, refreshToken: 'rotated-refresh' }])

    const provider = new TeamsTokenProvider(manager)
    await expect(provider.getSubstrateToken()).rejects.toThrow(/audience/i)
  })

  it('throws TeamsAuthCapabilityError for cookie-only credentials', async () => {
    const manager = setup()
    await manager.setToken('skype-token', 'work', '2100-01-01T00:00:00Z')

    const provider = new TeamsTokenProvider(manager)
    await expect(provider.getSubstrateToken()).rejects.toThrow(TeamsAuthCapabilityError)
    await expect(provider.getSubstrateToken()).rejects.toThrow(/auth login/)
  })

  it('uses the in-memory cache until the five-minute refresh buffer', async () => {
    const manager = setup()
    await seedDeviceAccount(manager)
    const { calls } = mockTokenResponses([{ aud: SUBSTRATE_AUD, refreshToken: 'rotated-refresh', marker: 'cached' }])

    const provider = new TeamsTokenProvider(manager)
    const first = await provider.getSubstrateToken()
    const second = await provider.getSubstrateToken()

    expect(second).toBe(first)
    expect(calls).toHaveLength(1)
  })

  it('refreshes cached tokens inside the five-minute buffer', async () => {
    const manager = setup()
    await seedDeviceAccount(manager)
    const { calls } = mockTokenResponses([
      { aud: SUBSTRATE_AUD, refreshToken: 'near-expiry-refresh', expiresIn: 299, marker: 'near-expiry' },
      { aud: SUBSTRATE_AUD, refreshToken: 'fresh-refresh', expiresIn: 3600, marker: 'fresh' },
    ])

    const provider = new TeamsTokenProvider(manager)
    const first = await provider.getSubstrateToken()
    const second = await provider.getSubstrateToken()

    expect(second).not.toBe(first)
    expect(calls).toHaveLength(2)
    const config = await manager.loadConfig()
    expect(config?.accounts.work?.aad_refresh_token).toBe('fresh-refresh')
  })

  it('does not reuse bearer tokens across bound accounts', async () => {
    const manager = setup()
    await seedDeviceAccount(manager, 'work-refresh')
    await seedPersonalDeviceAccount(manager, 'personal-refresh')
    const { calls } = mockTokenResponses([
      { aud: SUBSTRATE_AUD, refreshToken: 'work-rotated-refresh', marker: 'work-token' },
      { aud: SUBSTRATE_AUD, refreshToken: 'personal-rotated-refresh', marker: 'personal-token' },
    ])

    const provider = new TeamsTokenProvider(manager)
    const workToken = await provider.bindAccount('work').getSubstrateToken()
    const personalToken = await provider.bindAccount('personal').getSubstrateToken()

    expect(personalToken).not.toBe(workToken)
    expect(calls).toHaveLength(2)
    expect(calls[0].body.get('refresh_token')).toBe('work-refresh')
    expect(calls[1].body.get('refresh_token')).toBe('personal-refresh')
  })

  it('restores tenant/user identity on a cached bearer hit after switching accounts back', async () => {
    const manager = setup()
    await seedDeviceAccount(manager, 'work-refresh')
    await seedPersonalDeviceAccount(manager, 'personal-refresh')
    mockTokenResponses([
      { aud: SUBSTRATE_AUD, refreshToken: 'work-rotated', marker: 'work-token' },
      { aud: SUBSTRATE_AUD, refreshToken: 'personal-rotated', marker: 'personal-token' },
    ])

    const provider = new TeamsTokenProvider(manager)
    // work mints + caches (identity set), personal switch resets identity,
    // then work again is served from cache and must re-restore identity
    await provider.bindAccount('work').getSubstrateToken()
    await provider.bindAccount('personal').getSubstrateToken()
    await provider.bindAccount('work').getSubstrateToken()

    expect(await provider.getTenantId()).toBe(TENANT_ID)
    expect(await provider.getUserId()).toBe(USER_ID)
  })
})
