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

  describe('sendMessage threading', () => {
    it('includes parentId in the request body when threading', async () => {
      mockResponse({ id: 'msg-1', roomId: 'room-1', roomType: 'group' })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage('room-1', 'reply text', { parentId: 'parent-1' })

      const body = JSON.parse(fetchCalls[0].options?.body as string)
      expect(body.roomId).toBe('room-1')
      expect(body.text).toBe('reply text')
      expect(body.parentId).toBe('parent-1')
    })
  })

  describe('listReplies', () => {
    it('queries messages filtered by parentId', async () => {
      mockResponse({ items: [{ id: 'reply-1', roomId: 'room-1', roomType: 'group', parentId: 'parent-1' }] })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const replies = await client.listReplies('room-1', 'parent-1', { max: 10 })

      expect(replies).toHaveLength(1)
      const url = new URL(fetchCalls[0].url)
      expect(url.searchParams.get('roomId')).toBe('room-1')
      expect(url.searchParams.get('parentId')).toBe('parent-1')
      expect(url.searchParams.get('max')).toBe('10')
    })
  })

  describe('getPerson', () => {
    it('fetches a person by id', async () => {
      mockResponse({ id: 'person-1', emails: ['a@b.com'], displayName: 'Alice', type: 'person' })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const person = await client.getPerson('person-1')

      expect(person.displayName).toBe('Alice')
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/people/person-1')
    })
  })

  describe('uploadFile', () => {
    it('posts multipart form data to messages', async () => {
      mockResponse({
        id: 'msg-1',
        roomId: 'room-1',
        roomType: 'group',
        files: ['https://webexapis.com/v1/contents/c1'],
      })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const message = await client.uploadFile(
        'room-1',
        { content: new Blob(['hello']), filename: 'note.txt' },
        { text: 'see attached' },
      )

      expect(message.files).toEqual(['https://webexapis.com/v1/contents/c1'])
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/messages')
      expect(fetchCalls[0].options?.method).toBe('POST')
      const body = fetchCalls[0].options?.body as FormData
      expect(body).toBeInstanceOf(FormData)
      expect(body.get('roomId')).toBe('room-1')
      expect(body.get('text')).toBe('see attached')
    })
  })

  describe('downloadContent', () => {
    it('returns binary data with filename parsed from Content-Disposition', async () => {
      fetchResponses.push(
        new Response('binary-bytes', {
          status: 200,
          headers: {
            'Content-Disposition': 'attachment; filename="report.pdf"',
            'Content-Type': 'application/pdf',
          },
        }),
      )

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const result = await client.downloadContent('https://webexapis.com/v1/contents/c1')

      expect(result.filename).toBe('report.pdf')
      expect(result.contentType).toBe('application/pdf')
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/contents/c1')
    })

    it('builds the contents URL from a bare content id', async () => {
      fetchResponses.push(new Response('data', { status: 200, headers: {} }))

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const result = await client.downloadContent('abc123')

      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/contents/abc123')
      expect(result.filename).toBe('abc123')
    })

    it('refuses to download from a non-Webex host', async () => {
      const client = await new WebexBotClient().login({ token: 'bot-token' })

      await expect(client.downloadContent('https://attacker.example/file')).rejects.toThrow(/untrusted/i)
      expect(fetchCalls).toHaveLength(0)
    })

    it('refuses to download over plain http from the Webex host', async () => {
      const client = await new WebexBotClient().login({ token: 'bot-token' })

      await expect(client.downloadContent('http://webexapis.com/v1/contents/c1')).rejects.toThrow(/untrusted/i)
      expect(fetchCalls).toHaveLength(0)
    })

    it('sanitizes a path-traversal filename from Content-Disposition', async () => {
      fetchResponses.push(
        new Response('data', {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="../../etc/passwd"' },
        }),
      )

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      const result = await client.downloadContent('https://webexapis.com/v1/contents/c1')

      expect(result.filename).toBe('passwd')
    })
  })
})
