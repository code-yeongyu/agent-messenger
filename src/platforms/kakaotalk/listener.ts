import { EventEmitter } from 'events'

import type { KakaoSessionEvent, KakaoTalkClient } from './client'
import type { LocoPacket } from './protocol/types'
import type {
  KakaoTalkListenerEventMap,
  KakaoTalkPushGenericEvent,
  KakaoTalkPushMemberEvent,
  KakaoTalkPushMessageEvent,
  KakaoTalkPushReadEvent,
} from './types'

type EventKey = keyof KakaoTalkListenerEventMap

function longToString(v: unknown): string {
  if (v && typeof v === 'object' && 'high' in v && 'low' in v) {
    const { high, low } = v as { high: number; low: number }
    return ((BigInt(high >>> 0) << 32n) | BigInt(low >>> 0)).toString()
  }
  return String(v ?? 0)
}

export class KakaoTalkListener {
  private client: KakaoTalkClient
  private running = false
  private emitter = new EventEmitter()
  private unsubscribePush: (() => void) | null = null
  private unsubscribeSession: (() => void) | null = null

  constructor(client: KakaoTalkClient) {
    this.client = client
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    this.unsubscribePush = this.client.onPush((packet) => this.handlePush(packet))
    this.unsubscribeSession = this.client.onSessionEvent((event) => this.handleSessionEvent(event))

    const alreadyConnected = this.client.isConnected()

    try {
      await this.client.acquireSession()
      if (!this.running) return
      if (alreadyConnected) {
        const { userId } = this.client.getCredentials()
        this.emitter.emit('connected', { userId })
      }
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      this.running = false
      this.teardown()
    }
  }

  stop(): void {
    if (!this.running) {
      this.teardown()
      return
    }
    this.running = false
    this.teardown()
  }

  on<K extends EventKey>(event: K, listener: (...args: KakaoTalkListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: KakaoTalkListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: any[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: KakaoTalkListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: any[]) => void)
    return this
  }

  private teardown(): void {
    this.unsubscribePush?.()
    this.unsubscribePush = null
    this.unsubscribeSession?.()
    this.unsubscribeSession = null
  }

  private handleSessionEvent(event: KakaoSessionEvent): void {
    if (!this.running) return

    switch (event.type) {
      case 'connected':
        this.emitter.emit('connected', { userId: event.userId })
        break
      case 'disconnected':
        this.emitter.emit('disconnected')
        break
      case 'kicked':
        this.emitter.emit('error', new Error(event.reason))
        this.running = false
        this.teardown()
        break
    }
  }

  private handlePush(packet: LocoPacket): void {
    const { method, body } = packet

    switch (method) {
      case 'MSG': {
        const chatLog = body.chatLog as Record<string, unknown>
        const event: KakaoTalkPushMessageEvent = {
          type: 'MSG',
          chat_id: longToString(body.chatId),
          log_id: longToString(chatLog.logId),
          author_id: chatLog.authorId as number,
          message: chatLog.message as string,
          message_type: chatLog.type as number,
          sent_at: chatLog.sendAt as number,
        }
        this.emitter.emit('message', event)
        this.emitter.emit('kakaotalk_event', { type: method, ...body })
        break
      }

      case 'NEWMEM': {
        const chatLog = body.chatLog as Record<string, unknown>
        const event: KakaoTalkPushMemberEvent = {
          type: 'NEWMEM',
          chat_id: longToString(body.chatId),
          member: { user_id: chatLog.authorId as number },
        }
        this.emitter.emit('member_joined', event)
        this.emitter.emit('kakaotalk_event', { type: method, ...body })
        break
      }

      case 'DELMEM': {
        const chatLog = body.chatLog as Record<string, unknown>
        const event: KakaoTalkPushMemberEvent = {
          type: 'DELMEM',
          chat_id: longToString(body.chatId),
          member: { user_id: chatLog.authorId as number },
        }
        this.emitter.emit('member_left', event)
        this.emitter.emit('kakaotalk_event', { type: method, ...body })
        break
      }

      case 'DECUNREAD': {
        const event: KakaoTalkPushReadEvent = {
          type: 'DECUNREAD',
          chat_id: longToString(body.chatId),
          user_id: body.userId as number,
          watermark: longToString(body.watermark),
        }
        this.emitter.emit('read', event)
        this.emitter.emit('kakaotalk_event', { type: method, ...body })
        break
      }

      default: {
        const event: KakaoTalkPushGenericEvent = { type: method, ...body }
        this.emitter.emit('kakaotalk_event', event)
        break
      }
    }
  }
}
