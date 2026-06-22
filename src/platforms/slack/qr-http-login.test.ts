import { afterEach, describe, expect, it } from 'bun:test'

import QRCode from 'qrcode'

import { SlackError } from '@/platforms/slack/client'
import { isSlackHost, loginWithQr, parseDCookie } from '@/platforms/slack/qr-http-login'

const WORKSPACE = 'acme'
const ZAPP_URL = `https://app.slack.com/t/${WORKSPACE}/login/z-app-1-2-abcdef?src=qr_code&user_id=U1&team_id=T1`
const D_COOKIE = 'xoxd-abc%2Bdef123'
const TOKEN = `xoxc-1-2-3-${'a'.repeat(64)}`

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 2, width: 256 })
}

function redirect(location: string, setCookie?: string): Response {
  const headers = new Headers({ location })
  if (setCookie) headers.append('set-cookie', setCookie)
  return new Response(null, { status: 302, headers })
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('parseDCookie', () => {
  it('extracts the d cookie value from a Set-Cookie header', () => {
    expect(parseDCookie(`d=${D_COOKIE}; Path=/; HttpOnly; Secure`)).toBe(D_COOKIE)
  })

  it('ignores a non-d cookie', () => {
    expect(parseDCookie('x=somevalue; Path=/')).toBeNull()
  })

  it('ignores a d cookie that is not an xoxd value', () => {
    expect(parseDCookie('d=plainvalue; Path=/')).toBeNull()
  })
})

describe('isSlackHost', () => {
  it('accepts slack.com and its subdomains over https', () => {
    expect(isSlackHost('https://slack.com/checkcookie')).toBe(true)
    expect(isSlackHost('https://app.slack.com/t/acme/login/z-app-1')).toBe(true)
    expect(isSlackHost('https://acme.slack.com/ssb/redirect')).toBe(true)
  })

  it('rejects non-Slack hosts, http, and lookalikes', () => {
    expect(isSlackHost('https://idp.example.com/saml')).toBe(false)
    expect(isSlackHost('http://app.slack.com/x')).toBe(false)
    expect(isSlackHost('https://slack.com.evil.com/x')).toBe(false)
    expect(isSlackHost('not a url')).toBe(false)
  })
})

describe('loginWithQr', () => {
  it('captures cookie and mints a token through a single injected fetch', async () => {
    // Given a QR encoding the z-app login URL
    const dataUrl = await qrDataUrl(ZAPP_URL)

    // And a single fetchImpl serving both the redirect chain and the token page
    // (no globalThis.fetch monkeypatching)
    const fetchImpl = (async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/app-redir/login/x`)
      }
      if (url.includes('/app-redir/login/')) {
        return redirect(`https://${WORKSPACE}.slack.com/z-app-secret`, `d=${D_COOKIE}; HttpOnly`)
      }
      if (url.includes('/z-app-secret')) {
        return redirect('https://slack.com/checkcookie?redir=x')
      }
      if (url.includes('/checkcookie')) {
        return new Response(null, { status: 200 })
      }
      if (url.includes('/ssb/redirect')) {
        return new Response(`<script>var boot_data={"api_token":"${TOKEN}"}</script>`, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    // When logging in with only fetchImpl
    const session = await loginWithQr(dataUrl, { fetchImpl })

    // Then the cookie, token, and workspace are returned
    expect(session.cookie).toBe(D_COOKIE)
    expect(session.token).toBe(TOKEN)
    expect(session.workspace).toBe(WORKSPACE)
  })

  it('never sends the d cookie to a non-Slack redirect target', async () => {
    // Given a chain that sets the d cookie, then redirects off-domain to an IdP
    const dataUrl = await qrDataUrl(ZAPP_URL)
    const requests: Array<{ url: string; cookie: string | null }> = []

    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const headers = new Headers(init?.headers)
      requests.push({ url, cookie: headers.get('cookie') })

      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/z-app-secret`, `d=${D_COOKIE}; HttpOnly`)
      }
      if (url.includes('/z-app-secret')) {
        return redirect('https://idp.example.com/saml/login')
      }
      throw new Error(`d cookie leaked to non-Slack host: ${url}`)
    }) as typeof fetch

    // When logging in, the off-domain redirect is refused (so no token is minted)
    await expect(loginWithQr(dataUrl, { fetchImpl })).rejects.toThrow(/expired|client token/)

    // Then the IdP host was never requested at all
    expect(requests.some((r) => r.url.includes('idp.example.com'))).toBe(false)
    // And no request ever carried the d session cookie to a non-Slack host
    for (const r of requests) {
      if (r.cookie?.includes('xoxd-')) {
        expect(isSlackHost(r.url)).toBe(true)
      }
    }
  })

  it('fails with qr_session_failed when no d cookie is set', async () => {
    const dataUrl = await qrDataUrl(ZAPP_URL)
    const stepAFetch = (async () => new Response(null, { status: 200 })) as typeof fetch

    const promise = loginWithQr(dataUrl, { fetchImpl: stepAFetch })
    await expect(promise).rejects.toThrow(SlackError)
    await expect(promise).rejects.toThrow(/expired/)
  })

  it('fails with qr_token_failed when the token cannot be retrieved', async () => {
    const dataUrl = await qrDataUrl(ZAPP_URL)

    globalThis.fetch = (async () => new Response('<html>no token here</html>', { status: 200 })) as typeof fetch
    const stepAFetch = (async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/end`, `d=${D_COOKIE}; HttpOnly`)
      }
      return new Response(null, { status: 200 })
    }) as typeof fetch

    const promise = loginWithQr(dataUrl, { fetchImpl: stepAFetch })
    await expect(promise).rejects.toThrow(/client token could not be retrieved/)
  })

  it('rejects a QR that is not a Slack login link', async () => {
    const dataUrl = await qrDataUrl('https://example.com/not-slack')
    await expect(loginWithQr(dataUrl, { fetchImpl: (async () => new Response()) as typeof fetch })).rejects.toThrow(
      SlackError,
    )
  })
})
