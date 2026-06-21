import { afterEach, describe, expect, it, mock } from 'bun:test'
import { createHash } from 'node:crypto'

import { createPkcePair, loginWithPassword } from './password-login'
import { WebexError } from './types'

const realFetch = globalThis.fetch

describe('loginWithPassword', () => {
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('exchanges email and password for tokens and registers a device', async () => {
    const postedBodies: string[] = []

    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = toUrl(input)
      if (typeof init?.body === 'string') postedBodies.push(init.body)

      if (url.startsWith('https://u2c.svc.webex.com/')) {
        return Promise.resolve(
          jsonResponse({
            serviceLinks: { idbroker: 'https://idbroker-test.webex.com', wdm: 'https://wdm-test.wbx2.com' },
          }),
        )
      }

      if (url.startsWith('https://idbroker-test.webex.com/idb/oauth2/v1/authorize')) {
        return Promise.resolve(
          new Response(
            '<form><input type="hidden" name="SunQueryParamsString" value="one&amp;two=&#x40;"><input name="goto" value="https://web.webex.com"><input name="encoded" value="true"><input name="gx_charset" value="UTF-8"><input name="webAuthnEnabledFlow" value="false"><input name="webAuthnResponse" value=""><input name="isAudioCaptcha" value="false"></form>',
            { status: 200, headers: { 'set-cookie': 'sid=abc; Path=/' } },
          ),
        )
      }

      if (url === 'https://idbroker-test.webex.com/idb/UI/Login') {
        return Promise.resolve(
          new Response('', { status: 302, headers: { location: 'https://web.webex.com/?code=TESTCODE' } }),
        )
      }

      if (url === 'https://idbroker-test.webex.com/idb/oauth2/v1/access_token') {
        return Promise.resolve(
          jsonResponse({
            access_token: 'fake-access-token',
            refresh_token: 'fake-refresh-token',
            expires_in: 3600,
            refresh_token_expires_in: 7200,
            scope: 'spark:kms',
            token_type: 'Bearer',
          }),
        )
      }

      if (url === 'https://wdm-test.wbx2.com/wdm/api/v1/devices') {
        return Promise.resolve(
          jsonResponse({ url: 'https://wdm-test.wbx2.com/wdm/api/v1/devices/device-1', userId: 'user-1' }),
        )
      }

      return Promise.resolve(new Response('', { status: 404 }))
    }) as typeof fetch

    const result = await loginWithPassword('user@example.com', 'test-password')
    const loginBody = new URLSearchParams(postedBodies.find((body) => body.includes('IDToken2')))

    expect(result.accessToken).toBe('fake-access-token')
    expect(result.refreshToken).toBe('fake-refresh-token')
    expect(result.expiresAt).toBeGreaterThan(Date.now())
    expect(result.deviceUrl).toBe('https://wdm-test.wbx2.com/wdm/api/v1/devices/device-1')
    expect(result.userId).toBe('user-1')
    expect(loginBody.get('IDToken1')).toBe('user@example.com')
    expect(loginBody.get('IDToken2')).toBe('test-password')
    expect(loginBody.get('SunQueryParamsString')).toBe('one&two=@')
  })

  it('creates an S256 PKCE challenge from the verifier', () => {
    const verifier = 'test-verifier'
    const expectedChallenge = createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    expect(createPkcePair(verifier)).toEqual({ verifier, challenge: expectedChallenge })
  })

  it('rejects without persisting when WDM device registration fails', async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = toUrl(input)

      if (url.startsWith('https://u2c.svc.webex.com/')) {
        return Promise.resolve(
          jsonResponse({
            serviceLinks: { idbroker: 'https://idbroker-test.webex.com', wdm: 'https://wdm-test.wbx2.com' },
          }),
        )
      }
      if (url.startsWith('https://idbroker-test.webex.com/idb/oauth2/v1/authorize')) {
        return Promise.resolve(
          new Response('<input name="SunQueryParamsString" value="x">', {
            status: 200,
            headers: { 'set-cookie': 'sid=abc; Path=/' },
          }),
        )
      }
      if (url === 'https://idbroker-test.webex.com/idb/UI/Login') {
        return Promise.resolve(
          new Response('', { status: 302, headers: { location: 'https://web.webex.com/?code=TESTCODE' } }),
        )
      }
      if (url === 'https://idbroker-test.webex.com/idb/oauth2/v1/access_token') {
        return Promise.resolve(
          jsonResponse({ access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', expires_in: 3600 }),
        )
      }
      if (url === 'https://wdm-test.wbx2.com/wdm/api/v1/devices') {
        return Promise.resolve(new Response('', { status: 500 }))
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }) as typeof fetch

    await expect(loginWithPassword('user@example.com', 'test-password')).rejects.toMatchObject({
      name: 'WebexError',
      code: 'device_registration_failed',
    } satisfies Partial<WebexError>)
  })

  it('rejects as sso_required without posting credentials when authorize redirects to an external IdP', async () => {
    const postedBodies: string[] = []
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = toUrl(input)
      if (typeof init?.body === 'string') postedBodies.push(init.body)

      if (url.startsWith('https://u2c.svc.webex.com/')) {
        return Promise.resolve(jsonResponse({ serviceLinks: { idbroker: 'https://idbroker-test.webex.com' } }))
      }
      if (url.startsWith('https://idbroker-test.webex.com/idb/oauth2/v1/authorize')) {
        return Promise.resolve(
          new Response('', { status: 302, headers: { location: 'https://idp.example.com/login' } }),
        )
      }
      if (url.startsWith('https://idp.example.com/')) {
        return Promise.resolve(new Response('<input name="IDToken1"><input name="IDToken2">', { status: 200 }))
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }) as typeof fetch

    await expect(loginWithPassword('user@example.com', 'test-password')).rejects.toMatchObject({
      name: 'WebexError',
      code: 'sso_required',
    } satisfies Partial<WebexError>)
    expect(postedBodies.some((body) => body.includes('test-password'))).toBe(false)
  })

  it('throws mfa_required when login lands on an OTP step', async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = toUrl(input)

      if (url.startsWith('https://u2c.svc.webex.com/')) {
        return Promise.resolve(jsonResponse({ serviceLinks: { idbroker: 'https://idbroker-test.webex.com' } }))
      }

      if (url.startsWith('https://idbroker-test.webex.com/idb/oauth2/v1/authorize')) {
        return Promise.resolve(new Response('<input name="SunQueryParamsString" value="x">', { status: 200 }))
      }

      if (url === 'https://idbroker-test.webex.com/idb/UI/Login') {
        return Promise.resolve(new Response('<input name="IDToken1"><p>verification code</p>', { status: 200 }))
      }

      return Promise.resolve(new Response('', { status: 404 }))
    }) as typeof fetch

    await expect(loginWithPassword('user@example.com', 'test-password')).rejects.toMatchObject({
      name: 'WebexError',
      code: 'mfa_required',
    } satisfies Partial<WebexError>)
  })
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}
