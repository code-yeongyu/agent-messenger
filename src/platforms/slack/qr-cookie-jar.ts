import { CookieJar } from 'tough-cookie'

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const SESSION_COOKIE_NAME = 'd'
const SESSION_COOKIE_PREFIX = 'xoxd-'

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
      await this.#jar.setCookie(setCookie, url, { ignoreError: true })
    }
    return response
  }

  async sessionCookie(url: string): Promise<string | null> {
    const cookies = await this.#jar.getCookies(url)
    for (const cookie of cookies) {
      if (cookie.key === SESSION_COOKIE_NAME && cookie.value.startsWith(SESSION_COOKIE_PREFIX)) {
        return cookie.value
      }
    }
    return null
  }
}

export function setCookieNames(response: Response): readonly string[] {
  return getSetCookies(response).flatMap((setCookie) => {
    const name = setCookie.split('=')[0]?.trim()
    return name ? [name] : []
  })
}

function getSetCookies(response: Response): readonly string[] {
  const withGetter = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === 'function') return withGetter.getSetCookie()
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}
