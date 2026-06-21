export {}

declare module 'webex-message-handler' {
  import { EventEmitter } from 'events'

  import type { JWK } from 'node-jose'

  export interface Logger {
    debug(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
  }

  export const noopLogger: Logger
  export const consoleLogger: Logger

  export type NetworkMode = 'native' | 'injected'

  export interface FetchRequest {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers: Record<string, string>
    body?: string
  }

  export interface FetchResponse {
    status: number
    ok: boolean
    json(): Promise<unknown>
    text(): Promise<string>
  }

  export type FetchFunction = (request: FetchRequest) => Promise<FetchResponse>

  export interface InjectedWebSocket {
    send(data: string): void
    close(code?: number): void
    readonly readyState: number
    on(event: 'message', listener: (data: string) => void): void
    on(event: 'open', listener: () => void): void
    on(event: 'close', listener: (code: number, reason: string) => void): void
    on(event: 'error', listener: (error: Error) => void): void
  }

  export type WebSocketFactory = (url: string) => InjectedWebSocket

  export interface WebexMessageHandlerConfig {
    token: string
    logger?: Logger
    /** Networking mode: 'native' uses built-in fetch/WebSocket, 'injected' uses provided functions */
    mode?: NetworkMode
    /**
     * Optional undici Dispatcher for native mode proxy support (HTTP + WebSocket).
     * A single `ProxyAgent` proxies both `fetch()` and the native `WebSocket`.
     * Example: `new ProxyAgent('http://proxy:8080')`
     */
    dispatcher?: object
    /** Custom fetch function for all HTTP requests (injected mode) */
    fetch?: FetchFunction
    /** Custom WebSocket factory (injected mode) */
    webSocketFactory?: WebSocketFactory
    /** Automatically filter out messages sent by this bot to prevent loops (default: true) */
    ignoreSelfMessages?: boolean
    /** Ping interval in ms (default: 15000) */
    pingInterval?: number
    /** Pong timeout in ms (default: 14000) */
    pongTimeout?: number
    /** Max reconnect backoff in ms (default: 32000) */
    reconnectBackoffMax?: number
    /** Max reconnect attempts before giving up (default: 10) */
    maxReconnectAttempts?: number
    /** Optional metrics callback for timing events (no overhead if not set) */
    metricsCallback?: MetricsCallback
  }

  export interface PersonInfo {
    /** Person's unique ID */
    id: string
    /** Person's email address */
    emails: string[]
    /** Person's display name */
    displayName: string
    /** Person type (person or bot) */
    type: 'person' | 'bot'
  }

  export interface DeviceRegistration {
    /** The Mercury WebSocket URL */
    webSocketUrl: string
    /** The device URL (used as clientId for KMS) */
    deviceUrl: string
    /** The bot's user ID */
    userId: string
    /** Service catalog from WDM */
    services: Record<string, string>
    /** Encryption service URL extracted from services */
    encryptionServiceUrl: string
  }

  export interface MercuryActor {
    id: string
    objectType: string
    emailAddress?: string
  }

  export interface MercuryObject {
    id: string
    objectType: string
    displayName?: string
    content?: string
    encryptionKeyUrl?: string
    /** Card form input values (present on cardAction/submit activities). */
    inputs?: Record<string, unknown>
    /** File URLs attached to the message (present on file-share messages). */
    files?: string[]
  }

  export interface MercuryTarget {
    id: string
    objectType: string
    encryptionKeyUrl?: string
    tags?: string[]
  }

  export interface MercuryParent {
    id: string
    type: string
  }

  export interface MercuryActivity {
    id: string
    /** Full Conversation-service activity URL, when present on the raw activity. */
    url?: string
    verb: string
    actor: MercuryActor
    object: MercuryObject
    target: MercuryTarget
    published: string
    encryptionKeyUrl?: string
    parent?: MercuryParent
  }

  export interface MercuryEnvelope {
    id: string
    data: {
      eventType: string
      activity: MercuryActivity
    }
    timestamp: number
    trackingId: string
    sequenceNumber?: number
  }

