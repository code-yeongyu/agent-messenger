import { EventEmitter } from 'events'

import WebSocket from 'ws'

import type { DiscordClient } from './client'
import type { DiscordListenerEventMap, DiscordGatewayGenericEvent } from './types'
import { DiscordGatewayOpcode } from './types'

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json'
const GATEWAY_QUERY = '?v=10&encoding=json'
const RECONNECT_BASE_DELAY = 1_000
const RECONNECT_MAX_DELAY = 30_000
const NON_RECOVERABLE_CLOSE_CODES = [4004, 4010, 4011, 4012, 4013, 4014]
const SESSION_RESET_CLOSE_CODES = [4007, 4009]

// User (non-bot) gateway capabilities bitmask, mirroring discord.py-self's default set.
// Capabilities shape the READY payload; bit 10 (client_state_v2) requires client_state.guild_versions.
const USER_GATEWAY_CAPABILITIES = 16381

// Without MESSAGE_CONTENT (1<<15), Discord blanks `content`/`embeds`/`attachments` on messages
// from OTHER users (self/DM/mention content still arrives). User sessions get all intents only
// when `intents` is omitted OR explicitly set, so we send an all-intents value to guarantee content.
const USER_GATEWAY_INTENTS = 33_554_431

// Discord validates client_build_number against recent web-client builds; a stale value can
// yield a connected-but-degraded session that fires READY yet delivers no message events.
// Overridable via env so it can be refreshed without a release when it eventually goes stale.
const DEFAULT_CLIENT_BUILD_NUMBER = 648814
const USER_GATEWAY_BUILD_NUMBER = Number(process.env.AGENT_DISCORD_BUILD_NUMBER) || DEFAULT_CLIENT_BUILD_NUMBER

type EventKey = keyof DiscordListenerEventMap

export class DiscordListener {
  private client: DiscordClient
  private running = false
  private ws: WebSocket | null = null
  private emitter = new EventEmitter()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatAckReceived = true
  private heartbeatJitterTimer: ReturnType<typeof setTimeout> | null = null
  private invalidSessionTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private sequence: number | null = null
  private sessionId: string | null = null
  private resumeGatewayUrl: string | null = null
  private token: string | null = null
  private cachedUser: { id: string; username: string } | null = null
  private generation = 0

  constructor(client: DiscordClient) {
    this.client = client
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.reconnectAttempts = 0
    this.generation++
    await this.connect(this.generation)
  }

  stop(): void {
    this.running = false
    this.generation++
    this.clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.sequence = null
    this.sessionId = null
    this.resumeGatewayUrl = null
    this.token = null
    this.cachedUser = null
  }

  on<K extends EventKey>(event: K, listener: (...args: DiscordListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: DiscordListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: any[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: DiscordListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: any[]) => void)
    return this
  }

  private isCurrent(generation: number, ws?: WebSocket): boolean {
    if (generation !== this.generation || !this.running) return false
    if (ws !== undefined && this.ws !== ws) return false
    return true
  }

