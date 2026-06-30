import { describe, expect, it } from 'bun:test'

import { InstagramRealtimeListener } from '@/platforms/instagram/realtime-listener'

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    getUserId: () => '123',
    getSessionState: () => ({}) as never,
    fetchIrisBootstrap: async () => ({ seqId: 1, snapshotAtMs: 1 }),
    ...overrides,
  } as never
}

describe('InstagramRealtimeListener', () => {
  it('stays restartable after a bootstrap failure', async () => {
    let calls = 0
    const client = makeClient({
      fetchIrisBootstrap: async () => {
        calls++
        throw new Error('bootstrap failed')
      },
    })
    const listener = new InstagramRealtimeListener(client)

    // given a failing bootstrap, when start() rejects, then running must be reset
    await expect(listener.start()).rejects.toThrow('bootstrap failed')

    // when start() is called again, then it must retry rather than no-op at the guard
    await expect(listener.start()).rejects.toThrow('bootstrap failed')
    expect(calls).toBe(2)

    listener.stop()
  })
})
