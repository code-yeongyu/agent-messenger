import { CookieJar } from 'tough-cookie'

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export class SlackCookieJar {
  readonly #jar = new CookieJar()

  async fetch(doFetch: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
    const cookie = await this.#jar.getCookieString(url)
    const response = await doFetch(url, {
      ...init,
      redirect: 'manual',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...init.headers,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    })
    for (const setCookie of getSetCookies(response)) {
      await this.#jar.setCookie(setCookie, url)
    }
    return response
  }
}

export function setCookieNames(response: Response): readonly string[] {
  return getSetCookies(response).flatMap((setCookie) => {
    const name = setCookie.split('=')[0]?.trim()
    return name ? [name] : []
  })
}

export function sessionCookieFromResponse(
  response: Response,
  responseUrl: string,
  workspace: string,
  current: string | null,
): string | null {
  const hostname = new URL(responseUrl).hostname
  if (hostname !== `${workspace}.slack.com` && hostname !== 'app.slack.com') return current
  let sessionCookie = current
  for (const setCookie of getSetCookies(response)) {
    if (isDeletedSessionCookie(setCookie)) sessionCookie = null
    else sessionCookie = parseSessionCookie(setCookie) ?? sessionCookie
  }
  return sessionCookie
}

function getSetCookies(response: Response): readonly string[] {
  const withGetter = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === 'function') return withGetter.getSetCookie()
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}

function parseSessionCookie(setCookie: string): string | null {
  const match = setCookie.match(/(?:^|,\s*)d=(xoxd-[^;]+)/)
  return match?.[1] ?? null
}

function isDeletedSessionCookie(setCookie: string): boolean {
  return /^d=/i.test(setCookie) && /(?:^|;)\s*max-age=0(?:;|$)/i.test(setCookie)
}