  private async connect(generation: number): Promise<void> {
    if (!this.isCurrent(generation)) return

    try {
      const { token } = await this.client.gatewayConnect()
      if (!this.isCurrent(generation)) return

      this.token = token

      const url = this.resumeGatewayUrl ? `${this.resumeGatewayUrl}${GATEWAY_QUERY}` : GATEWAY_URL
      const ws = new WebSocket(url)
      this.ws = ws

      ws.on('open', () => {
        if (!this.isCurrent(generation, ws)) {
          ws.close()
          return
        }
      })

      ws.on('message', (raw) => {
        if (!this.isCurrent(generation, ws)) return
        try {
          const data = JSON.parse(raw.toString())
          this.handleMessage(data, generation, ws)
        } catch {
          // malformed gateway frame; ignore and let heartbeat handle liveness
        }
      })

      ws.on('close', (code) => {
        if (!this.isCurrent(generation, ws)) return
        this.clearTimers()
        this.ws = null
        if (NON_RECOVERABLE_CLOSE_CODES.includes(code)) {
          this.emitter.emit('error', new Error(`Discord gateway closed with non-recoverable code ${code}`))
          this.running = false
          return
        }
        if (SESSION_RESET_CLOSE_CODES.includes(code)) {
          this.sequence = null
          this.sessionId = null
          this.resumeGatewayUrl = null
        }
        if (this.running) {
          this.emitter.emit('disconnected')
          this.scheduleReconnect()
        }
      })

      ws.on('error', (err) => {
        if (!this.isCurrent(generation, ws)) return
        this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)))
      })
    } catch (error) {
      if (!this.isCurrent(generation)) return
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      if (this.running) {
        this.scheduleReconnect()
      }
    }
  }

  private handleMessage(data: { op: number; d: any; s?: number; t?: string }, generation: number, ws: WebSocket): void {
    if (!this.isCurrent(generation, ws)) return
    const { op, d, s, t } = data

    switch (op) {
      case DiscordGatewayOpcode.Hello:
        this.startHeartbeat(d.heartbeat_interval, generation, ws)
        if (this.sessionId) {
          this.sendResume()
        } else {
          this.sendIdentify()
        }
        break

      case DiscordGatewayOpcode.HeartbeatACK:
        this.heartbeatAckReceived = true
        break

      case DiscordGatewayOpcode.Dispatch:
        if (typeof s === 'number') this.sequence = s
        if (t) this.handleDispatch(t, d)
        break

      case DiscordGatewayOpcode.Reconnect:
        this.reconnectAttempts = 0
        ws.close()
        break

      case DiscordGatewayOpcode.InvalidSession: {
        if (d === true) {
          const delay = 1000 + Math.random() * 4000
          this.invalidSessionTimer = setTimeout(() => {
            this.invalidSessionTimer = null
            if (this.isCurrent(generation, ws)) ws.close()
          }, delay)
        } else {
          this.sequence = null
          this.sessionId = null
          this.resumeGatewayUrl = null
          ws.close()
        }
        break
      }

      case DiscordGatewayOpcode.Heartbeat:
        this.sendHeartbeat()
        break
    }
  }

  private handleDispatch(t: string, d: any): void {
    if (t === 'READY') {
      this.sessionId = d.session_id
      this.resumeGatewayUrl = d.resume_gateway_url
      this.cachedUser = d.user
      this.reconnectAttempts = 0
      this.emitter.emit('connected', { user: d.user, sessionId: d.session_id })
      return
    }

    if (t === 'RESUMED') {
      this.reconnectAttempts = 0
      this.emitter.emit('connected', { user: this.cachedUser!, sessionId: this.sessionId! })
      return
    }

    const eventType = t.toLowerCase()
    const event: DiscordGatewayGenericEvent = { ...d, type: t }
    this.emitter.emit(eventType, event)
    this.emitter.emit('discord_event', event)
  }

  private sendIdentify(): void {
    this.ws?.send(
      JSON.stringify({
        op: DiscordGatewayOpcode.Identify,
        d: {
          token: this.token,
          capabilities: USER_GATEWAY_CAPABILITIES,
          intents: USER_GATEWAY_INTENTS,
          properties: {
            os: 'Linux',
            browser: 'Chrome',
            device: '',
            system_locale: 'en-US',
            browser_user_agent:
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            browser_version: '131.0.0.0',
            os_version: '',
            referrer: '',
            referring_domain: '',
            referrer_current: '',
            referring_domain_current: '',
            release_channel: 'stable',
            client_build_number: USER_GATEWAY_BUILD_NUMBER,
            client_event_source: null,
          },
          presence: { status: 'online', since: 0, activities: [], afk: false },
          compress: false,
          client_state: { guild_versions: {} },
        },
      }),
    )
  }

  private sendResume(): void {
    this.ws?.send(
      JSON.stringify({
        op: DiscordGatewayOpcode.Resume,
        d: {
          token: this.token,
          session_id: this.sessionId,
          seq: this.sequence,
        },
      }),
    )
  }

  private sendHeartbeat(): void {
    this.ws?.send(JSON.stringify({ op: DiscordGatewayOpcode.Heartbeat, d: this.sequence }))
  }

  private startHeartbeat(interval: number, generation: number, ws: WebSocket): void {
    this.clearHeartbeatTimers()
    this.heartbeatAckReceived = true

    this.heartbeatJitterTimer = setTimeout(() => {
      this.heartbeatJitterTimer = null
      if (!this.isCurrent(generation, ws)) return
      this.heartbeatAckReceived = false
      this.sendHeartbeat()

      this.heartbeatTimer = setInterval(() => {
        if (!this.isCurrent(generation, ws)) {
          this.clearHeartbeatTimers()
          return
        }
        if (!this.heartbeatAckReceived) {
          ws.close()
          return
        }
        this.heartbeatAckReceived = false
        this.sendHeartbeat()
      }, interval)
    }, Math.random() * interval)
  }

  private scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY)
    this.reconnectAttempts++
    const generation = this.generation
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(generation)
    }, delay)
  }

  private clearHeartbeatTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatJitterTimer) {
      clearTimeout(this.heartbeatJitterTimer)
      this.heartbeatJitterTimer = null
    }
  }

  private clearTimers(): void {
    this.clearHeartbeatTimers()
    if (this.invalidSessionTimer) {
      clearTimeout(this.invalidSessionTimer)
      this.invalidSessionTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