  export interface DecryptedMessage {
    /** Mercury activity UUID. Works as parentId for threaded replies. */
    id: string
    /** Raw UUID ref for `id`. */
    ref: string
    /**
     * Full Conversation-service activity URL, when present on the raw Mercury
     * activity (e.g. for an outbound "acknowledge" read-receipt). Undefined if
     * Mercury did not include it.
     */
    url?: string
    /** Parent activity UUID for threaded replies. Undefined if not a thread reply. */
    parentId?: string
    /** Raw UUID ref for `parentId`. Undefined when `parentId` is absent. */
    parentRef?: string
    roomId: string
    /** Raw UUID ref for `roomId`. */
    roomRef: string
    personId: string
    /** Raw UUID ref for `personId`. */
    personRef: string
    personEmail: string
    text: string
    html?: string
    created: string
    roomType?: string
    /** Person UUIDs mentioned via @mention in the message. */
    mentionedPeople: string[]
    /** Raw UUID refs for `mentionedPeople`, index-aligned. */
    mentionedPeopleRefs: string[]
    /** Group mention types (e.g. "all") in the message. */
    mentionedGroups: string[]
    /** File URLs attached to the message. Empty if no files. */
    files: string[]
    raw: MercuryActivity
  }

  export interface DeletedMessage {
    messageId: string
    /** Raw UUID ref for `messageId`. */
    messageRef: string
    roomId: string
    /** Raw UUID ref for `roomId`. */
    roomRef: string
    personId: string
    /** Raw UUID ref for `personId`. */
    personRef: string
  }

  export interface MembershipActivity {
    /** Activity ID (raw Mercury activity UUID). */
    id: string
    /** Raw UUID ref for `id`. Equal to `id` since the activity id is already raw. */
    ref: string
    /** ID of the person who performed the action. */
    actorId: string
    /** Raw UUID ref for `actorId`. */
    actorRef: string
    /** ID of the member affected. */
    personId: string
    /** Raw UUID ref for `personId`. */
    personRef: string
    /** Conversation/space ID. */
    roomId: string
    /** Raw UUID ref for `roomId`. */
    roomRef: string
    /** Membership action: "add", "leave", "assignModerator", or "unassignModerator". */
    action: string
    /** ISO 8601 timestamp. */
    created: string
    /** "direct", "group", or undefined. */
    roomType?: string
    /** Full raw activity for advanced use. */
    raw: MercuryActivity
  }

  export interface AttachmentAction {
    /** Activity ID. */
    id: string
    /** Raw UUID ref for `id`. */
    ref: string
    /** ID of the message the card was attached to. */
    messageId: string
    /** Raw UUID ref for `messageId`. Empty when `messageId` is empty. */
    messageRef: string
    /** ID of the person who submitted the card. */
    personId: string
    /** Raw UUID ref for `personId`. */
    personRef: string
    /** Email of the person who submitted the card. */
    personEmail: string
    /** Conversation/space ID. */
    roomId: string
    /** Raw UUID ref for `roomId`. */
    roomRef: string
    /** Card form input values. */
    inputs: Record<string, unknown>
    /** ISO 8601 timestamp. */
    created: string
    /** Full raw activity for advanced use. */
    raw: MercuryActivity
  }

  export interface RoomActivity {
    /** Activity ID (raw Mercury activity UUID). */
    id: string
    /** Raw UUID ref for `id`. Equal to `id` since the activity id is already raw. */
    ref: string
    /** Conversation/space ID. */
    roomId: string
    /** Raw UUID ref for `roomId`. */
    roomRef: string
    /** ID of the person who performed the action. */
    actorId: string
    /** Raw UUID ref for `actorId`. */
    actorRef: string
    /** Room action: "created" or "updated". */
    action: string
    /** ISO 8601 timestamp. */
    created: string
    /** Full raw activity for advanced use. */
    raw: MercuryActivity
  }

  export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected'

  export interface HandlerStatus {
    /** Overall connection state. */
    status: ConnectionStatus
    /** Whether the WebSocket is currently open. */
    webSocketOpen: boolean
    /** Whether the KMS encryption context is initialized. */
    kmsInitialized: boolean
    /** Whether the device is registered with WDM. */
    deviceRegistered: boolean
    /** Current auto-reconnect attempt number (0 if not reconnecting). */
    reconnectAttempt: number
  }

