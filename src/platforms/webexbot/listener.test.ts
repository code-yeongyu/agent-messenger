import { describe, expect, it, mock } from 'bun:test'

import { WebexListener } from '../webex/listener'
import { WebexBotListener } from './listener'

const httpError = (): Response => new Response('', { status: 500 })
const missingWdm = (): Response =>
  new Response(JSON.stringify({ serviceLinks: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } })

async function withFetch(makeResponse: () => Response, run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch
  globalThis.fetch = mock(() => Promise.resolve(makeResponse())) as typeof fetch
  try {
    await run()
  } finally {
    globalThis.fetch = original
  }
}

describe('WebexBotListener', () => {
  it('is a WebexListener', () => {
    expect(new WebexBotListener({ getToken: () => 'token' })).toBeInstanceOf(WebexListener)
  })

  for (const [label, makeResponse] of [
    ['HTTP error', httpError],
    ['missing serviceLinks.wdm', missingWdm],
  ] as const) {
    it(`surfaces WDM discovery failures (${label}) as WebexBotError`, async () => {
      await withFetch(makeResponse, async () => {
        await expect(new WebexBotListener({ getToken: () => 'token' }).start()).rejects.toMatchObject({
          name: 'WebexBotError',
          code: 'wdm_discovery_failed',
        })
      })
    })

    it(`WebexListener surfaces WDM discovery failures (${label}) as WebexError`, async () => {
      await withFetch(makeResponse, async () => {
        await expect(new WebexListener({ getToken: () => 'token' }).start()).rejects.toMatchObject({
          name: 'WebexError',
          code: 'wdm_discovery_failed',
        })
      })
    })
  }
})
