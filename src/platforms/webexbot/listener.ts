import { EventEmitter } from 'events'

import { WebexMessageHandler } from 'webex-message-handler'
import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  HandlerStatus,
  MembershipActivity,
  RoomActivity,
  WebexMessageHandlerConfig,
  WebexMessageHandlerEvents,
} from 'webex-message-handler'

import type { WebexBotClient } from './client'
import type { WebexBotListenerEventMap } from './types'

type EventKey = keyof WebexBotListenerEventMap
type WebexBotClientLike = Pick<WebexBotClient, 'getToken'>

interface WebexMessageHandlerLike {
  connect(): Promise<void>
  disconnect(): Promise<void>
  status(): HandlerStatus
  get connected(): boolean
  on<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
  off<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
  once<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
}

export interface WebexBotListenerOptions {
  ignoreSelfMessages?: boolean
  pingInterval?: number
  pongTimeout?: number
  reconnectBackoffMax?: number
  maxReconnectAttempts?: number
  _handlerFactory?: (config: WebexMessageHandlerConfig) => WebexMessageHandlerLike
}

export class WebexBotListener {
  private client: WebexBotClientLike
  private options: WebexBotListenerOptions
  private running = false
  private emitter = new EventEmitter()
  private handler: WebexMessageHandlerLike | null = null
  private generation = 0
  private detachHandler: (() => void) | null = null
  private startPromise: Promise<void> | null = null

  constructor(client: WebexBotClientLike, options: WebexBotListenerOptions = {}) {
    this.client = client
    this.options = options
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise
    if (this.running) return

    this.running = true
    const generation = ++this.generation

    const handler = this.createHandler()
    this.handler = handler
    this.detachHandler = this.wireHandler(handler, generation)

    let startPromise!: Promise<void>
    startPromise = (async () => {
      try {
        await handler.connect()

        if (!this.running || this.handler !== handler || this.generation !== generation) {
          await handler.disconnect().catch(() => undefined)
          return
        }
      } catch (error) {
        if (this.handler === handler && this.generation === generation) {
          this.detachHandler?.()
          this.detachHandler = null
          this.handler = null
          this.running = false
        }
        await handler.disconnect().catch(() => undefined)
        throw error
      } finally {
        if (this.startPromise === startPromise) {
          this.startPromise = null
        }
      }
    })()

    this.startPromise = startPromise
    return startPromise
  }

  async stop(): Promise<void> {
    const pendingStart = this.startPromise
    this.startPromise = null

    this.running = false
    this.generation++

    const detach = this.detachHandler
    this.detachHandler = null
    detach?.()

    const handler = this.handler
    this.handler = null
    if (handler) {
      await handler.disconnect().catch(() => undefined)
    }

    if (pendingStart) {
      await pendingStart.catch(() => undefined)
    }
  }

  on<K extends EventKey>(event: K, listener: (...args: WebexBotListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: WebexBotListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: any[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: WebexBotListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: any[]) => void)
    return this
  }

  private isCurrent(handler: WebexMessageHandlerLike, generation: number): boolean {
    return this.running && this.handler === handler && this.generation === generation
  }

  // Node's EventEmitter throws synchronously if an 'error' event is emitted with
  // no registered listener. Guard it so SDK consumers that only subscribe to
  // message events are never crashed by a transient connection error.
  private emitError(error: Error): void {
    if (this.emitter.listenerCount('error') > 0) {
      this.emitter.emit('error', error)
    }
  }

  private createHandler(): WebexMessageHandlerLike {
    const config: WebexMessageHandlerConfig = { token: this.client.getToken() }
    if (this.options.ignoreSelfMessages !== undefined) config.ignoreSelfMessages = this.options.ignoreSelfMessages
    if (this.options.pingInterval !== undefined) config.pingInterval = this.options.pingInterval
    if (this.options.pongTimeout !== undefined) config.pongTimeout = this.options.pongTimeout
    if (this.options.reconnectBackoffMax !== undefined) config.reconnectBackoffMax = this.options.reconnectBackoffMax
    if (this.options.maxReconnectAttempts !== undefined) config.maxReconnectAttempts = this.options.maxReconnectAttempts
    return this.options._handlerFactory?.(config) ?? new WebexMessageHandler(config)
  }

  private wireHandler(handler: WebexMessageHandlerLike, generation: number): () => void {
    const onMessageCreated = (event: DecryptedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('message_created', event)
      this.emitter.emit('webex_event', event)
    }
    const onMessageUpdated = (event: DecryptedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('message_updated', event)
      this.emitter.emit('webex_event', event)
    }
    const onMessageDeleted = (event: DeletedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('message_deleted', event)
      this.emitter.emit('webex_event', event)
    }
    const onMembershipCreated = (event: MembershipActivity) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('membership_created', event)
      this.emitter.emit('webex_event', event)
    }
    const onAttachmentAction = (event: AttachmentAction) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('attachment_action', event)
      this.emitter.emit('webex_event', event)
    }
    const onRoomCreated = (event: RoomActivity) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('room_created', event)
      this.emitter.emit('webex_event', event)
    }
    const onRoomUpdated = (event: RoomActivity) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('room_updated', event)
      this.emitter.emit('webex_event', event)
    }
    const onConnected = () => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('connected', { connected: handler.connected, status: handler.status() })
    }
    const onReconnecting = (attempt: number) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('reconnecting', attempt)
    }
    const onDisconnected = (reason: string) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitter.emit('disconnected', reason)
    }
    const onError = (error: Error) => {
      if (!this.isCurrent(handler, generation)) return
      this.emitError(error)
    }

    handler.on('message:created', onMessageCreated)
    handler.on('message:updated', onMessageUpdated)
    handler.on('message:deleted', onMessageDeleted)
    handler.on('membership:created', onMembershipCreated)
    handler.on('attachmentAction:created', onAttachmentAction)
    handler.on('room:created', onRoomCreated)
    handler.on('room:updated', onRoomUpdated)
    handler.on('connected', onConnected)
    handler.on('reconnecting', onReconnecting)
    handler.on('disconnected', onDisconnected)
    handler.on('error', onError)

    return () => {
      handler.off('message:created', onMessageCreated)
      handler.off('message:updated', onMessageUpdated)
      handler.off('message:deleted', onMessageDeleted)
      handler.off('membership:created', onMembershipCreated)
      handler.off('attachmentAction:created', onAttachmentAction)
      handler.off('room:created', onRoomCreated)
      handler.off('room:updated', onRoomUpdated)
      handler.off('connected', onConnected)
      handler.off('reconnecting', onReconnecting)
      handler.off('disconnected', onDisconnected)
      handler.off('error', onError)
    }
  }
}
