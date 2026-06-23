import { EventEmitter } from 'events'

import WebSocket from 'ws'

import type { DiscordBotClient } from './client'
import type { DiscordBotListenerEventMap, DiscordGatewayGenericEvent } from './types'
import { DiscordGatewayOpcode, DiscordIntent } from './types'

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json'
const GATEWAY_QUERY = '?v=10&encoding=json'
const RECONNECT_BASE_DELAY = 1_000
const RECONNECT_MAX_DELAY = 30_000
const NON_RECOVERABLE_CLOSE_CODES = [4004, 4010, 4011, 4012, 4013, 4014]
const SESSION_RESET_CLOSE_CODES = [4007, 4009]

// Hello arrives within milliseconds and READY within a few seconds on a healthy gateway;
// 15s is generous for a successful handshake while still failing fast on bad tokens,
// network stalls, or a gateway that accepts the socket but never delivers READY.
const DEFAULT_CONNECT_TIMEOUT_MS = 15_000

const DEFAULT_INTENTS =
  DiscordIntent.Guilds |
  DiscordIntent.GuildMessages |
  DiscordIntent.GuildMessageReactions |
  DiscordIntent.GuildMessageTyping |
  DiscordIntent.DirectMessages |
  DiscordIntent.DirectMessageReactions |
  DiscordIntent.DirectMessageTyping

type EventKey = keyof DiscordBotListenerEventMap

export interface DiscordBotListenerOptions {
  intents?: number
  connectTimeoutMs?: number
}

export class DiscordBotListener {
  private client: DiscordBotClient
  private intents: number
  private connectTimeoutMs: number
  private running = false
  private ws: WebSocket | null = null
  private emitter = new EventEmitter()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatAckReceived = true
  private heartbeatJitterTimer: ReturnType<typeof setTimeout> | null = null
  private invalidSessionTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private sequence: number | null = null
  private sessionId: string | null = null
  private resumeGatewayUrl: string | null = null
  private token: string | null = null
  private cachedUser: { id: string; username: string } | null = null
  private generation = 0
  private startPromise: Promise<void> | null = null
  private pendingStartReject: ((error: Error) => void) | null = null

  constructor(client: DiscordBotClient, options?: DiscordBotListenerOptions) {
    this.client = client
    this.intents = options?.intents ?? DEFAULT_INTENTS
    this.connectTimeoutMs = options?.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise
    if (this.running) return

    this.running = true
    this.reconnectAttempts = 0
    const generation = ++this.generation

    const ready = new Promise<void>((resolve, reject) => {
      let settled = false

      const cleanup = () => {
        this.emitter.off('connected', onConnected)
        this.emitter.off('error', onError)
        this.pendingStartReject = null
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer)
          this.connectTimeoutTimer = null
        }
      }

      const onConnected = () => {
        if (settled || !this.isCurrent(generation)) return
        settled = true
        cleanup()
        resolve()
      }

      const onError = (error: Error) => {
        if (settled || !this.isCurrent(generation)) return
        settled = true
        cleanup()
        this.teardownFailedStart(generation)
        reject(error)
      }

      this.emitter.once('connected', onConnected)
      this.emitter.once('error', onError)

      // Generation-agnostic on purpose: stop() invokes this to reject an in-flight start
      // (after bumping generation) without leaking the once() handlers.
      this.pendingStartReject = (error: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }

      this.connectTimeoutTimer = setTimeout(() => {
        onError(new Error(`Discord gateway did not become ready within ${this.connectTimeoutMs}ms`))
      }, this.connectTimeoutMs)
    })

    const run = async (): Promise<void> => {
      try {
        await Promise.all([this.connect(generation), ready])
      } finally {
        if (this.generation === generation) this.startPromise = null
      }
    }
    const startPromise = run()
    this.startPromise = startPromise
    return startPromise
  }

  stop(): void {
    this.running = false
    this.generation++
    this.clearTimers()
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }
    const rejectStart = this.pendingStartReject
    this.pendingStartReject = null
    this.startPromise = null
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.sequence = null
    this.sessionId = null
    this.resumeGatewayUrl = null
    this.token = null
    this.cachedUser = null
    rejectStart?.(new Error('Discord gateway start was stopped before becoming ready'))
  }

  private teardownFailedStart(generation: number): void {
    if (!this.isCurrent(generation)) return
    this.stop()
  }

  on<K extends EventKey>(event: K, listener: (...args: DiscordBotListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: DiscordBotListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: any[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: DiscordBotListenerEventMap[K]) => void): this {
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
          intents: this.intents,
          properties: {
            os: 'linux',
            browser: 'agent-messenger',
            device: 'agent-messenger',
          },
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
