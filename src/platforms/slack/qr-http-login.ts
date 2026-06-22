import { SlackError } from './client'
import { refreshTokenFromWeb } from './ensure-auth'
import { decodeSlackQr } from './qr-login'

export interface QrSession {
  token: string
  cookie: string
  workspace: string
}

export interface QrLoginOptions {
  fetchImpl?: typeof fetch
  maxRedirects?: number
  debug?: (message: string) => void
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const DEFAULT_MAX_REDIRECTS = 10

export async function loginWithQr(dataUrl: string, options: QrLoginOptions = {}): Promise<QrSession> {
  const login = decodeSlackQr(dataUrl.trim())
  const debug = options.debug
  debug?.(`Decoded QR for workspace ${login.workspace}`)

  const cookie = await captureDCookie(login.url, options)
  if (!cookie) {
    throw new SlackError(
      'Could not establish a Slack session from the QR code. The link may have expired — generate a new QR code and try again.',
      'qr_session_failed',
    )
  }
  debug?.('Captured session cookie')

  const token = await refreshTokenFromWeb(login.workspace, cookie, options.fetchImpl ?? fetch)
  if (!token) {
    throw new SlackError(
      'Slack session was established but the client token could not be retrieved.',
      'qr_token_failed',
    )
  }
  debug?.('Retrieved client token')

  return { token, cookie, workspace: login.workspace }
}

async function captureDCookie(startUrl: string, options: QrLoginOptions): Promise<string | null> {
  const doFetch = options.fetchImpl ?? fetch
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const debug = options.debug

  let url = startUrl
  let dCookie: string | null = null
  const cookieJar: string[] = []

  for (let hop = 0; hop < maxRedirects; hop++) {
    // Only ever send captured cookies (including the d session cookie) to Slack
    // hosts. A redirect to an off-domain host (e.g. an SSO IdP) must never
    // receive the d=xoxd- session cookie.
    if (!isSlackHost(url)) {
      debug?.(`hop ${hop}: refusing non-Slack host`)
      break
    }

    const response = await doFetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookieJar.length ? { Cookie: cookieJar.join('; ') } : {}),
      },
    })

    for (const setCookie of getSetCookies(response)) {
      const value = parseDCookie(setCookie)
      if (value) dCookie = value
      const pair = setCookie.split(';')[0]?.trim()
      if (pair) cookieJar.push(pair)
    }

    debug?.(`hop ${hop}: ${response.status}`)

    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null
    if (!location) break

    const next = new URL(location, url).toString()
    if (!isSlackHost(next)) {
      debug?.(`hop ${hop}: redirect target is not a Slack host, stopping`)
      break
    }
    url = next
  }

  return dCookie
}

export function isSlackHost(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl)
    if (protocol !== 'https:') return false
    return hostname === 'slack.com' || hostname.endsWith('.slack.com')
  } catch {
    return false
  }
}

export function parseDCookie(setCookieHeader: string): string | null {
  const match = setCookieHeader.match(/(?:^|,\s*)d=(xoxd-[^;]+)/)
  return match ? match[1] : null
}

function getSetCookies(response: Response): string[] {
  const withGetter = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === 'function') {
    return withGetter.getSetCookie()
  }
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}
