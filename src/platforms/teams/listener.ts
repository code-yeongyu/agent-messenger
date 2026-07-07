import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'

import WebSocket from 'ws'

import type { TeamsClient } from './client'
import {
  buildActivityFrame,
  buildAuthenticateFrame,
  buildEventAck,
  buildPingFrame,
  buildRequestAck,
  buildWebSocketUrl,
  decodeMessageBody,
  extractChatId,
  fetchTrouterInfo,
  fetchTrouterSessionId,
  isMessageLossFrame,
  isThreadConversation,
  parseMentions,
  parseRequestFrame,
  registerEndpoint,
  type TrouterInfo,
} from './trouter'
import { TeamsError } from './types'
import type { TeamsListenerEventMap, TeamsRealtimeMessage } from './types'

const PING_INTERVAL = 30_000
const RECONNECT_BASE_DELAY = 1_000
const RECONNECT_MAX_DELAY = 30_000
const REGISTRATION_REFRESH_INTERVAL = (86400 - 60) * 1000
const MESSAGE_CACHE_LIMIT = 500
const TEXT_MESSAGE_TYPES = new Set(['Text', 'RichText/Html'])

type EventKey = keyof TeamsListenerEventMap

interface IncomingResource {
  id?: string
  messagetype?: string
  content?: string
  from?: string
  imdisplayname?: string
  conversationLink?: string
  resourceLink?: string
  properties?: unknown
}

export class TeamsListener {
  private client: TeamsClient
  private running = false
  private ws: WebSocket | null = null
  private emitter = new EventEmitter()
  private endpointId = randomUUID()
  private idToken: string | null = null
  private info: TrouterInfo | null = null
  private sequence = 0
  private reconnectAttempts = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reregisterTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private seenMessageIds = new Set<string>()
  private channelTeamMap = new Map<string, string>()
  private channelMapRefreshing: Promise<void> | null = null
  private nonChannelThreads = new Set<string>()

  constructor(client: TeamsClient) {
    this.client = client
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.reconnectAttempts = 0
    await this.refreshChannelMap()
    await this.connect()
  }

