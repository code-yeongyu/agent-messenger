import { SlackError } from './client'
import { refreshTokenFromWeb } from './ensure-auth'
import { buildConfirmationRequest, parseConfirmationPage, type SlackConfirmationCodeRequest } from './qr-confirmation'
import { sessionCookieFromResponse, setCookieNames, SlackCookieJar } from './qr-cookie-jar'
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
  requestConfirmationCode?: SlackConfirmationCodeRequest
}

const DEFAULT_MAX_REDIRECTS = 10

export async function loginWithQr(dataUrl: string, options: QrLoginOptions = {}): Promise<QrSession> {
  const login = decodeSlackQr(dataUrl.trim())
  const debug = options.debug
  debug?.(`Decoded QR for workspace ${login.workspace}`)

  const { cookie, denialReason, ssoProvider } = await captureDCookie(login, options)
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

async function captureDCookie(
  login: ReturnType<typeof decodeSlackQr>,
  options: QrLoginOptions,
): Promise<CookieCapture> {
  const doFetch = options.fetchImpl ?? fetch
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const debug = options.debug

  let url = login.url
  let dCookie: string | null = null
  let sessionDenialReason: string | null = null
  let ssoProvider: string | null = null
  const cookieJar = new SlackCookieJar()

  for (let hop = 0; hop < maxRedirects; hop++) {
    // Only ever send captured cookies (including the d session cookie) to Slack
    // hosts. A redirect to an off-domain host (e.g. an SSO IdP) must never
    // receive the d=xoxd- session cookie.
    if (!isSlackHost(url)) {
      debug?.(`hop ${hop}: refusing non-Slack host`)
      break
    }

    const response = await cookieJar.fetch(doFetch, url)
    dCookie = sessionCookieFromResponse(response, url, login.workspace, dCookie)

    const cookieNames = setCookieNames(response)
    debug?.(`hop ${hop}: ${response.status} set-cookie=[${cookieNames.join(',') || 'none'}]`)

    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null
    if (!location) {
      if (!dCookie) {
        const body = await response.text()
        const props = parseConfirmationPage(body)
        if (props && options.requestConfirmationCode) {
          const request = buildConfirmationRequest(login, url, props, '')
          if (!request) {
            sessionDenialReason = 'invalid_confirmation_origin'
            break
          }
          const code = await options.requestConfirmationCode({
            email: props.emailAddress,
            type: props.twoFactorType,
          })
          if (code.trim() === '') {
            sessionDenialReason = 'confirmation_failed'
            break
          }
          const confirmedRequest = buildConfirmationRequest(login, url, props, code)
          if (!confirmedRequest) {
            sessionDenialReason = 'invalid_confirmation_origin'
            break
          }
          const confirmed = await cookieJar.fetch(doFetch, confirmedRequest.url, {
            method: 'POST',
            body: confirmedRequest.body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          debug?.(`confirmation submit: ${confirmed.status}`)
          dCookie = await followConfirmationRedirects(
            confirmed,
            confirmedRequest.url,
            login.workspace,
            dCookie,
            cookieJar,
            doFetch,
            maxRedirects,
            debug,
          )
          if (!dCookie) sessionDenialReason = 'confirmation_failed'
        } else {
          sessionDenialReason = classifySessionDenialBody(body)
        }
      }
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
    if (!dCookie && options.requestConfirmationCode && isWorkspaceConfirmationUrl(next, login.workspace) === false) {
      sessionDenialReason = 'invalid_confirmation_origin'
      break
    }
    url = next
  }

  return { cookie: dCookie, denialReason: sessionDenialReason, ssoProvider }
}

function isWorkspaceConfirmationUrl(rawUrl: string, workspace: string): boolean | null {
  const url = new URL(rawUrl)
  if (!url.pathname.includes('/z-app-')) return null
  return url.hostname === `${workspace}.slack.com`
}

async function followConfirmationRedirects(
  response: Response,
  responseUrl: string,
  workspace: string,
  sessionCookie: string | null,
  cookieJar: SlackCookieJar,
  doFetch: typeof fetch,
  maxRedirects: number,
  debug?: (message: string) => void,
): Promise<string | null> {
  let currentResponse = response
  let currentUrl = responseUrl
  let currentSessionCookie = sessionCookieFromResponse(currentResponse, currentUrl, workspace, sessionCookie)
  for (let hop = 0; hop < maxRedirects; hop++) {
    if (currentSessionCookie) return currentSessionCookie
    const location =
      currentResponse.status >= 300 && currentResponse.status < 400 ? currentResponse.headers.get('location') : null
    if (!location) return null
    const next = new URL(location, currentUrl).toString()
    if (!isSlackHost(next)) return null
    currentUrl = next
    currentResponse = await cookieJar.fetch(doFetch, currentUrl)
    currentSessionCookie = sessionCookieFromResponse(currentResponse, currentUrl, workspace, currentSessionCookie)
    debug?.(`confirmation hop ${hop}: ${currentResponse.status}`)
  }
  return currentSessionCookie
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

function classifySessionDenialBody(body: string): string | null {
  if (/Link Expired/i.test(body) || /trouble signing you in/i.test(body)) return 'link_expired'
  if (/sign in on your other device/i.test(body) || /open Slack/i.test(body) || /confirm/i.test(body)) {
    return 'awaiting_device_confirmation'
  }
  return null
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
