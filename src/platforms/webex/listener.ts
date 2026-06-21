import { EventEmitter } from 'events'

import { WebexMessageHandler } from 'webex-message-handler'
import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  HandlerStatus,
  InjectedWebSocket,
  MembershipActivity,
  RoomActivity,
  WebexMessageHandlerConfig,
  WebexMessageHandlerEvents,
} from 'webex-message-handler'
import WebSocket from 'ws'

import {
  normalizeAttachmentAction,
  normalizeDeletedMessage,
  normalizeMembership,
  normalizeMessage,
  normalizeRoomActivity,
} from './id-normalizer'
import type {
  WebexAttachmentActionEvent,
  WebexDeletedMessageEvent,
  WebexMembershipEvent,
  WebexMessageEvent,
  WebexRealtimeEvent,
  WebexRoomEvent,
} from './types'
import { createWdmRewriteFetch, discoverWdmDevicesUrl } from './wdm-discovery'

type EventKey = keyof WebexListenerEventMap

export interface WebexListenerClient {
  getToken(): string
}

interface WebexMessageHandlerLike {
  connect(): Promise<void>
  disconnect(): Promise<void>
  status(): HandlerStatus
  get connected(): boolean
  on<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
  off<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
  once<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
}

export interface WebexListenerOptions {
  ignoreSelfMessages?: boolean
  pingInterval?: number
  pongTimeout?: number
  reconnectBackoffMax?: number
  maxReconnectAttempts?: number
  _handlerFactory?: (config: WebexMessageHandlerConfig) => WebexMessageHandlerLike
}

export interface WebexListenerEventMap {
  message_created: [event: WebexMessageEvent]
  message_updated: [event: WebexMessageEvent]
  message_deleted: [event: WebexDeletedMessageEvent]
  membership_created: [event: WebexMembershipEvent]
  attachment_action: [event: WebexAttachmentActionEvent]
  room_created: [event: WebexRoomEvent]
  room_updated: [event: WebexRoomEvent]
  webex_event: [event: WebexRealtimeEvent]
  connected: [info: { connected: boolean; status: HandlerStatus }]
  reconnecting: [attempt: number]
  disconnected: [reason: string]
  error: [error: Error]
}

export class WebexListener {
  private client: WebexListenerClient
  private options: WebexListenerOptions
  private running = false
  private emitter = new EventEmitter()
  private handler: WebexMessageHandlerLike | null = null
  private generation = 0
  private detachHandler: (() => void) | null = null
  private startPromise: Promise<void> | null = null

  constructor(client: WebexListenerClient, options: WebexListenerOptions = {}) {
    this.client = client
    this.options = options
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise
    if (this.running) return

    this.running = true
    const generation = ++this.generation

    let startPromise!: Promise<void>
    startPromise = (async () => {
      let handler: WebexMessageHandlerLike | null = null
      try {
        handler = await this.createHandler()

        if (!this.running || this.generation !== generation) {
          await handler.disconnect().catch(() => undefined)
          return
        }
        this.handler = handler
        this.detachHandler = this.wireHandler(handler, generation)

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
        }
        if (this.generation === generation) {
          this.running = false
        }
        await handler?.disconnect().catch(() => undefined)
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

  on<K extends EventKey>(event: K, listener: (...args: WebexListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: WebexListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: WebexListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void)
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

  private async createHandler(): Promise<WebexMessageHandlerLike> {
    const token = this.client.getToken()
    const config: WebexMessageHandlerConfig = { token }
    if (this.options.ignoreSelfMessages !== undefined) config.ignoreSelfMessages = this.options.ignoreSelfMessages
    if (this.options.pingInterval !== undefined) config.pingInterval = this.options.pingInterval
    if (this.options.pongTimeout !== undefined) config.pongTimeout = this.options.pongTimeout
    if (this.options.reconnectBackoffMax !== undefined) config.reconnectBackoffMax = this.options.reconnectBackoffMax
    if (this.options.maxReconnectAttempts !== undefined) config.maxReconnectAttempts = this.options.maxReconnectAttempts

    if (this.options._handlerFactory) {
      return this.options._handlerFactory(config)
    }

    const wdmDevicesUrl = await discoverWdmDevicesUrl(token)
    config.mode = 'injected'
    config.fetch = createWdmRewriteFetch(wdmDevicesUrl)
    config.webSocketFactory = (url: string) => new WebSocket(url) as unknown as InjectedWebSocket
    return new WebexMessageHandler(config)
  }

  private wireHandler(handler: WebexMessageHandlerLike, generation: number): () => void {
    const onMessageCreated = (event: DecryptedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeMessage(event)
      this.emitter.emit('message_created', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onMessageUpdated = (event: DecryptedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeMessage(event)
      this.emitter.emit('message_updated', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onMessageDeleted = (event: DeletedMessage) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeDeletedMessage(event)
      this.emitter.emit('message_deleted', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onMembershipCreated = (event: MembershipActivity) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeMembership(event)
      this.emitter.emit('membership_created', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onAttachmentAction = (event: AttachmentAction) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeAttachmentAction(event)
      this.emitter.emit('attachment_action', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onRoomCreated = (event: RoomActivity) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeRoomActivity(event)
      this.emitter.emit('room_created', normalized)
      this.emitter.emit('webex_event', normalized)
    }
    const onRoomUpdated = (event: RoomActivity) => {
      if (!this.isCurrent(handler, generation)) return
      const normalized = normalizeRoomActivity(event)
      this.emitter.emit('room_updated', normalized)
      this.emitter.emit('webex_event', normalized)
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
