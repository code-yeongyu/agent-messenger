import { afterEach, describe, expect, it, mock } from 'bun:test'

import { getTeamsAppClientId } from './app-config'
import {
  decodeJwtTid,
  exchangeDeviceCode,
  exchangeForSkypeScope,
  isConsumerTenant,
  mintConsumerSkypeToken,
  mintSkypeToken,
  pollDeviceToken,
  requestDeviceCode,
  resolveWorkTenantId,
} from './device-code'

const CLIENT_ID = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
const REAL_TENANT_ID = 'c0ffee00-1111-2222-3333-444455556666'
const originalFetch = globalThis.fetch

function fakeJwt(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `header.${payload}.signature`
}

interface FakeResponse {
  status?: number
  json: unknown
}

function mockFetch(responder: (url: string, init: RequestInit) => FakeResponse): {
  calls: Array<{ url: string; body: URLSearchParams; init: RequestInit }>
} {
  const calls: Array<{ url: string; body: URLSearchParams; init: RequestInit }> = []
  globalThis.fetch = mock((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const raw = (init?.body as string) ?? ''
    calls.push({ url, body: new URLSearchParams(raw), init: init ?? {} })
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

describe('getTeamsAppClientId', () => {
  it('keeps the consumer client for personal login and uses Teams desktop client for work login', () => {
    expect(getTeamsAppClientId('personal').clientId).toBe('5e3ce6c0-2b1f-4285-8d4b-75ee78787346')
    expect(getTeamsAppClientId('work').clientId).toBe('1fec8e78-bce4-4aaf-ab1b-5451cc387264')
  })
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
    expect(calls[0].body.get('scope')).toContain('offline_access')
    expect(info.verificationUriComplete).toBe('https://microsoft.com/devicelogin?otc=ABCD-1234')
    expect(info.interval).toBe(5)
  })

  it('posts work-account device code requests to organizations authority with Teams scope', async () => {
    const { calls } = mockFetch(() => ({
      json: {
        device_code: 'DC',
        user_code: 'ABCD-1234',
        verification_uri: 'https://microsoft.com/devicelogin',
        expires_in: 900,
        interval: 5,
      },
    }))

    await requestDeviceCode(CLIENT_ID, 'work')

    expect(calls[0].url).toContain('/organizations/oauth2/v2.0/devicecode')
    expect(calls[0].body.get('client_id')).toBe(CLIENT_ID)
    expect(calls[0].body.get('scope')).toBe('https://api.spaces.skype.com/.default openid profile offline_access')
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
    expect(calls[0].body.get('scope')).toContain('offline_access')
    expect(token).toEqual({ accessToken: 'SKYPE_AT', refreshToken: 'RT2' })
  })

  it('falls back to the input refresh token when none is rotated', async () => {
    mockFetch(() => ({ json: { access_token: 'SKYPE_AT' } }))
    const token = await exchangeForSkypeScope('RT1', CLIENT_ID)
    expect(token.refreshToken).toBe('RT1')
  })

  it('refresh-exchanges work accounts against organizations authority with Teams Skype scope', async () => {
    const { calls } = mockFetch(() => ({ json: { access_token: 'WORK_SKYPE_AT', refresh_token: 'RT2' } }))

    const token = await exchangeForSkypeScope('RT1', CLIENT_ID, 'work')

    expect(calls[0].url).toContain('/organizations/oauth2/v2.0/token')
    expect(calls[0].body.get('grant_type')).toBe('refresh_token')
    expect(calls[0].body.get('scope')).toBe('https://api.spaces.skype.com/.default openid profile offline_access')
    expect(token).toEqual({ accessToken: 'WORK_SKYPE_AT', refreshToken: 'RT2' })
  })

  it('targets the tenant-specific authority when a tenant id is provided', async () => {
    const { calls } = mockFetch(() => ({ json: { access_token: 'TENANT_SKYPE_AT', refresh_token: 'RT2' } }))

    await exchangeForSkypeScope('RT1', CLIENT_ID, 'work', REAL_TENANT_ID)

    expect(calls[0].url).toContain(`/${REAL_TENANT_ID}/oauth2/v2.0/token`)
    expect(calls[0].url).not.toContain('/organizations/')
  })
})

describe('resolveWorkTenantId', () => {
  it('uses the token tid directly when it is already a real tenant guid', async () => {
    const { calls } = mockFetch(() => ({ json: [] }))

    const tenantId = await resolveWorkTenantId(fakeJwt({ tid: REAL_TENANT_ID }))

    expect(tenantId).toBe(REAL_TENANT_ID)
    // given a concrete tenant, discovery must be skipped
    expect(calls).toHaveLength(0)
  })

  it('discovers the tenant when the token tid is the organizations placeholder', async () => {
    const { calls } = mockFetch(() => ({
      json: [{ tenantId: REAL_TENANT_ID, tenantName: 'Contoso', isInvitationRedeemed: true }],
    }))

    const tenantId = await resolveWorkTenantId(fakeJwt({ tid: 'organizations' }))

    expect(tenantId).toBe(REAL_TENANT_ID)
    expect(calls[0].url).toContain('/api/mt/emea/beta/users/tenants')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toContain('Bearer ')
  })

  it('discovers the tenant when the token tid is the Microsoft Services placeholder', async () => {
    const { calls } = mockFetch(() => ({
      json: [{ tenantId: REAL_TENANT_ID, isInvitationRedeemed: true }],
    }))

    const tenantId = await resolveWorkTenantId(fakeJwt({ tid: 'f8cdef31-a31e-4b4a-93e4-5f571e91255a' }))

    expect(tenantId).toBe(REAL_TENANT_ID)
    expect(calls[0].url).toContain('/api/mt/emea/beta/users/tenants')
  })

  it('prefers the first redeemed tenant over an unredeemed one', async () => {
    mockFetch(() => ({
      json: [
        { tenantId: 'guest-tenant', isInvitationRedeemed: false },
        { tenantId: REAL_TENANT_ID, isInvitationRedeemed: true },
      ],
    }))

    const tenantId = await resolveWorkTenantId(fakeJwt({ tid: 'organizations' }))

    expect(tenantId).toBe(REAL_TENANT_ID)
  })

  it('throws an actionable error when only an unredeemed guest tenant exists', async () => {
    mockFetch(() => ({ json: [{ tenantId: 'guest-tenant', isInvitationRedeemed: false }] }))

    await expect(resolveWorkTenantId(fakeJwt({ tid: 'organizations' }))).rejects.toThrow(
      /invitation has not been accepted/,
    )
  })

  it('throws when no tenant is associated with the account and points to the personal flow', async () => {
    mockFetch(() => ({ json: [] }))

    await expect(resolveWorkTenantId(fakeJwt({ tid: 'organizations' }))).rejects.toThrow(/--account-type personal/)
  })
})

describe('decodeJwtTid', () => {
  it('returns the tid claim from a JWT access token', () => {
    expect(decodeJwtTid(fakeJwt({ tid: '9188040d-6c67-4c5b-b112-36a304b66dad' }))).toBe(
      '9188040d-6c67-4c5b-b112-36a304b66dad',
    )
  })

  it('returns undefined for a malformed token', () => {
    expect(decodeJwtTid('not-a-jwt')).toBeUndefined()
  })

  it('returns undefined when the tid claim is absent', () => {
    expect(decodeJwtTid(fakeJwt({ sub: 'user' }))).toBeUndefined()
  })
})

describe('isConsumerTenant', () => {
  it('recognizes the consumer tenant as personal', () => {
    expect(isConsumerTenant('9188040d-6c67-4c5b-b112-36a304b66dad')).toBe(true)
  })

  it('does not treat the Microsoft Services placeholder as personal (work tokens carry it too)', () => {
    expect(isConsumerTenant('f8cdef31-a31e-4b4a-93e4-5f571e91255a')).toBe(false)
  })

  it('does not treat the organizations placeholder or a real tenant as personal', () => {
    expect(isConsumerTenant('organizations')).toBe(false)
    expect(isConsumerTenant(REAL_TENANT_ID)).toBe(false)
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

  it('augments GuestUserNotRedeemed with an actionable hint', async () => {
    mockFetch(() => ({ status: 400, json: { errorCode: 'GuestUserNotRedeemed' } }))
    await expect(mintSkypeToken('AT', 'work')).rejects.toThrow(/GuestUserNotRedeemed/)
    mockFetch(() => ({ status: 400, json: { errorCode: 'GuestUserNotRedeemed' } }))
    await expect(mintSkypeToken('AT', 'work')).rejects.toThrow(/--account-type personal/)
  })
})