  export interface MetricsEvent {
    /** Metric name: "connect", "kms_fetch", or "decrypt". */
    name: string
    /** Duration in milliseconds. */
    durationMs: number
    /** Whether the operation succeeded. */
    success: boolean
    /** Optional context metadata (e.g., key URI for kms_fetch). */
    metadata?: Record<string, string>
  }

  export type MetricsCallback = (event: MetricsEvent) => void

  export interface WebexMessageHandlerEvents {
    'message:created': (msg: DecryptedMessage) => void
    'message:updated': (msg: DecryptedMessage) => void
    'message:deleted': (data: DeletedMessage) => void
    'membership:created': (activity: MembershipActivity) => void
    'attachmentAction:created': (action: AttachmentAction) => void
    'room:created': (activity: RoomActivity) => void
    'room:updated': (activity: RoomActivity) => void
    connected: () => void
    disconnected: (reason: string) => void
    reconnecting: (attempt: number) => void
    error: (err: Error) => void
  }

  interface TypedEventEmitter<T> {
    on<K extends keyof T>(event: K, listener: T[K]): this
    emit<K extends keyof T>(
      event: K,
      ...args: Parameters<T[K] extends (...a: infer P) => unknown ? (...a: P) => unknown : never>
    ): boolean
    off<K extends keyof T>(event: K, listener: T[K]): this
    once<K extends keyof T>(event: K, listener: T[K]): this
    removeAllListeners<K extends keyof T>(event?: K): this
  }

  export class WebexMessageHandler extends EventEmitter implements TypedEventEmitter<WebexMessageHandlerEvents> {
    constructor(config: WebexMessageHandlerConfig)
    connect(): Promise<void>
    disconnect(): Promise<void>
    reconnect(newToken: string): Promise<void>
    get connected(): boolean
    status(): HandlerStatus
    deviceRegistration(): DeviceRegistration | null
    serviceUrl(name: string): string | undefined
    on<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
    emit<K extends keyof WebexMessageHandlerEvents>(
      event: K,
      ...args: Parameters<
        WebexMessageHandlerEvents[K] extends (...a: infer P) => unknown ? (...a: P) => unknown : never
      >
    ): boolean
    off<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
    once<K extends keyof WebexMessageHandlerEvents>(event: K, listener: WebexMessageHandlerEvents[K]): this
    removeAllListeners<K extends keyof WebexMessageHandlerEvents>(event?: K): this
  }

  type HttpDoFn = (request: FetchRequest) => Promise<FetchResponse>

  export interface DeviceManagerOptions {
    logger?: Logger
    httpDo: HttpDoFn
  }

  export class DeviceManager {
    constructor(options: DeviceManagerOptions)
    register(token: string): Promise<DeviceRegistration>
    refresh(token: string): Promise<DeviceRegistration>
    unregister(token: string): Promise<void>
  }

  export interface MercurySocketOptions {
    logger?: Logger
    wsFactory: WebSocketFactory
    pingInterval?: number
    pongTimeout?: number
    reconnectBackoffMax?: number
    maxReconnectAttempts?: number
  }

  export class MercurySocket extends EventEmitter {
    constructor(options: MercurySocketOptions)
    connect(url: string, token: string): Promise<void>
    disconnect(): Promise<void>
    get connected(): boolean
    get currentReconnectAttempts(): number
    on(event: 'kms:response', handler: (data: unknown) => void): this
  }

  export interface KmsClientConfig {
    token: string
    deviceUrl: string
    userId: string
    encryptionServiceUrl: string
    logger?: Logger
    httpDo: HttpDoFn
  }

  export class KmsClient {
    constructor(config: KmsClientConfig)
    handleKmsMessage(data: unknown): void
    initialize(): Promise<void>
    getKey(keyUri: string): Promise<JWK.Key>
  }

  export class MessageDecryptor {
    constructor({ kmsClient, logger }: { kmsClient: KmsClient; logger?: Logger })
    decryptActivity(activity: MercuryActivity): Promise<MercuryActivity>
  }

  export interface ParsedMentions {
    mentionedPeople: string[]
    mentionedGroups: string[]
  }

  export function parseMentions(html: string | undefined | null): ParsedMentions
  export function toRestId(uuid: string, type: 'MESSAGE' | 'PEOPLE' | 'ROOM'): string
  export function fromRestId(restId: string): string
}
