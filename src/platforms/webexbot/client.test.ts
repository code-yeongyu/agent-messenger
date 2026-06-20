import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { toRestId } from '../webex/id-normalizer'
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

  describe('room cluster resolution', () => {
    const roomUuid = '12345678-1234-1234-1234-1234567890ab'
    const usRoomId = toRestId(roomUuid, 'ROOM')
    const clusteredRoomId = Buffer.from(`ciscospark://urn:TEAM:us-west-2_r/ROOM/${roomUuid}`).toString('base64url')

    const isRoomsList = (url: string) => new URL(url).pathname === '/v1/rooms'

    const clusteredId = (uuid: string) =>
      Buffer.from(`ciscospark://urn:TEAM:us-west-2_r/ROOM/${uuid}`).toString('base64url')

    const mockRoomsPage = (items: unknown[], nextCursor?: string) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (nextCursor) headers.Link = `<https://webexapis.com/v1/rooms?max=1000&before=${nextCursor}>; rel="next"`
      fetchResponses.push(new Response(JSON.stringify({ items }), { status: 200, headers }))
    }

    it('rewrites a us-cluster roomId to the real urn:TEAM id before sending', async () => {
      // given a non-default-cluster room only reachable via its clustered id
      mockResponse({ items: [{ id: clusteredRoomId, title: 'Team', type: 'group' }] })
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      // when sending to the us-flattened id the listener emitted
      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage(usRoomId, 'hello')

      // then the lookup runs and the send targets the corrected clustered id
      expect(isRoomsList(fetchCalls[0].url)).toBe(true)
      const body = JSON.parse(fetchCalls[1].options?.body as string)
      expect(body.roomId).toBe(clusteredRoomId)
    })

    it('routes listMemberships through the corrected clustered id', async () => {
      mockResponse({ items: [{ id: clusteredRoomId, type: 'group' }] })
      mockResponse({ items: [{ id: 'm1', roomId: clusteredRoomId, personId: 'p1' }] })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.listMemberships(usRoomId)

      const membershipsUrl = new URL(fetchCalls[1].url)
      expect(membershipsUrl.pathname).toBe('/v1/memberships')
      expect(membershipsUrl.searchParams.get('roomId')).toBe(clusteredRoomId)
    })

    it('routes listMessages and its space lookup through the corrected clustered id', async () => {
      mockResponse({ items: [{ id: clusteredRoomId, type: 'group' }] })
      mockResponse({ id: clusteredRoomId, title: 'Team', type: 'group' })
      mockResponse({ items: [{ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' }] })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.listMessages(usRoomId, { max: 5 })

      expect(fetchCalls[1].url).toBe(`https://webexapis.com/v1/rooms/${clusteredRoomId}`)
      const messagesUrl = new URL(fetchCalls[2].url)
      expect(messagesUrl.searchParams.get('roomId')).toBe(clusteredRoomId)
    })

    it('passes an already-clustered roomId through without a lookup', async () => {
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage(clusteredRoomId, 'hi')

      expect(fetchCalls).toHaveLength(1)
      expect(new URL(fetchCalls[0].url).pathname).toBe('/v1/messages')
      expect(JSON.parse(fetchCalls[0].options?.body as string).roomId).toBe(clusteredRoomId)
    })

    it('caches the resolution so repeated calls trigger one room lookup', async () => {
      mockResponse({ items: [{ id: clusteredRoomId, type: 'group' }] })
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId })
      mockResponse({ id: 'msg-2', roomId: clusteredRoomId })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage(usRoomId, 'a')
      await client.sendMessage(usRoomId, 'b')

      expect(fetchCalls.filter((c) => isRoomsList(c.url))).toHaveLength(1)
    })

    it('follows Link pages until the room is found on a later page', async () => {
      // given the matching room is only on the second page
      mockRoomsPage([{ id: clusteredId('00000000-0000-0000-0000-000000000000'), type: 'group' }], 'cursor1')
      mockRoomsPage([{ id: clusteredRoomId, type: 'group' }])
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      // when sending to a room not present on the first page
      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage(usRoomId, 'hi')

      // then the second page is fetched via the Link cursor and the send targets the match
      expect(isRoomsList(fetchCalls[0].url)).toBe(true)
      expect(isRoomsList(fetchCalls[1].url)).toBe(true)
      expect(fetchCalls[1].url).toContain('before=cursor1')
      expect(JSON.parse(fetchCalls[2].options?.body as string).roomId).toBe(clusteredRoomId)
    })

    it('stops paging once the room is found and does not fetch later pages', async () => {
      // given a first page that already contains the match but still advertises a next page
      mockRoomsPage([{ id: clusteredRoomId, type: 'group' }], 'cursor1')
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await client.sendMessage(usRoomId, 'hi')

      // then only the first page is fetched (a second page fetch would hit the unmocked response and throw)
      expect(fetchCalls.filter((c) => isRoomsList(c.url))).toHaveLength(1)
      expect(JSON.parse(fetchCalls[1].options?.body as string).roomId).toBe(clusteredRoomId)
    })

    it('fails open to the un-clustered id and warns when no room matches', async () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
      mockResponse({ items: [] })
      mockResponse({ id: 'msg-1', roomId: usRoomId })

      const client = await new WebexBotClient().login({ token: 'bot-token' })
      await expect(client.sendMessage(usRoomId, 'x')).resolves.toBeDefined()

      expect(JSON.parse(fetchCalls[1].options?.body as string).roomId).toBe(usRoomId)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })
})
