import QRCode from 'qrcode'

import { loginWithQr } from './qr-http-login'

const WORKSPACE = 'acme'
const QR_SECRET = 'z-app-1-2-abcdef'
const MAGIC_LOGIN = 'z-app-1-3-ghijkl'
const ZAPP_URL = `https://app.slack.com/t/${WORKSPACE}/login/${QR_SECRET}?src=qr_code&user_id=U1&team_id=T1`
const D_COOKIE = 'xoxd-abc%2Bdef123'
const TOKEN = `xoxc-1-2-3-${'a'.repeat(64)}`

async function qrDataUrl(): Promise<string> {
  return QRCode.toDataURL(ZAPP_URL, { margin: 2, width: 256 })
}

function redirect(location: string, setCookies: readonly string[] = []): Response {
  const headers = new Headers({ location })
  for (const cookie of setCookies) headers.append('set-cookie', cookie)
  return new Response(null, { status: 302, headers })
}

function confirmationPage(email = 'user@acme.com'): Response {
  const props = JSON.stringify({
    action: 'request_primary',
    emailAddress: email,
    magicLogin: MAGIC_LOGIN,
    twoFactorType: 'sms',
  }).replaceAll('"', '&quot;')
  return new Response(`<div id="props_node" data-props="${props}"></div>`, { status: 200 })
}

