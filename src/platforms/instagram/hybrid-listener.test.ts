import { afterEach, describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'node:events'

import { InstagramHybridListener } from '@/platforms/instagram/hybrid-listener'
import type { InstagramRealtimeListener } from '@/platforms/instagram/realtime-listener'

function makeRealtimeFailingClient() {
  return {
    getUserId: () => '123',
    getSessionState: () => {
      throw new Error('realtime bootstrap failed')
    },
    fetchIrisBootstrap: async () => {
      throw new Error('realtime bootstrap failed')
    },
    listChats: mock(async () => []),
  } as never
}

class FakeRealtimeListener {
  private emitter = new EventEmitter()
  stopped = false

  on(event: string, handler: (...args: unknown[]) => void) {
    this.emitter.on(event, handler)
    return this
  }
  off() {
    return this
  }
  once() {
    return this
  }
  async start() {
    this.emitter.emit('connected', { userId: '123' })
  }
  stop() {
    this.stopped = true
    this.emitter.emit('disconnected')
  }
  fail() {
    this.emitter.emit('error', new Error('realtime connection lost'))
  }
}

class TestableHybridListener extends InstagramHybridListener {
  lastFake: FakeRealtimeListener | null = null
  protected override createRealtimeListener(): InstagramRealtimeListener {
    const fake = new FakeRealtimeListener()
    this.lastFake = fake
    return fake as unknown as InstagramRealtimeListener
  }
}

describe('InstagramHybridListener', () => {
  let listener: InstagramHybridListener

  afterEach(() => {
    listener?.stop()
  })

  it('falls back to polling and emits a single error when realtime startup fails', async () => {
    const client = makeRealtimeFailingClient()
    listener = new InstagramHybridListener(client, {
      pollInterval: 60_000,
      realtimeRetryBaseMs: 60_000,
      realtimeRetryMaxMs: 60_000,
    })

    const errors: Error[] = []
    listener.on('error', (err) => errors.push(err))

    const connected = new Promise<{ userId: string; transport: string }>((resolve) => {
      listener.on('connected', resolve)
    })

    await listener.start()
    const info = await connected

    // given a realtime failure, when startup fails, then it falls back to polling
    expect(info.transport).toBe('polling')
    // and the failure is reported exactly once (no recursive re-entry)
    expect(errors).toHaveLength(1)
  })

  it('falls back to polling exactly once when a connected realtime listener fails', async () => {
    const client = {
      getUserId: () => '123',
      listChats: mock(async () => []),
    } as never
    const testable = new TestableHybridListener(client, {
      pollInterval: 60_000,
      realtimeRetryBaseMs: 60_000,
      realtimeRetryMaxMs: 60_000,
    })
    listener = testable

    const errors: Error[] = []
    const transports: string[] = []
    testable.on('error', (err) => errors.push(err))
    testable.on('connected', ({ transport }) => transports.push(transport))

    await testable.start()
    // given an established realtime connection
    expect(transports).toContain('realtime')

    const pollingConnected = new Promise<void>((resolve) => {
      testable.on('connected', ({ transport }) => {
        if (transport === 'polling') resolve()
      })
    })

    // when the connected realtime listener fails
    testable.lastFake!.fail()
    await pollingConnected

    // then the failure is reported once and it falls back to polling without recursion
    expect(errors).toHaveLength(1)
    expect(transports.filter((t) => t === 'polling')).toHaveLength(1)
  })

  it('uses polling directly when realtime is disabled', async () => {
    const client = makeRealtimeFailingClient()
    listener = new InstagramHybridListener(client, { pollInterval: 60_000, disableRealtime: true })

    const connected = new Promise<{ transport: string }>((resolve) => {
      listener.on('connected', resolve)
    })

    await listener.start()
    const info = await connected

    expect(info.transport).toBe('polling')
  })
})
