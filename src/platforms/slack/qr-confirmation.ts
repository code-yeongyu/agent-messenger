import type { SlackQrLogin } from './qr-login'

export interface SlackConfirmationChallenge {
  readonly email: string
  readonly type: string | null
}

export type SlackConfirmationCodeRequest = (challenge: SlackConfirmationChallenge) => Promise<string>

type SigninProps = {
  readonly magicLogin: string
  readonly emailAddress: string
  readonly twoFactorType: string | null
}

export function parseConfirmationPage(html: string): SigninProps | null {
  const match = html.match(/id="props_node"[^>]*\bdata-props="([^"]*)"/i)
  const encoded = match?.[1]
  if (!encoded) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeHtml(encoded))
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null

  const magicLogin = parsed.magicLogin
  const emailAddress = parsed.emailAddress
  if (typeof magicLogin !== 'string' || magicLogin === '') return null
  if (typeof emailAddress !== 'string' || emailAddress === '') return null
  return {
    magicLogin,
    emailAddress,
    twoFactorType: typeof parsed.twoFactorType === 'string' ? parsed.twoFactorType : null,
  }
}

export function buildConfirmationRequest(
  login: SlackQrLogin,
  finalUrl: string,
  props: SigninProps,
  code: string,
): { readonly url: string; readonly body: string } | null {
  const expected = expectedConfirmationPath(login)
  if (!expected) return null
  const url = new URL(finalUrl)
  if (url.hostname !== `${login.workspace}.slack.com`) return null
  if (url.pathname !== expected) return null

  url.search = ''
  url.searchParams.set('domain', login.workspace)
  url.searchParams.set('domainLogin', '1')
  url.searchParams.set('email', props.emailAddress)

  return {
    url: url.toString(),
    body: new URLSearchParams({
      '2fa_magiclogin': props.magicLogin,
      remember: '0',
      has_remember: 'false',
      '2fa_code': code.trim(),
      '2fa_action': 'submit_primary',
    }).toString(),
  }
}

export function expectedConfirmationPath(login: SlackQrLogin): string | null {
  const qrSecret = new URL(login.url).pathname.split('/').at(-1)
  if (!qrSecret || !qrSecret.startsWith('z-app-')) return null
  return `/login/${qrSecret}`
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
