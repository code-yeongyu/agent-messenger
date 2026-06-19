import { describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'events'

import type {
  DecryptedMessage,
  HandlerStatus,
  MercuryActivity,
  WebexMessageHandlerConfig,
  WebexMessageHandlerEvents,
} from 'webex-message-handler'

import { toRestId } from './id-normalizer'
import { WebexBotListener } from './listener'

const STATUS: HandlerStatus = {
  status: 'connected',
  webSocketOpen: true,
  kmsInitialized: true,
  deviceRegistered: true,
  reconnectAttempt: 0,
}

const RAW_ACTIVITY: MercuryActivity = {
  id: 'activity-123',
  verb: 'post',
  actor: { id: 'person-123', objectType: 'person', emailAddress: 'user@example.com' },
  object: { id: 'object-123', objectType: 'comment', displayName: 'hello' },
  target: { id: 'room-123', objectType: 'conversation' },
  published: '2024-01-01T00:00:00Z',
}

const MESSAGE: DecryptedMessage = {
  id: 'message-123',
  roomId: 'room-123',
  personId: 'person-123',
  personEmail: 'user@example.com',
  text: 'hello',
  created: '2024-01-01T00:00:00Z',
  mentionedPeople: [],
  mentionedGroups: [],
  files: [],
  raw: RAW_ACTIVITY,
}

class FakeWebexMessageHandler extends EventEmitter {
  connect = mock(() => Promise.resolve())
  disconnect = mock(() => Promise.resolve())
  connected = true

  status(): HandlerStatus {
    return STATUS
  }

  override on<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this {
    return super.on(event, listener)
  }

  override off<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this {
    return super.off(event, listener)
  }

  override once<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this {
    return super.once(event, listener)
  }
}

describe('WebexBotListener', () => {
  it('bridges handler message events and webex_event', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })
    const messageCreated = mock((_event: DecryptedMessage) => undefined)
    const webexEvent = mock((_event: DecryptedMessage) => undefined)
    listener.on('message_created', messageCreated)
    listener.on('webex_event', webexEvent)

    await listener.start()
    handler.emit('message:created', MESSAGE)

    const expected = expect.objectContaining({
      id: toRestId('message-123', 'MESSAGE'),
      roomId: toRestId('room-123', 'ROOM'),
      personId: toRestId('person-123', 'PEOPLE'),
      personEmail: 'user@example.com',
      text: 'hello',
      raw: RAW_ACTIVITY,
    })
    expect(messageCreated).toHaveBeenCalledWith(expected)
    expect(webexEvent).toHaveBeenCalledWith(expected)
  })

  it('stop calls handler disconnect', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })

    await listener.start()
    await listener.stop()

    expect(handler.disconnect).toHaveBeenCalled()
  })

  it('start is idempotent', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })

    await listener.start()
    await listener.start()

    expect(handler.connect).toHaveBeenCalledTimes(1)
  })

  it('start rethrows and resets state when connect fails, allowing retry', async () => {
    const failing = new FakeWebexMessageHandler()
    failing.connect = mock(() => Promise.reject(new Error('device registration failed')))
    const ok = new FakeWebexMessageHandler()
    const handlers = [failing, ok]
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handlers.shift()!,
    })

    await expect(listener.start()).rejects.toThrow('device registration failed')
    expect(failing.disconnect).toHaveBeenCalled()

    await listener.start()
    expect(ok.connect).toHaveBeenCalledTimes(1)
  })

  it('does not throw when handler emits error with no error listener', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })
    listener.on('message_created', () => undefined)

    await listener.start()

    expect(() => handler.emit('error', new Error('boom'))).not.toThrow()
  })

  it('ignores stale handler events after stop', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })
    const messageCreated = mock((_event: DecryptedMessage) => undefined)
    listener.on('message_created', messageCreated)

    await listener.start()
    await listener.stop()
    handler.emit('message:created', MESSAGE)

    expect(messageCreated).not.toHaveBeenCalled()
  })

  it('start-stop-start does not cross-talk between handlers', async () => {
    const first = new FakeWebexMessageHandler()
    const second = new FakeWebexMessageHandler()
    const handlers = [first, second]
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handlers.shift()!,
    })
    const messageCreated = mock((_event: DecryptedMessage) => undefined)
    listener.on('message_created', messageCreated)

    await listener.start()
    await listener.stop()
    await listener.start()

    first.emit('message:created', MESSAGE)
    expect(messageCreated).not.toHaveBeenCalled()

    second.emit('message:created', MESSAGE)
    expect(messageCreated).toHaveBeenCalledTimes(1)
  })

  it('preserves disconnected reason', async () => {
    const handler = new FakeWebexMessageHandler()
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })
    const disconnected = mock((_reason: string) => undefined)
    listener.on('disconnected', disconnected)

    await listener.start()
    handler.emit('disconnected', 'network lost')

    expect(disconnected).toHaveBeenCalledWith('network lost')
  })

  it('concurrent start() calls share the same connect failure', async () => {
    const handler = new FakeWebexMessageHandler()
    handler.connect = mock(() => Promise.reject(new Error('connect failed')))
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })

    const first = listener.start()
    const second = listener.start()
    const firstResult = first.then(
      () => 'ok',
      (e: Error) => e.message,
    )
    const secondResult = second.then(
      () => 'ok',
      (e: Error) => e.message,
    )

    expect(await firstResult).toBe('connect failed')
    expect(await secondResult).toBe('connect failed')
    expect(handler.connect).toHaveBeenCalledTimes(1)
  })

  it('disconnects a handler whose connect resolves after stop', async () => {
    const handler = new FakeWebexMessageHandler()
    let resolveConnect: () => void = () => undefined
    handler.connect = mock(() => new Promise<void>((resolve) => (resolveConnect = resolve)))
    const client = { getToken: () => 'token123' }
    const listener = new WebexBotListener(client, {
      _handlerFactory: (_config: WebexMessageHandlerConfig) => handler,
    })

    const starting = listener.start()
    const stopping = listener.stop()
    resolveConnect()
    await Promise.all([starting, stopping])

    expect(handler.disconnect).toHaveBeenCalled()
  })
})