  stop(): void {
    this.running = false
    this.clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on<K extends EventKey>(event: K, listener: (...args: TeamsListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: TeamsListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: any[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: TeamsListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: any[]) => void)
    return this
  }

  private async connect(): Promise<void> {
    if (!this.running) return

    try {
      const skypeToken = this.client.getToken()

      // Re-extract on every attempt so a reconnect after token expiry picks up
      // a fresh id_token rather than reusing the stale cached one.
      this.idToken = await this.client.getIdToken()
      if (!this.idToken) {
        throw new TeamsError(
          'Could not obtain Teams id_token for real-time auth. Ensure the Teams desktop app is logged in, then re-run "auth extract".',
          'no_id_token',
        )
      }

      const info = await fetchTrouterInfo(skypeToken, this.endpointId)
      if (!this.running) return
      const sessionId = await fetchTrouterSessionId(info, skypeToken, this.endpointId)
      if (!this.running) return

      this.info = info
      const ws = new WebSocket(buildWebSocketUrl(info, sessionId, this.endpointId), {
        headers: { 'X-Skypetoken': skypeToken, 'User-Agent': 'AgentMessenger' },
      })
      this.ws = ws

      ws.on('message', (raw) => this.handleFrame(raw.toString()))

      ws.on('close', () => {
        this.clearTimers()
        if (this.ws === ws) this.ws = null
        if (this.running) {
          this.emitter.emit('disconnected')
          this.scheduleReconnect()
        }
      })

      ws.on('error', (err) => {
        this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)))
      })
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      if (this.running) this.scheduleReconnect()
    }
  }

  private handleFrame(frame: string): void {
    if (frame.startsWith('1::')) {
      void this.onConnected()
      return
    }

    if (frame.startsWith('3:::')) {
      this.handleRequestFrame(frame)
      return
    }

    if (frame.startsWith('5:')) {
      const ack = buildEventAck(frame)
      if (ack) this.ws?.send(ack)
      if (isMessageLossFrame(frame)) void this.register()
    }
  }

  private async onConnected(): Promise<void> {
    if (!this.ws || !this.info || !this.idToken) return

    this.ws.send(buildAuthenticateFrame(this.info, this.idToken))
    this.ws.send(buildActivityFrame(++this.sequence))

    // Only report the endpoint as connected once it has actually registered;
    // an unregistered endpoint receives no messages. On failure, drop the
    // possibly-stale id_token and close so the reconnect path re-authenticates.
    const registered = await this.register()
    if (!registered) {
      this.idToken = null
      this.ws.close()
      return
    }

    this.reconnectAttempts = 0
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(buildPingFrame(++this.sequence))
    }, PING_INTERVAL)
    this.reregisterTimer = setInterval(() => void this.register(), REGISTRATION_REFRESH_INTERVAL)

    this.emitter.emit('connected', { endpointId: this.endpointId })
  }

  private async register(): Promise<boolean> {
    if (!this.info || !this.idToken) return false
    try {
      await registerEndpoint(
        this.info,
        this.client.getToken(),
        this.idToken,
        this.endpointId,
        this.client.getAccountType(),
        () => randomUUID(),
      )
      return true
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  private handleRequestFrame(frame: string): void {
    const request = parseRequestFrame(frame)
    if (!request) return

    this.ws?.send(buildRequestAck(request.id))

    if (!request.url?.endsWith('/messaging') || !request.body) return

    try {
      const decoded = decodeMessageBody(request.headers ?? {}, request.body) as {
        resourceType?: string
        resource?: IncomingResource
      }
      if (decoded.resourceType === 'NewMessage' && decoded.resource) {
        void this.emitMessage(decoded.resource).catch((error) => {
          this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
        })
      }
      this.emitter.emit('teams_event', { resourceType: decoded.resourceType ?? 'unknown', ...decoded })
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  private async emitMessage(resource: IncomingResource): Promise<void> {
    if (!resource.messagetype || !TEXT_MESSAGE_TYPES.has(resource.messagetype)) return

    const chatId = extractChatId(resource.conversationLink ?? resource.resourceLink)
    if (!chatId || !resource.id) return

    // Dedup before the async classification so duplicate frames don't trigger
    // redundant channel-map refreshes.
    if (this.seenMessageIds.has(resource.id)) return
    this.rememberMessageId(resource.id)

    const classification = await this.classifyConversation(chatId)
    if (!this.running) return

    const rawContent = resource.content ?? ''
    const message: TeamsRealtimeMessage = {
      id: resource.id,
      chatId,
      conversationType: classification.conversationType,
      teamId: classification.teamId,
      channelId: classification.channelId,
      content: stripHtml(rawContent),
      mentions: parseMentions(resource.properties, rawContent),
      author: {
        id: extractUserId(resource.from) ?? 'unknown',
        displayName: resource.imdisplayname || extractUserId(resource.from) || 'unknown',
      },
      messageType: resource.messagetype,
      timestamp: new Date().toISOString(),
    }
    this.emitter.emit('message', message)
  }

  private async classifyConversation(
    chatId: string,
  ): Promise<Pick<TeamsRealtimeMessage, 'conversationType' | 'teamId' | 'channelId'>> {
    if (!isThreadConversation(chatId)) return { conversationType: 'chat' }

    let teamId = this.channelTeamMap.get(chatId)
    // A thread we haven't cached may be a channel created/joined since start;
    // one best-effort refresh resolves it. Group chats also look like threads
    // but never carry a groupId, so remember the miss to avoid re-fetching
    // /users/ME/conversations on every one of their messages.
    if (!teamId && !this.nonChannelThreads.has(chatId)) {
      await this.refreshChannelMap()
      teamId = this.channelTeamMap.get(chatId)
      if (!teamId) this.nonChannelThreads.add(chatId)
    }
    if (!teamId) return { conversationType: 'chat' }

    return { conversationType: 'channel', teamId, channelId: chatId }
  }

  private async refreshChannelMap(): Promise<void> {
    if (this.channelMapRefreshing) return this.channelMapRefreshing
    this.channelMapRefreshing = this.client
      .buildChannelTeamMap()
      .then((map) => {
        this.channelTeamMap = map
      })
      .catch((error) => {
        this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => {
        this.channelMapRefreshing = null
      })
    return this.channelMapRefreshing
  }

  private rememberMessageId(id: string): void {
    this.seenMessageIds.add(id)
    if (this.seenMessageIds.size > MESSAGE_CACHE_LIMIT) {
      const oldest = this.seenMessageIds.values().next().value
      if (oldest !== undefined) this.seenMessageIds.delete(oldest)
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY)
    this.reconnectAttempts++
    this.endpointId = randomUUID()
    this.sequence = 0
    this.reconnectTimer = setTimeout(() => void this.connect(), delay)
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.reregisterTimer) {
      clearInterval(this.reregisterTimer)
      this.reregisterTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractUserId(from: string | undefined): string | null {
  if (!from) return null
  const match = from.match(/contacts\/(.+)$/)
  return match ? match[1] : from
}
