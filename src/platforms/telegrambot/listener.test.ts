import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { TelegramBotClient } from './client'
import { TelegramBotListener } from './listener'
import type { TelegramBotUser, TelegramUpdate } from './types'
import { TelegramBotError } from './types'

interface FakeClient {
  deleteWebhook: () => Promise<boolean>
  getMe: () => Promise<TelegramBotUser>
  getUpdates: (options?: unknown, signal?: AbortSignal) => Promise<TelegramUpdate[]>
}

const ME: TelegramBotUser = {
  id: 1,
  is_bot: true,
  first_name: 'Test Bot',
  username: 'testbot',
}

function makeFakeClient(overrides: Partial<FakeClient> = {}): TelegramBotClient {
  const base: FakeClient = {
    deleteWebhook: async () => true,
    getMe: async () => ME,
    getUpdates: async () => [],
    ...overrides,
  }
  return base as unknown as TelegramBotClient
}

function flush(ms = 5): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pendingWithAbort(signal?: AbortSignal): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      return
    }
    signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), {
      once: true,
    })
  })
}

describe('TelegramBotListener', () => {
  let listener: TelegramBotListener | null = null

  beforeEach(() => {
    listener = null
  })

  afterEach(() => {
    listener?.stop()
  })

  it('emits "connected" with bot user after start()', async () => {
    let connectedUser: TelegramBotUser | null = null
    const client = makeFakeClient({
      getUpdates: (_options, signal) => pendingWithAbort(signal),
    })

    listener = new TelegramBotListener(client)
    listener.on('connected', ({ user }) => {
      connectedUser = user
    })

    await listener.start()
    await flush()

    expect(connectedUser).not.toBeNull()
    expect(connectedUser!.username).toBe('testbot')
  })

  it('deletes webhook before polling and forwards dropPendingUpdates', async () => {
    let deleteWebhookCalls: Array<{ drop_pending_updates?: boolean } | undefined> = []
    const client = {
      deleteWebhook: async (opts?: { drop_pending_updates?: boolean }) => {
        deleteWebhookCalls.push(opts)
        return true
      },
      getMe: async () => ME,
      getUpdates: (_options: unknown, signal?: AbortSignal) => pendingWithAbort(signal),
    } as unknown as TelegramBotClient

    listener = new TelegramBotListener(client, { dropPendingUpdates: true })
    await listener.start()
    await flush()

    expect(deleteWebhookCalls).toHaveLength(1)
    expect(deleteWebhookCalls[0]).toEqual({ drop_pending_updates: true })
  })

  it('dispatches message updates', async () => {
    const messages: string[] = []
    let pollCount = 0

    const client = makeFakeClient({
      getUpdates: (_options, signal) => {
        pollCount++
        if (pollCount === 1) {
          return Promise.resolve([
            {
              update_id: 100,
              message: {
                message_id: 1,
                date: 1,
                chat: { id: 99, type: 'private' as const, first_name: 'Alice' },
                text: 'hello',
              },
            },
          ])
        }
        return pendingWithAbort(signal)
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('message', (msg) => {
      if (msg.text) messages.push(msg.text)
    })

    await listener.start()
    await flush(20)

    expect(messages).toEqual(['hello'])
  })

  it('advances offset to update_id + 1 after processing', async () => {
    const offsetsSeen: Array<number | undefined> = []
    let pollCount = 0

    const client = makeFakeClient({
      getUpdates: (options, signal) => {
        pollCount++
        const offset = (options as { offset?: number } | undefined)?.offset
        offsetsSeen.push(offset)
        if (pollCount === 1) {
          return Promise.resolve([
            {
              update_id: 100,
              message: {
                message_id: 1,
                date: 1,
                chat: { id: 99, type: 'private' as const, first_name: 'A' },
                text: 'a',
              },
            },
            {
              update_id: 101,
              message: {
                message_id: 2,
                date: 2,
                chat: { id: 99, type: 'private' as const, first_name: 'A' },
                text: 'b',
              },
            },
          ])
        }
        return pendingWithAbort(signal)
      },
    })

    listener = new TelegramBotListener(client)
    await listener.start()
    await flush(20)

    expect(offsetsSeen[0]).toBe(0)
    expect(offsetsSeen[1]).toBe(102)
  })

  it('emits telegram_update for every update (catch-all)', async () => {
    let count = 0
    let pollCount = 0

    const client = makeFakeClient({
      getUpdates: async () => {
        pollCount++
        if (pollCount === 1) {
          return [{ update_id: 1, callback_query: { id: 'q', from: ME, chat_instance: 'ci', data: 'click' } }]
        }
        return new Promise(() => {})
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('telegram_update', () => {
      count++
    })

    await listener.start()
    await flush(20)

    expect(count).toBe(1)
  })

  it('stops on fatal Unauthorized error', async () => {
    let errorCaught: Error | null = null
    const client = makeFakeClient({
      getUpdates: async () => {
        throw new TelegramBotError('Unauthorized', 'unauthorized')
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('error', (err) => {
      errorCaught = err
    })

    await listener.start()
    await flush(20)

    expect(errorCaught).not.toBeNull()
    expect((errorCaught as unknown as TelegramBotError).code).toBe('unauthorized')
  })

  it('emits disconnected on transient errors', async () => {
    let disconnectedCount = 0
    let pollCount = 0

    const client = makeFakeClient({
      getUpdates: (_options, signal) => {
        pollCount++
        if (pollCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return pendingWithAbort(signal)
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('disconnected', () => {
      disconnectedCount++
    })

    await listener.start()
    await flush(50)

    expect(disconnectedCount).toBeGreaterThanOrEqual(1)
  })

  it('stop() aborts in-flight getUpdates and halts polling', async () => {
    let pollStarts = 0
    let aborted = false

    const client = makeFakeClient({
      getUpdates: (_options, signal) => {
        pollStarts++
        return new Promise<never>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              aborted = true
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
            },
            { once: true },
          )
        })
      },
    })

    listener = new TelegramBotListener(client)
    await listener.start()
    await flush()

    expect(pollStarts).toBe(1)

    listener.stop()
    await flush(20)

    expect(aborted).toBe(true)
    expect(pollStarts).toBe(1)
  })

  it('on/off/once chain returns this', () => {
    const client = makeFakeClient()
    listener = new TelegramBotListener(client)
    const fn = (): void => {}
    expect(listener.on('message', fn)).toBe(listener)
    expect(listener.off('message', fn)).toBe(listener)
    expect(listener.once('message', fn)).toBe(listener)
  })

  it('emits chat_member and my_chat_member as distinct events', async () => {
    const myChatMemberEvents: unknown[] = []
    const chatMemberEvents: unknown[] = []
    let pollCount = 0

    const memberPayload = {
      chat: { id: 1, type: 'private' as const, first_name: 'A' },
      from: ME,
      date: 1,
      old_chat_member: { user: ME, status: 'member' as const },
      new_chat_member: { user: ME, status: 'administrator' as const },
    }

    const client = makeFakeClient({
      getUpdates: (_options, signal) => {
        pollCount++
        if (pollCount === 1) {
          return Promise.resolve([
            { update_id: 1, my_chat_member: memberPayload },
            { update_id: 2, chat_member: memberPayload },
          ])
        }
        return pendingWithAbort(signal)
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('my_chat_member', (e) => myChatMemberEvents.push(e))
    listener.on('chat_member', (e) => chatMemberEvents.push(e))

    await listener.start()
    await flush(20)

    expect(myChatMemberEvents).toHaveLength(1)
    expect(chatMemberEvents).toHaveLength(1)
  })

  it('user handler exception does not stop polling and surfaces via error event', async () => {
    let messageCount = 0
    let errorCount = 0
    let pollCount = 0

    const client = makeFakeClient({
      getUpdates: (_options, signal) => {
        pollCount++
        if (pollCount === 1) {
          return Promise.resolve([
            {
              update_id: 1,
              message: {
                message_id: 1,
                date: 1,
                chat: { id: 1, type: 'private' as const, first_name: 'A' },
                text: 'first',
              },
            },
            {
              update_id: 2,
              message: {
                message_id: 2,
                date: 2,
                chat: { id: 1, type: 'private' as const, first_name: 'A' },
                text: 'second',
              },
            },
          ])
        }
        return pendingWithAbort(signal)
      },
    })

    listener = new TelegramBotListener(client)
    listener.on('message', (msg) => {
      messageCount++
      if (msg.text === 'first') {
        throw new Error('handler boom')
      }
    })
    listener.on('error', () => {
      errorCount++
    })

    await listener.start()
    await flush(20)

    expect(messageCount).toBe(2)
    expect(errorCount).toBeGreaterThanOrEqual(1)
  })

  it('propagates AbortError from getUpdates through the listener cleanly', async () => {
    let aborted = false
    const client = makeFakeClient({
      getUpdates: (_options, signal) =>
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              aborted = true
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
            },
            { once: true },
          )
        }),
    })

    listener = new TelegramBotListener(client)
    await listener.start()
    await flush(20)

    listener.stop()
    await flush(20)
    expect(aborted).toBe(true)
  })
})
