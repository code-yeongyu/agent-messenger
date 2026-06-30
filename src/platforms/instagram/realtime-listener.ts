import { EventEmitter } from 'node:events'
import { deflateSync, inflateSync } from 'node:zlib'

import type { InstagramClient } from './client'
import { buildConnectPayload } from './mqtt/connection'
import { MqttTransport } from './mqtt/transport'
import { extractMediaUrl, extractMessageText, getMessageType, type InstagramMessageSummary } from './types'

export interface InstagramRealtimeListenerEventMap {
  message: [InstagramMessageSummary]
  error: [Error]
  connected: [{ userId: string }]
  disconnected: []
}

export interface InstagramRealtimeListenerOptions {
  connackTimeoutMs?: number
}

type EventKey = keyof InstagramRealtimeListenerEventMap

const TOPIC_PUBSUB = '88'
const TOPIC_REALTIME_SUB = '149'
const TOPIC_IRIS_SUB = '134'
const TOPIC_MESSAGE_SYNC = '146'

const ZLIB_MAGIC_BYTE = 0x78

const DM_THREAD_PATH_PATTERN = /^\/direct_v2\/(?:inbox\/)?threads\//
const THREAD_ID_PATTERN = /^\/direct_v2\/(?:inbox\/)?threads\/(\d+)/

interface IrisEnvelope {
  data?: IrisPatch[]
}

interface IrisPatch {
  op?: string
  path?: string
  value?: string
}

export class InstagramRealtimeListener {
  private client: InstagramClient
  private transport: MqttTransport | null = null
  private emitter = new EventEmitter()
  private running = false
  private userId: string
  private connackTimeoutMs: number | undefined

  constructor(client: InstagramClient, options: InstagramRealtimeListenerOptions = {}) {
    this.client = client
    this.userId = client.getUserId() ?? ''
    this.connackTimeoutMs = options.connackTimeoutMs
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const session = this.client.getSessionState()
      const iris = await this.client.fetchIrisBootstrap()

      if (!this.running) return

      const connectPayload = buildConnectPayload(session)

      const transport = new MqttTransport({ connackTimeoutMs: this.connackTimeoutMs })
      this.transport = transport

      transport.on('connect', () => {
        this.sendSubscriptions(iris)
        this.emitter.emit('connected', { userId: this.userId })
      })
      transport.on('publish', ({ topic, payload }) => this.handlePublish(topic, payload))
      transport.on('error', (err) => this.emitter.emit('error', err))
      transport.on('close', () => {
        if (this.running) this.emitter.emit('disconnected')
      })

      transport.connect(connectPayload)
    } catch (error) {
      // Any setup failure must leave the listener cleanly restartable: reset running
      // and discard the partial transport so a later start() does not no-op at the guard.
      this.running = false
      if (this.transport) {
        this.transport.disconnect()
        this.transport = null
      }
      throw error
    }
  }

  stop(): void {
    this.running = false
    if (this.transport) {
      this.transport.disconnect()
      this.transport = null
    }
    this.emitter.emit('disconnected')
  }

  on<K extends EventKey>(event: K, listener: (...args: InstagramRealtimeListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: InstagramRealtimeListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: InstagramRealtimeListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void)
    return this
  }

  private sendSubscriptions(iris: { seqId: number; snapshotAtMs: number }): void {
    const transport = this.transport
    if (!transport) return

    transport.publish(
      TOPIC_IRIS_SUB,
      deflateJson({
        seq_id: iris.seqId,
        snapshot_at_ms: iris.snapshotAtMs,
        snapshot_app_version: APP_VERSION,
      }),
    )

    transport.publish(TOPIC_PUBSUB, deflateJson({ sub: [`ig/u/v1/${this.userId}`] }))

    transport.publish(
      TOPIC_REALTIME_SUB,
      deflateJson({
        sub: [`1/graphqlsubscriptions/17867973967082385/{"input_data":{"user_id":"${this.userId}"}}`],
      }),
    )
  }

  private handlePublish(topic: string, payload: Buffer): void {
    if (topic !== TOPIC_MESSAGE_SYNC) return

    let envelopes: IrisEnvelope[]
    try {
      envelopes = JSON.parse(inflateIfNeeded(payload).toString('utf8')) as IrisEnvelope[]
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      return
    }

    for (const envelope of envelopes) {
      for (const patch of envelope.data ?? []) {
        const message = this.decodeDmPatch(patch)
        if (message) this.emitter.emit('message', message)
      }
    }
  }

  private decodeDmPatch(patch: IrisPatch): InstagramMessageSummary | null {
    if (patch.op !== 'add') return null
    if (!patch.path || !patch.value || !DM_THREAD_PATH_PATTERN.test(patch.path)) return null

    const threadId = patch.path.match(THREAD_ID_PATTERN)?.[1] ?? ''

    let item: Record<string, unknown>
    try {
      item = JSON.parse(patch.value) as Record<string, unknown>
    } catch {
      return null
    }

    const itemId = String(item['item_id'] ?? '')
    const fromUserId = String(item['user_id'] ?? '')
    const timestampUs = item['timestamp'] as number | string | undefined

    return {
      id: itemId,
      thread_id: threadId,
      from: fromUserId,
      timestamp: timestampUs ? new Date(Number(timestampUs) / 1000).toISOString() : new Date().toISOString(),
      is_outgoing: fromUserId === this.userId,
      type: getMessageType(item),
      text: extractMessageText(item),
      media_url: extractMediaUrl(item),
    }
  }
}

const APP_VERSION = '312.1.0.34.111'

function deflateJson(value: unknown): Buffer {
  return deflateSync(JSON.stringify(value), { level: 9 })
}

function inflateIfNeeded(payload: Buffer): Buffer {
  if (payload.length > 0 && payload[0] === ZLIB_MAGIC_BYTE) {
    return inflateSync(payload)
  }
  return payload
}
