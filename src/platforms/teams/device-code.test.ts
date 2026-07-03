import { afterEach, describe, expect, it, mock } from 'bun:test'

import {
  exchangeDeviceCode,
  exchangeForSkypeScope,
  mintConsumerSkypeToken,
  pollDeviceToken,
  requestDeviceCode,
} from './device-code'

const CLIENT_ID = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
const originalFetch = globalThis.fetch

interface FakeResponse {
  status?: number
  json: unknown
}

function mockFetch(responder: (url: string, init: RequestInit) => FakeResponse): {
  calls: Array<{ url: string; body: URLSearchParams }>
} {
  const calls: Array<{ url: string; body: URLSearchParams }> = []
  globalThis.fetch = mock((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const raw = (init?.body as string) ?? ''
    calls.push({ url, body: new URLSearchParams(raw) })
    const { status = 200, json } = responder(url, init ?? {})
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(json),
    } as Response)
  }) as typeof fetch
  return { calls }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('requestDeviceCode', () => {
  it('posts to consumer devicecode endpoint with teams scope and composes verificationUriComplete', async () => {
    const { calls } = mockFetch(() => ({
      json: {
        device_code: 'DC',
        user_code: 'ABCD-1234',
        verification_uri: 'https://microsoft.com/devicelogin',
        expires_in: 900,
        interval: 5,
      },
    }))

    const info = await requestDeviceCode(CLIENT_ID)

    expect(calls[0].url).toContain('/9188040d-6c67-4c5b-b112-36a304b66dad/oauth2/v2.0/devicecode')
    expect(calls[0].body.get('client_id')).toBe(CLIENT_ID)
    expect(calls[0].body.get('scope')).toContain('api.fl.teams.microsoft.com')
    expect(info.verificationUriComplete).toBe('https://microsoft.com/devicelogin?otc=ABCD-1234')
    expect(info.interval).toBe(5)
  })

  it('throws on non-200', async () => {
    mockFetch(() => ({ status: 400, json: { error: 'invalid_client', error_description: 'bad client' } }))
    await expect(requestDeviceCode(CLIENT_ID)).rejects.toThrow(/bad client/)
  })
})

describe('exchangeDeviceCode', () => {
  it('maps authorization_pending to pending', async () => {
    mockFetch(() => ({ status: 400, json: { error: 'authorization_pending' } }))
    expect(await exchangeDeviceCode('DC', CLIENT_ID)).toEqual({ status: 'pending' })
  })

  it('maps slow_down, expired_token, authorization_declined', async () => {
    mockFetch(() => ({ status: 400, json: { error: 'slow_down' } }))
    expect((await exchangeDeviceCode('DC', CLIENT_ID)).status).toBe('slow_down')
    mockFetch(() => ({ status: 400, json: { error: 'expired_token' } }))
    expect((await exchangeDeviceCode('DC', CLIENT_ID)).status).toBe('expired')
    mockFetch(() => ({ status: 400, json: { error: 'authorization_declined' } }))
    expect((await exchangeDeviceCode('DC', CLIENT_ID)).status).toBe('declined')
  })

  it('returns success with tokens', async () => {
    mockFetch(() => ({ json: { access_token: 'AT', refresh_token: 'RT' } }))
    const result = await exchangeDeviceCode('DC', CLIENT_ID)
    expect(result).toEqual({ status: 'success', token: { accessToken: 'AT', refreshToken: 'RT' } })
  })
})

describe('pollDeviceToken', () => {
  it('polls until success', async () => {
    let n = 0
    mockFetch(() =>
      n++ < 2
        ? { status: 400, json: { error: 'authorization_pending' } }
        : { json: { access_token: 'AT', refresh_token: 'RT' } },
    )
    const token = await pollDeviceToken('DC', 0, 10, CLIENT_ID)
    expect(token.accessToken).toBe('AT')
  })

  it('throws when device code expires', async () => {
    mockFetch(() => ({ status: 400, json: { error: 'expired_token' } }))
    await expect(pollDeviceToken('DC', 0, 10, CLIENT_ID)).rejects.toThrow(/expired/)
  })
})

describe('exchangeForSkypeScope', () => {
  it('refresh-exchanges to the spaces.skype scope and keeps a refresh token', async () => {
    const { calls } = mockFetch(() => ({ json: { access_token: 'SKYPE_AT', refresh_token: 'RT2' } }))
    const token = await exchangeForSkypeScope('RT1', CLIENT_ID)
    expect(calls[0].body.get('grant_type')).toBe('refresh_token')
    expect(calls[0].body.get('scope')).toContain('api.fl.spaces.skype.com')
    expect(token).toEqual({ accessToken: 'SKYPE_AT', refreshToken: 'RT2' })
  })

  it('falls back to the input refresh token when none is rotated', async () => {
    mockFetch(() => ({ json: { access_token: 'SKYPE_AT' } }))
    const token = await exchangeForSkypeScope('RT1', CLIENT_ID)
    expect(token.refreshToken).toBe('RT1')
  })
})

describe('mintConsumerSkypeToken', () => {
  it('parses shape A { skypeToken: { skypetoken } } and derives expiry from skypeTokenExpiresIn', async () => {
    mockFetch(() => ({ json: { skypeToken: { skypetoken: 'SKYPE', skypeTokenExpiresIn: 3600 } } }))
    const before = Date.now()
    const minted = await mintConsumerSkypeToken('AT')
    expect(minted.skypeToken).toBe('SKYPE')
    const ttl = new Date(minted.skypeTokenExpiresAt).getTime() - before
    expect(ttl).toBeGreaterThan(3000 * 1000)
    expect(ttl).toBeLessThan(3700 * 1000)
  })

  it('parses shape B { tokens: { skypeToken } }', async () => {
    mockFetch(() => ({ json: { tokens: { skypeToken: 'SKYPE_B' } } }))
    const minted = await mintConsumerSkypeToken('AT')
    expect(minted.skypeToken).toBe('SKYPE_B')
  })

  it('defaults TTL when expiry is absent', async () => {
    mockFetch(() => ({ json: { skypeToken: { skypetoken: 'SKYPE' } } }))
    const before = Date.now()
    const minted = await mintConsumerSkypeToken('AT')
    const ttl = new Date(minted.skypeTokenExpiresAt).getTime() - before
    expect(ttl).toBeGreaterThan(21000 * 1000)
  })

  it('throws when no skype token present', async () => {
    mockFetch(() => ({ status: 403, json: { errorCode: 'UserLicenseNotPresentForbidden', message: 'Teams disabled' } }))
    await expect(mintConsumerSkypeToken('AT')).rejects.toThrow(/UserLicenseNotPresentForbidden/)
  })
})
