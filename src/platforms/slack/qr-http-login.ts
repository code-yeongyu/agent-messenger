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

  const { cookie, denialReason, ssoProvider } = await captureDCookie(login.url, options)
  if (!cookie) {
    throw new SlackError(
      qrSessionFailureMessage(denialReason, { workspace: login.workspace, ssoProvider }),
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

interface QrFailureContext {
  workspace?: string
  ssoProvider?: string | null
}

function qrSessionFailureMessage(denialReason: string | null, context: QrFailureContext = {}): string {
  const workspace = context.workspace ? `"${context.workspace}"` : 'this workspace'

  if (denialReason === 'sso_required') {
    const via = context.ssoProvider ? ` (via ${context.ssoProvider})` : ''
    return [
      `Slack workspace ${workspace} enforces SSO${via}, so QR sign-in cannot complete here.`,
      '',
      `Why: scanning the QR redirects the login to your identity provider${via}. agent-slack follows the`,
      'redirect chain over plain HTTP and never sends your session cookie off Slack-owned hosts, so it',
      'stops at the IdP and no Slack session (the "d" cookie) is ever issued. Completing SSO requires a',
      'real browser, which a headless environment does not have.',
      '',
      'What to do instead:',
      '  On a computer where you are already signed in to Slack (desktop app or a Chromium browser),',
      '  run:  agent-slack auth extract',
      '  This reads your existing session locally — no SSO re-login, no DevTools.',
      '',
      'Background: https://github.com/agent-messenger/agent-messenger/issues/260',
    ].join('\n')
  }
  if (denialReason === 'link_expired') {
    return [
      `The Slack QR code for ${workspace} has expired or was already used.`,
      'The z-app sign-in link is single-use and short-lived: it is consumed the first time it is opened',
      '(including previewing or scanning it), and re-using it returns "Link Expired".',
      '',
      'Generate a fresh QR (your name → "Sign in on mobile") and pipe it in immediately, without',
      'previewing or scanning it first.',
    ].join('\n')
  }
  if (denialReason === 'awaiting_device_confirmation') {
    return [
      `Slack requires this sign-in to ${workspace} to be confirmed on an already-authenticated device.`,
      'QR sign-in over HTTP cannot complete that approval step.',
      '',
      'Use  agent-slack auth extract  on a computer already signed in to Slack instead.',
    ].join('\n')
  }
  return [
    `Could not establish a Slack session for ${workspace} from the QR code.`,
    'The link may have expired, or the workspace requires a sign-in step that QR-over-HTTP cannot complete.',
    '',
    'Generate a fresh QR and try again, or run  agent-slack auth extract  on a computer already signed in',
    'to Slack.',
  ].join('\n')
}

interface CookieCapture {
  cookie: string | null
  denialReason: string | null
  ssoProvider: string | null
}

async function captureDCookie(startUrl: string, options: QrLoginOptions): Promise<CookieCapture> {
  const doFetch = options.fetchImpl ?? fetch
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const debug = options.debug

  let url = startUrl
  let dCookie: string | null = null
  let sessionDenialReason: string | null = null
  let ssoProvider: string | null = null
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

    const cookieNames: string[] = []
    for (const setCookie of getSetCookies(response)) {
      const value = parseDCookie(setCookie)
      if (value) dCookie = value
      const name = setCookie.split('=')[0]?.trim()
      if (name) cookieNames.push(name)
      const pair = setCookie.split(';')[0]?.trim()
      if (pair) cookieJar.push(pair)
    }

    debug?.(`hop ${hop}: ${response.status} set-cookie=[${cookieNames.join(',') || 'none'}]`)

    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null
    if (!location) {
      if (!dCookie) sessionDenialReason = await classifySessionDenial(response)
      break
    }

    const next = new URL(location, url).toString()
    if (!isSlackHost(next)) {
      // A no-cookie login QR that redirects off Slack is an SSO/IdP hand-off the
      // HTTP flow cannot complete — classify it regardless of whether the IdP
      // host is a recognized provider (custom/vanity SAML domains included).
      if (!dCookie) {
        sessionDenialReason = 'sso_required'
        ssoProvider = ssoProviderFromUrl(next)
      }
      debug?.(`hop ${hop}: redirect target is not a Slack host (${new URL(next).hostname}), stopping`)
      break
    }
    url = next
  }

  return { cookie: dCookie, denialReason: sessionDenialReason, ssoProvider }
}

function ssoProviderFromUrl(rawUrl: string): string | null {
  let hostname: string
  try {
    hostname = new URL(rawUrl).hostname
  } catch {
    return null
  }
  if (hostname === 'accounts.google.com') return 'Google'
  if (hostname.endsWith('.okta.com') || hostname.endsWith('.oktapreview.com')) return 'Okta'
  if (hostname === 'login.microsoftonline.com') return 'Microsoft'
  if (hostname.endsWith('.onelogin.com')) return 'OneLogin'
  if (hostname.endsWith('.pingidentity.com') || hostname.endsWith('.pingone.com')) return 'Ping Identity'
  if (hostname.endsWith('.auth0.com')) return 'Auth0'
  return null
}

async function classifySessionDenial(response: Response): Promise<string | null> {
  try {
    const body = await response.text()
    if (/Link Expired/i.test(body) || /trouble signing you in/i.test(body)) {
      return 'link_expired'
    }
    if (/sign in on your other device/i.test(body) || /open Slack/i.test(body) || /confirm/i.test(body)) {
      return 'awaiting_device_confirmation'
    }
    return null
  } catch {
    return null
  }
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
