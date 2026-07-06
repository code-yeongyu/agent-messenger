import { afterEach, describe, expect, it, mock } from 'bun:test'

import { probeAccountType } from './realm-discovery'

const originalFetch = globalThis.fetch

function mockFetch(response: { status?: number; json?: unknown; reject?: boolean }): {
  calls: Array<{ url: string; init: RequestInit }>
} {
  const calls: Array<{ url: string; init: RequestInit }> = []
  globalThis.fetch = mock((input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    if (response.reject) return Promise.reject(new Error('network down'))
    const status = response.status ?? 200
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response.json),
    } as Response)
  }) as typeof fetch
  return { calls }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('probeAccountType', () => {
  it('posts the email to GetCredentialType as JSON', async () => {
    const { calls } = mockFetch({ json: { EstsProperties: { DomainType: 3 } } })

    await probeAccountType('user@contoso.com')

    expect(calls[0].url).toBe('https://login.microsoftonline.com/common/GetCredentialType')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ Username: 'user@contoso.com' })
  })

  it('maps a consumer DomainType to personal', async () => {
    mockFetch({ json: { EstsProperties: { DomainType: 2 } } })
    expect(await probeAccountType('user@outlook.com')).toBe('personal')
  })

  it('treats a known consumer domain as personal even without DomainType', async () => {
    mockFetch({ json: { EstsProperties: { IsConsumerDomain: true } } })
    expect(await probeAccountType('user@hotmail.com')).toBe('personal')
  })

  it('maps a managed DomainType to work', async () => {
    mockFetch({ json: { EstsProperties: { DomainType: 3 } } })
    expect(await probeAccountType('user@contoso.com')).toBe('work')
  })

  it('maps a federated DomainType to work', async () => {
    mockFetch({ json: { EstsProperties: { DomainType: 4 } } })
    expect(await probeAccountType('user@fabrikam.com')).toBe('work')
  })

  it('returns undefined when the domain type is missing', async () => {
    mockFetch({ json: { EstsProperties: {} } })
    expect(await probeAccountType('user@unknown.test')).toBeUndefined()
  })

  it('returns undefined on a non-ok response', async () => {
    mockFetch({ status: 429, json: {} })
    expect(await probeAccountType('user@contoso.com')).toBeUndefined()
  })

  it('returns undefined when the request throws', async () => {
    mockFetch({ reject: true })
    expect(await probeAccountType('user@contoso.com')).toBeUndefined()
  })
})
