import { EventEmitter } from 'events'

import type { TelegramBotClient } from './client'
import type { TelegramBotListenerEventMap, TelegramBotListenerOptions, TelegramBotUser, TelegramUpdate } from './types'
import { TelegramBotError } from './types'

const DEFAULT_TIMEOUT_SECONDS = 30
const DEFAULT_LIMIT = 100
const RECONNECT_BASE_DELAY = 1_000
const RECONNECT_MAX_DELAY = 30_000
const FATAL_ERROR_CODES = new Set(['unauthorized', 'conflict'])

type EventKey = keyof TelegramBotListenerEventMap

export class TelegramBotListener {
  private client: TelegramBotClient
  private timeoutSeconds: number
  private limit: number
  private allowedUpdates: string[] | undefined
  private dropPendingUpdates: boolean
  private running = false
  private offset = 0
  private reconnectAttempts = 0
  private emitter = new EventEmitter()
  private abortController: AbortController | null = null
  private cachedUser: TelegramBotUser | null = null
  private generation = 0

  constructor(client: TelegramBotClient, options?: TelegramBotListenerOptions) {
    this.client = client
    this.timeoutSeconds = options?.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS
    this.limit = options?.limit ?? DEFAULT_LIMIT
    this.allowedUpdates = options?.allowedUpdates
    this.dropPendingUpdates = options?.dropPendingUpdates ?? false
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.reconnectAttempts = 0
    this.generation++
    const generation = this.generation

    try {
      await this.client.deleteWebhook({ drop_pending_updates: this.dropPendingUpdates })
    } catch (error) {
      if (!this.isCurrent(generation)) return
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      this.running = false
      return
    }

    if (!this.isCurrent(generation)) return

    try {
      this.cachedUser = await this.client.getMe()
      if (!this.isCurrent(generation)) return
      this.emitter.emit('connected', { user: this.cachedUser })
    } catch (error) {
      if (!this.isCurrent(generation)) return
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      this.running = false
      return
    }

    void this.pollLoop(generation)
  }

  stop(): void {
    this.running = false
    this.generation++
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.cachedUser = null
  }

  on<K extends EventKey>(event: K, listener: (...args: TelegramBotListenerEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void)
    return this
  }

  off<K extends EventKey>(event: K, listener: (...args: TelegramBotListenerEventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void)
    return this
  }

  once<K extends EventKey>(event: K, listener: (...args: TelegramBotListenerEventMap[K]) => void): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void)
    return this
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation && this.running
  }

  private async pollLoop(generation: number): Promise<void> {
    let firstPoll = true

    while (this.isCurrent(generation)) {
      this.abortController = new AbortController()
      try {
        const updates = await this.client.getUpdates(
          {
            offset: this.offset,
            limit: this.limit,
            timeout: this.timeoutSeconds,
            allowed_updates: firstPoll ? this.allowedUpdates : undefined,
          },
          this.abortController.signal,
        )
        firstPoll = false
        this.reconnectAttempts = 0

        if (!this.isCurrent(generation)) return

        for (const update of updates) {
          if (!this.isCurrent(generation)) return
          this.dispatch(update)
          this.offset = update.update_id + 1
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError' || !this.isCurrent(generation)) {
          return
        }

        if (error instanceof TelegramBotError && FATAL_ERROR_CODES.has(error.code)) {
          this.emitter.emit('error', error)
          this.running = false
          return
        }

        this.emitter.emit('disconnected')
        await this.backoff(generation)
      }
    }
  }

  private dispatch(update: TelegramUpdate): void {
    if (update.message) this.emitter.emit('message', update.message)
    if (update.edited_message) this.emitter.emit('edited_message', update.edited_message)
    if (update.channel_post) this.emitter.emit('channel_post', update.channel_post)
    if (update.edited_channel_post) this.emitter.emit('edited_channel_post', update.edited_channel_post)
    if (update.callback_query) this.emitter.emit('callback_query', update.callback_query)
    if (update.inline_query) this.emitter.emit('inline_query', update.inline_query)
    if (update.my_chat_member) this.emitter.emit('my_chat_member', update.my_chat_member)
    if (update.chat_member) this.emitter.emit('chat_member', update.chat_member)
    this.emitter.emit('telegram_update', update)
  }

  private async backoff(generation: number): Promise<void> {
    const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY)
    this.reconnectAttempts++
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), delay)
      const onAbort = (): void => {
        clearTimeout(timer)
        resolve()
      }
      if (this.isCurrent(generation) && this.abortController) {
        this.abortController.signal.addEventListener('abort', onAbort, { once: true })
      } else {
        clearTimeout(timer)
        resolve()
      }
    })
  }
}
