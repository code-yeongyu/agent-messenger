import { afterEach, describe, expect, it, mock } from 'bun:test'

import { createWdmRewriteFetch, discoverWdmDevicesUrl } from './wdm-discovery'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response
}

describe('discoverWdmDevicesUrl', () => {
  it('returns the U2C wdm serviceLink with /devices appended', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ serviceLinks: { wdm: 'https://wdm-r.wbx2.com/wdm/api/v1' } })),
    )

    const url = await discoverWdmDevicesUrl('token123')

    expect(url).toBe('https://wdm-r.wbx2.com/wdm/api/v1/devices')
  })

  it('strips a trailing slash before appending /devices', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ serviceLinks: { wdm: 'https://wdm-r.wbx2.com/wdm/api/v1/' } })),
    )

    const url = await discoverWdmDevicesUrl('token123')

    expect(url).toBe('https://wdm-r.wbx2.com/wdm/api/v1/devices')
  })

  it('throws when the catalog request fails', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({}, false, 401)))

    await expect(discoverWdmDevicesUrl('bad')).rejects.toThrow('Failed to discover Webex WDM cluster')
  })

  it('throws when the catalog lacks serviceLinks.wdm', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({ serviceLinks: {} })))

    await expect(discoverWdmDevicesUrl('token123')).rejects.toThrow('did not include serviceLinks.wdm')
  })
})

describe('createWdmRewriteFetch', () => {
  it('rewrites the hardcoded WDM device-registration URL to the discovered cluster', async () => {
    const seen: string[] = []
    globalThis.fetch = mock((url: string) => {
      seen.push(url)
      return Promise.resolve(jsonResponse({ ok: true }))
    })

    const fetchFn = createWdmRewriteFetch('https://wdm-r.wbx2.com/wdm/api/v1/devices')
    await fetchFn({
      url: 'https://wdm-a.wbx2.com/wdm/api/v1/devices',
      method: 'POST',
      headers: { Authorization: 'Bearer x' },
      body: '{}',
    })

    expect(seen[0]).toBe('https://wdm-r.wbx2.com/wdm/api/v1/devices')
  })

  it('rewrites WDM device sub-paths too', async () => {
    const seen: string[] = []
    globalThis.fetch = mock((url: string) => {
      seen.push(url)
      return Promise.resolve(jsonResponse({}))
    })

    const fetchFn = createWdmRewriteFetch('https://wdm-r.wbx2.com/wdm/api/v1/devices')
    await fetchFn({
      url: 'https://wdm-a.wbx2.com/wdm/api/v1/devices/abc-123',
      method: 'DELETE',
      headers: {},
    })

    expect(seen[0]).toBe('https://wdm-r.wbx2.com/wdm/api/v1/devices/abc-123')
  })

  it('leaves non-WDM URLs untouched', async () => {
    const seen: string[] = []
    globalThis.fetch = mock((url: string) => {
      seen.push(url)
      return Promise.resolve(jsonResponse({}))
    })

    const fetchFn = createWdmRewriteFetch('https://wdm-r.wbx2.com/wdm/api/v1/devices')
    await fetchFn({ url: 'https://webexapis.com/v1/people/me', method: 'GET', headers: {} })

    expect(seen[0]).toBe('https://webexapis.com/v1/people/me')
  })
})
