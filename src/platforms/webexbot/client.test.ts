import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { WebexBotClient } from './client'

describe('WebexBotClient', () => {
  const originalFetch = globalThis.fetch
  let fetchCalls: Array<{ url: string; options?: RequestInit }> = []
  let fetchResponses: Response[] = []
  let fetchIndex = 0

  beforeEach(() => {
    fetchCalls = []
    fetchResponses = []
    fetchIndex = 0
    ;(globalThis as { fetch: unknown }).fetch = async (
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

  const mockResponse = (body: unknown, status = 200) => {
    fetchResponses.push(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  describe('listMessages', () => {
    it('limits group-space history to messages that mention the bot', async () => {
      mockResponse({ id: 'group-room', title: 'Team', type: 'group' })
      mockResponse({ items: [{ id: 'msg-1', roomId: 'group-room', roomType: 'group' }] })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const messages = await client.listMessages('group-room', { max: 5 })

      expect(messages).toHaveLength(1)
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/rooms/group-room')

      const messagesUrl = new URL(fetchCalls[1].url)
      expect(messagesUrl.origin + messagesUrl.pathname).toBe('https://webexapis.com/v1/messages')
      expect(messagesUrl.searchParams.get('roomId')).toBe('group-room')
      expect(messagesUrl.searchParams.get('max')).toBe('5')
      expect(messagesUrl.searchParams.get('mentionedPeople')).toBe('me')
    })

    it('does not add mentionedPeople for direct spaces', async () => {
      mockResponse({ id: 'direct-room', title: 'DM', type: 'direct' })
      mockResponse({ items: [{ id: 'msg-1', roomId: 'direct-room', roomType: 'direct' }] })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.listMessages('direct-room', { max: 5 })

      const messagesUrl = new URL(fetchCalls[1].url)
      expect(messagesUrl.searchParams.get('roomId')).toBe('direct-room')
      expect(messagesUrl.searchParams.get('mentionedPeople')).toBeNull()
    })
  })
})