describe('loginWithQr confirmation code', () => {
  it('keeps ordinary QR login prompt-free when Slack issues the session cookie directly', async () => {
    // Given an ordinary QR redirect chain and an optional confirmation callback
    const dataUrl = await qrDataUrl()
    let confirmationRequests = 0
    const fetchImpl = (async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/z-app-secret`, [`d=${D_COOKIE}; Domain=.slack.com; Path=/`])
      }
      if (url.includes('/z-app-secret')) return new Response(null, { status: 200 })
      if (url.includes('/ssb/redirect')) {
        return new Response(`<script>var boot_data={"api_token":"${TOKEN}"}</script>`, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    // When logging in through the unified QR flow
    const session = await loginWithQr(dataUrl, {
      fetchImpl,
      requestConfirmationCode: async () => {
        confirmationRequests += 1
        return '123456'
      },
    })

    // Then ordinary QR login succeeds without asking for a confirmation code
    expect(session.token).toBe(TOKEN)
    expect(confirmationRequests).toBe(0)
  })

  it('submits a confirmation code from Slack data-props and returns the session', async () => {
    // Given a QR chain that reaches Slack's confirmation-code page
    const dataUrl = await qrDataUrl()
    const requests: Array<{ url: string; method: string; body: string }> = []
    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? init.body : ''
      requests.push({ url, method, body })

      if (method === 'GET' && url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/login/${QR_SECRET}?src=qr_code&user_id=U1&team_id=T1`)
      }
      if (method === 'GET' && url.includes(`/login/${QR_SECRET}`)) return confirmationPage()
      if (method === 'POST' && url.includes(`/login/${QR_SECRET}`)) {
        return redirect('https://slack.com/checkcookie?redir=x', [`d=${D_COOKIE}; Domain=.slack.com; Path=/`])
      }
      if (url.includes('/ssb/redirect')) {
        return new Response(`<script>var boot_data={"api_token":"${TOKEN}"}</script>`, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${method} ${url}`)
    }) as typeof fetch

    // When the caller supplies the code Slack sent
    const session = await loginWithQr(dataUrl, {
      fetchImpl,
      requestConfirmationCode: async () => '123456',
    })

    // Then the server-issued magic login and entered code are posted to the exact workspace z-app URL
    const post = requests.find((request) => request.method === 'POST')
    expect(post?.url).toBe(
      `https://${WORKSPACE}.slack.com/login/${QR_SECRET}?domain=${WORKSPACE}&domainLogin=1&email=user%40acme.com`,
    )
    expect(post?.body).toContain(`2fa_magiclogin=${MAGIC_LOGIN}`)
    expect(post?.body).toContain('2fa_code=123456')
    expect(post?.body).toContain('2fa_action=submit_primary')
    expect(session).toEqual({ token: TOKEN, cookie: D_COOKIE, workspace: WORKSPACE })
  })

  it('rejects confirmation pages on another Slack subdomain before requesting the code', async () => {
    // Given a QR chain redirected to a different Slack workspace host
    const dataUrl = await qrDataUrl()
    let confirmationRequests = 0
    let postRequests = 0
    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if ((init?.method ?? 'GET') === 'POST') postRequests += 1
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://other.slack.com/login/${QR_SECRET}`)
      }
      if (url.startsWith('https://other.slack.com/')) return confirmationPage()
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    // When the unified login evaluates the confirmation page
    const promise = loginWithQr(dataUrl, {
      fetchImpl,
      requestConfirmationCode: async () => {
        confirmationRequests += 1
        return '123456'
      },
    })

    // Then no authentication material is requested or posted to the wrong workspace host
    await expect(promise).rejects.toThrow(/workspace host|session/)
    expect(confirmationRequests).toBe(0)
    expect(postRequests).toBe(0)
  })

  it('rejects an empty confirmation code without issuing a POST', async () => {
    // Given a valid confirmation page and a caller that returns only whitespace
    const dataUrl = await qrDataUrl()
    let postRequests = 0
    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method ?? 'GET'
      if (method === 'POST') postRequests += 1
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/login/${QR_SECRET}`)
      }
      if (url.includes(`/login/${QR_SECRET}`)) return confirmationPage()
      throw new Error(`unexpected fetch: ${method} ${url}`)
    }) as typeof fetch

    // When login receives the empty code
    const promise = loginWithQr(dataUrl, {
      fetchImpl,
      requestConfirmationCode: async () => '   ',
    })

    // Then login fails before sending authentication material
    await expect(promise).rejects.toThrow(/session|confirmation/)
    expect(postRequests).toBe(0)
  })

  it('keeps debug output free of QR, email, code, and cookie secrets', async () => {
    // Given a confirmation flow containing secret-bearing URLs and values
    const dataUrl = await qrDataUrl()
    const messages: string[] = []
    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/login/${QR_SECRET}?email=user%40acme.com`)
      }
      if (method === 'GET' && url.includes(`/login/${QR_SECRET}`)) return confirmationPage()
      if (method === 'POST') {
        return redirect('https://slack.com/checkcookie', [`d=${D_COOKIE}; Domain=.slack.com; Path=/`])
      }
      if (url.includes('/ssb/redirect')) {
        return new Response(`<script>var boot_data={"api_token":"${TOKEN}"}</script>`, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${method} ${url}`)
    }) as typeof fetch

    // When login emits debug messages
    await loginWithQr(dataUrl, {
      fetchImpl,
      requestConfirmationCode: async () => '123456',
      debug: (message) => messages.push(message),
    })

    // Then no authentication material appears in the debug channel
    const output = messages.join('\n')
    for (const secret of [QR_SECRET, MAGIC_LOGIN, 'user@acme.com', '123456', D_COOKIE, TOKEN]) {
      expect(output).not.toContain(secret)
    }
  })

  it('respects host, path, and deletion cookie semantics across redirects', async () => {
    // Given scoped cookies with the same name plus an explicitly deleted cookie
    const dataUrl = await qrDataUrl()
    const observedCookies: Record<string, string | null> = {}
    const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      observedCookies[url] = new Headers(init?.headers).get('cookie')
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/login/${QR_SECRET}`, [
          'hostOnly=app; Path=/',
          'shared=root; Domain=.slack.com; Path=/',
          'shared=login; Domain=.slack.com; Path=/login',
          'deleted=gone; Domain=.slack.com; Path=/; Max-Age=0',
        ])
      }
      if (url.includes(`/login/${QR_SECRET}`)) return new Response('<title>Link Expired</title>', { status: 200 })
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    // When redirects move from app.slack.com to the workspace login path
    await expect(loginWithQr(dataUrl, { fetchImpl })).rejects.toThrow(/expired/)

    // Then only cookies valid for that destination host and path are sent
    const destinationCookies = observedCookies[`https://${WORKSPACE}.slack.com/login/${QR_SECRET}`]
    expect(destinationCookies).not.toContain('hostOnly=app')
    expect(destinationCookies).toContain('shared=root')
    expect(destinationCookies).toContain('shared=login')
    expect(destinationCookies).not.toContain('deleted=gone')
  })

  it('does not retain a deleted Slack session cookie', async () => {
    // Given a redirect that creates and then deletes the d session cookie
    const dataUrl = await qrDataUrl()
    const fetchImpl = (async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('https://app.slack.com/t/')) {
        return redirect(`https://${WORKSPACE}.slack.com/end`, [
          `d=${D_COOKIE}; Domain=.slack.com; Path=/`,
          'd=; Domain=.slack.com; Path=/; Max-Age=0',
        ])
      }
      if (url === `https://${WORKSPACE}.slack.com/end`) return new Response(null, { status: 200 })
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    // When login processes the deleted session cookie
    const promise = loginWithQr(dataUrl, { fetchImpl })

    // Then the deleted session cannot authenticate the user
    await expect(promise).rejects.toThrow(/session/)
  })
})
