import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { TelegramBotClient } from './client'
import { TelegramBotError } from './types'

describe('TelegramBotClient', () => {
  const originalFetch = globalThis.fetch
  let fetchCalls: Array<{ url: string; options?: RequestInit }> = []
  let fetchResponses: Response[] = []
  let fetchIndex = 0

  beforeEach(() => {
    fetchCalls = []
    fetchResponses = []
    fetchIndex = 0
    ;(globalThis as Record<string, unknown>).fetch = async (
      url: string | URL | Request,
      options?: RequestInit,
    ): Promise<Response> => {
      fetchCalls.push({ url: url.toString(), options })
      const response = fetchResponses[fetchIndex]
      fetchIndex++
      if (!response) {
        throw new Error('No mock response configured')
      }
      return response
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const mockOk = (result: unknown): void => {
    fetchResponses.push(
      new Response(JSON.stringify({ ok: true, result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  const mockApiError = (errorCode: number, description: string, params?: Record<string, unknown>): void => {
    fetchResponses.push(
      new Response(JSON.stringify({ ok: false, error_code: errorCode, description, parameters: params }), {
        status: errorCode >= 400 && errorCode < 600 ? errorCode : 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  describe('login', () => {
    it('requires non-empty token', async () => {
      await expect(new TelegramBotClient().login({ token: '' })).rejects.toThrow(TelegramBotError)
      await expect(new TelegramBotClient().login({ token: '' })).rejects.toThrow('Token is required')
    })

    it('accepts a valid token', async () => {
      const client = await new TelegramBotClient().login({ token: '123:abc' })
      expect(client).toBeInstanceOf(TelegramBotClient)
    })
  })

  describe('getMe', () => {
    it('returns bot user and uses /bot<token>/getMe URL', async () => {
      mockOk({ id: 123456, is_bot: true, first_name: 'Test', username: 'testbot' })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const me = await client.getMe()

      expect(me.id).toBe(123456)
      expect(me.is_bot).toBe(true)
      expect(me.username).toBe('testbot')
      expect(fetchCalls[0].url).toBe('https://api.telegram.org/botTOKEN/getMe')
      expect(fetchCalls[0].options?.method).toBe('POST')
    })

    it('throws TelegramBotError with code "unauthorized" on 401', async () => {
      mockApiError(401, 'Unauthorized')
      const client = await new TelegramBotClient().login({ token: 'bad' })
      try {
        await client.getMe()
        expect(false).toBe(true)
      } catch (e) {
        expect(e).toBeInstanceOf(TelegramBotError)
        expect((e as TelegramBotError).code).toBe('unauthorized')
      }
    })
  })

  describe('sendMessage', () => {
    it('sends text message with chat_id and text body', async () => {
      mockOk({
        message_id: 42,
        date: 1735689600,
        chat: { id: -100123, type: 'supergroup', title: 'Eng' },
        text: 'Hello',
      })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const msg = await client.sendMessage(-100123, 'Hello')

      expect(msg.message_id).toBe(42)
      expect(msg.text).toBe('Hello')

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.chat_id).toBe(-100123)
      expect(body.text).toBe('Hello')
    })

    it('forwards optional parse_mode and reply_to_message_id', async () => {
      mockOk({
        message_id: 1,
        date: 1,
        chat: { id: 1, type: 'private', first_name: 'X' },
        text: '<b>Hi</b>',
      })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      await client.sendMessage(1, '<b>Hi</b>', { parse_mode: 'HTML', reply_to_message_id: 5 })

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.parse_mode).toBe('HTML')
      expect(body.reply_to_message_id).toBe(5)
    })
  })

  describe('rate limiting', () => {
    it('retries after retry_after on 429', async () => {
      mockApiError(429, 'Too Many Requests', { retry_after: 0 })
      mockOk({ id: 1, is_bot: true, first_name: 'X' })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const me = await client.getMe()

      expect(me.id).toBe(1)
      expect(fetchCalls).toHaveLength(2)
    })
  })

  describe('error mapping', () => {
    it('maps 409 conflict to "conflict" code', async () => {
      mockApiError(409, 'Conflict: terminated by other getUpdates request')
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      try {
        await client.getMe()
        expect(false).toBe(true)
      } catch (e) {
        expect(e).toBeInstanceOf(TelegramBotError)
        expect((e as TelegramBotError).code).toBe('conflict')
      }
    })

    it('maps 400 to "bad_request"', async () => {
      mockApiError(400, 'Bad Request: chat not found')
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      try {
        await client.getMe()
        expect(false).toBe(true)
      } catch (e) {
        expect((e as TelegramBotError).code).toBe('bad_request')
      }
    })

    it('maps 403 to "forbidden"', async () => {
      mockApiError(403, "Forbidden: bot can't initiate conversation with a user")
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      try {
        await client.getMe()
        expect(false).toBe(true)
      } catch (e) {
        expect((e as TelegramBotError).code).toBe('forbidden')
      }
    })
  })

  describe('getUpdates', () => {
    it('passes offset, limit, timeout to API', async () => {
      mockOk([])
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      await client.getUpdates({ offset: 5, limit: 50, timeout: 30, allowed_updates: ['message'] })

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.offset).toBe(5)
      expect(body.limit).toBe(50)
      expect(body.timeout).toBe(30)
      expect(body.allowed_updates).toEqual(['message'])
    })
  })

  describe('deleteMessage', () => {
    it('returns boolean result', async () => {
      mockOk(true)
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const ok = await client.deleteMessage(123, 42)
      expect(ok).toBe(true)
    })
  })

  describe('setMessageReaction', () => {
    it('sends reaction array', async () => {
      mockOk(true)
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      await client.setMessageReaction(123, 42, [{ type: 'emoji', emoji: '👍' }], { is_big: true })

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.reaction).toEqual([{ type: 'emoji', emoji: '👍' }])
      expect(body.is_big).toBe(true)
    })
  })

  describe('resolveChatId', () => {
    it('returns numeric input as number', async () => {
      const client = new TelegramBotClient()
      expect(await client.resolveChatId(-100123)).toBe(-100123)
    })

    it('parses numeric string', async () => {
      const client = new TelegramBotClient()
      expect(await client.resolveChatId('-100123')).toBe(-100123)
    })

    it('keeps @username as is', async () => {
      const client = new TelegramBotClient()
      expect(await client.resolveChatId('@channel')).toBe('@channel')
    })

    it('prefixes plain username with @', async () => {
      const client = new TelegramBotClient()
      expect(await client.resolveChatId('channel')).toBe('@channel')
    })
  })

  describe('formatChat', () => {
    const client = new TelegramBotClient()

    it('uses title when present', () => {
      expect(client.formatChat({ id: 1, type: 'supergroup', title: 'Eng' })).toEqual({
        id: 1,
        type: 'supergroup',
        name: 'Eng',
      })
    })

    it('uses first_name + last_name when title missing', () => {
      expect(client.formatChat({ id: 1, type: 'private', first_name: 'Ada', last_name: 'Lovelace' })).toEqual({
        id: 1,
        type: 'private',
        name: 'Ada Lovelace',
      })
    })

    it('falls back to username when name parts are empty', () => {
      expect(client.formatChat({ id: 1, type: 'private', username: 'ada' })).toEqual({
        id: 1,
        type: 'private',
        name: 'ada',
      })
    })

    it('falls back to id when nothing is set', () => {
      expect(client.formatChat({ id: 42, type: 'private' })).toEqual({ id: 42, type: 'private', name: '42' })
    })
  })

  describe('getChat / getChatMember / getChatMemberCount', () => {
    it('getChat sends chat_id', async () => {
      mockOk({ id: -100123, type: 'supergroup', title: 'Eng', description: 'ENG team' })
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const chat = await client.getChat(-100123)

      expect(chat.id).toBe(-100123)
      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.chat_id).toBe(-100123)
    })

    it('getChatMember sends chat_id and user_id', async () => {
      mockOk({ user: { id: 1, is_bot: false, first_name: 'A' }, status: 'member' })
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      await client.getChatMember(-100123, 42)

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.chat_id).toBe(-100123)
      expect(body.user_id).toBe(42)
    })

    it('getChatMemberCount returns number', async () => {
      mockOk(7)
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const count = await client.getChatMemberCount(-100123)
      expect(count).toBe(7)
    })
  })

  describe('forwardMessage', () => {
    it('sends chat_id, from_chat_id, message_id', async () => {
      mockOk({
        message_id: 99,
        date: 1,
        chat: { id: 200, type: 'supergroup', title: 'Dst' },
        text: 'forwarded',
      })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const msg = await client.forwardMessage(200, 100, 42)

      expect(msg.message_id).toBe(99)
      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.chat_id).toBe(200)
      expect(body.from_chat_id).toBe(100)
      expect(body.message_id).toBe(42)
    })
  })

  describe('editMessageText', () => {
    it('accepts chat-message target', async () => {
      mockOk({
        message_id: 42,
        date: 1,
        chat: { id: 1, type: 'private', first_name: 'A' },
        text: 'edited',
      })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const result = await client.editMessageText({ chat_id: 1, message_id: 42 }, 'edited')

      expect(typeof result === 'object' && result !== null && 'message_id' in result).toBe(true)
      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.chat_id).toBe(1)
      expect(body.message_id).toBe(42)
      expect(body.text).toBe('edited')
    })

    it('accepts inline-message target', async () => {
      mockOk(true)

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const result = await client.editMessageText({ inline_message_id: 'inline123' }, 'edited')

      expect(result).toBe(true)
      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.inline_message_id).toBe('inline123')
      expect(body.chat_id).toBeUndefined()
    })
  })

  describe('sendDocument (multipart)', () => {
    it('uploads file with multipart/form-data and forwards optional caption', async () => {
      const fs = await import('node:fs/promises')
      const os = await import('node:os')
      const path = await import('node:path')
      const tmp = path.join(os.tmpdir(), `tgbot-doc-test-${Date.now()}.txt`)
      await fs.writeFile(tmp, 'hello')

      try {
        mockOk({
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private', first_name: 'A' },
          document: { file_id: 'F1', file_unique_id: 'U1', file_name: tmp.split('/').pop() },
        })

        const client = await new TelegramBotClient().login({ token: 'TOKEN' })
        const msg = await client.sendDocument(1, tmp, { caption: 'hi' })

        expect(msg.message_id).toBe(1)
        const body = fetchCalls[0].options?.body
        expect(body).toBeInstanceOf(FormData)
        const fd = body as unknown as FormData
        expect(fd.get('chat_id')).toBe('1')
        expect(fd.get('caption')).toBe('hi')
        expect(fd.get('document')).toBeInstanceOf(Blob)
      } finally {
        await fs.unlink(tmp).catch(() => undefined)
      }
    })
  })

  describe('setWebhook / deleteWebhook', () => {
    it('deleteWebhook with drop_pending_updates', async () => {
      mockOk(true)
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const ok = await client.deleteWebhook({ drop_pending_updates: true })

      expect(ok).toBe(true)
      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.drop_pending_updates).toBe(true)
    })

    it('setWebhook with url', async () => {
      mockOk(true)
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      await client.setWebhook('https://example.com/hook', { secret_token: 's3cret' })

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.url).toBe('https://example.com/hook')
      expect(body.secret_token).toBe('s3cret')
    })
  })

  describe('abort', () => {
    it('throws AbortError when signal is already aborted', async () => {
      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const ac = new AbortController()
      ac.abort()
      try {
        await client.getUpdates(undefined, ac.signal)
        expect(false).toBe(true)
      } catch (e) {
        expect((e as Error).name).toBe('AbortError')
      }
    })

    it('treats signal.aborted as authoritative even if fetch throws non-AbortError', async () => {
      ;(globalThis as Record<string, unknown>).fetch = async (
        _url: string | URL | Request,
        init?: RequestInit,
      ): Promise<Response> => {
        const signal = init?.signal as AbortSignal | undefined
        if (signal?.aborted) {
          throw new Error('connection reset')
        }
        return new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 })
      }

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const ac = new AbortController()
      ac.abort()
      try {
        await client.getUpdates(undefined, ac.signal)
        expect(false).toBe(true)
      } catch (e) {
        expect((e as Error).name).toBe('AbortError')
      }
    })
  })

  describe('5xx retry', () => {
    it('retries 502 with non-JSON body before failing', async () => {
      fetchResponses.push(
        new Response('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      mockOk({ id: 1, is_bot: true, first_name: 'X' })

      const client = await new TelegramBotClient().login({ token: 'TOKEN' })
      const me = await client.getMe()
      expect(me.id).toBe(1)
      expect(fetchCalls).toHaveLength(2)
    })
  })
})
