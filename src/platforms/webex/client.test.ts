import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import * as jose from 'node-jose'

import { WebexClient } from './client'
import { WebexEncryptionService } from './encryption'
import { toRestId } from './id-normalizer'
import { WebexError } from './types'

describe('WebexClient', () => {
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

  const mockResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': '10',
      'X-RateLimit-Reset': String(Date.now() / 1000 + 60),
      ...headers,
    }
    fetchResponses.push(
      new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: defaultHeaders,
      }),
    )
  }

  describe('login', () => {
    it('accepts valid token', async () => {
      const client = await new WebexClient().login({ token: 'test-token' })
      expect(client).toBeInstanceOf(WebexClient)
    })

    it('throws on empty token', async () => {
      await expect(new WebexClient().login({ token: '' })).rejects.toThrow(WebexError)
      await expect(new WebexClient().login({ token: '' })).rejects.toThrow('Token is required')
    })

    it('returns the authenticated token', async () => {
      const client = await new WebexClient().login({ token: 'test-token' })

      expect(client.getToken()).toBe('test-token')
    })

    it('throws when reading token before login', () => {
      expect(() => new WebexClient().getToken()).toThrow('Not authenticated. Call .login() first.')
    })

    it('accepts deviceUrl and tokenType', async () => {
      const client = await new WebexClient().login({
        token: 'test-token',
        deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/dev-1',
        tokenType: 'extracted',
      })
      expect(client).toBeInstanceOf(WebexClient)
      expect((client as any).deviceUrl).toBe('https://wdm-r.wbx2.com/wdm/api/v1/devices/dev-1')
      expect((client as any).tokenType).toBe('extracted')
    })

    const DEVICE_URL = 'https://wdm-r.wbx2.com/wdm/api/v1/devices/dev-1'
    const encryptionOf = (client: WebexClient) =>
      (client as unknown as { encryption: WebexEncryptionService | null }).encryption

    it('initializes encryption for explicit extracted credentials with a device URL', async () => {
      const client = await new WebexClient().login({
        token: 'extracted-token',
        deviceUrl: DEVICE_URL,
        tokenType: 'extracted',
      })
      expect(encryptionOf(client)).toBeInstanceOf(WebexEncryptionService)
    })

    it('initializes encryption for explicit password credentials with a device URL', async () => {
      const client = await new WebexClient().login({
        token: 'password-token',
        deviceUrl: DEVICE_URL,
        tokenType: 'password',
      })
      expect(encryptionOf(client)).toBeInstanceOf(WebexEncryptionService)
    })

    it('does not initialize encryption for a plain token without device URL', async () => {
      const client = await new WebexClient().login({ token: 'plain-token' })
      expect(encryptionOf(client)).toBeNull()
    })

    it('does not initialize encryption when device URL is absent', async () => {
      const client = await new WebexClient().login({ token: 'extracted-token', tokenType: 'extracted' })
      expect(encryptionOf(client)).toBeNull()
    })
  })

  describe('testAuth', () => {
    it('calls GET /people/me and returns person', async () => {
      mockResponse({
        id: 'user-123',
        displayName: 'Test User',
        emails: ['test@example.com'],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const person = await client.testAuth()

      expect(person.id).toBe('user-123')
      expect(person.displayName).toBe('Test User')
      expect(fetchCalls.length).toBe(1)
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/people/me')
      expect(fetchCalls[0].options?.headers).toMatchObject({
        Authorization: 'Bearer test-token',
      })
    })

    it('throws WebexError on API error', async () => {
      mockResponse({ message: 'Unauthorized' }, 401)

      const client = await new WebexClient().login({ token: 'bad-token' })
      await expect(client.testAuth()).rejects.toThrow(WebexError)
    })

    it('falls back to internal API when public API fails for extracted tokens', async () => {
      // given - public API rejects, internal API succeeds
      mockResponse({ message: 'Unauthorized' }, 401)
      fetchResponses.push(
        new Response(JSON.stringify({ id: 'conv-1', activities: { items: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = await new WebexClient().login({
        token: 'extracted-token',
        deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/dev-1',
        tokenType: 'extracted',
      })

      // when
      const person = await client.testAuth()

      // then - succeeds via internal API
      expect(fetchCalls.length).toBe(2)
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/people/me')
      expect(fetchCalls[1].url).toContain('conv-r.wbx2.com/conversation/api/v1/conversations')
      expect(person).toBeTruthy()
    })

    it('throws when both public and internal APIs fail for extracted tokens', async () => {
      // given - both APIs reject
      mockResponse({ message: 'Unauthorized' }, 401)
      fetchResponses.push(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = await new WebexClient().login({
        token: 'bad-extracted-token',
        deviceUrl: 'https://wdm-r.wbx2.com/wdm/api/v1/devices/dev-1',
        tokenType: 'extracted',
      })

      await expect(client.testAuth()).rejects.toThrow(WebexError)
    })

    it('does not use internal API fallback for non-extracted tokens', async () => {
      mockResponse({ message: 'Unauthorized' }, 401)

      const client = await new WebexClient().login({ token: 'bad-token' })
      await expect(client.testAuth()).rejects.toThrow(WebexError)
      expect(fetchCalls.length).toBe(1)
    })
  })

  describe('listSpaces', () => {
    it('returns unwrapped items array', async () => {
      mockResponse({
        items: [
          { id: 'room1', title: 'Room One', type: 'group' },
          { id: 'room2', title: 'Room Two', type: 'direct' },
        ],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const spaces = await client.listSpaces()

      expect(spaces).toHaveLength(2)
      expect(spaces[0].id).toBe('room1')
      expect(spaces[1].title).toBe('Room Two')
    })

    it('includes default max=50 query param', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listSpaces()

      expect(fetchCalls[0].url).toContain('max=50')
    })

    it('passes type and max query params', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listSpaces({ type: 'direct', max: 10 })

      expect(fetchCalls[0].url).toContain('type=direct')
      expect(fetchCalls[0].url).toContain('max=10')
      expect(fetchCalls[0].url).toContain('/rooms')
    })
  })

  describe('iterateSpaces', () => {
    it('follows the Link header across pages and yields every room', async () => {
      // given two pages chained by a rel="next" Link header
      mockResponse({ items: [{ id: 'room1', title: 'One', type: 'group' }] }, 200, {
        Link: '<https://webexapis.com/v1/rooms?max=1000&before=cursor1>; rel="next"',
      })
      mockResponse({ items: [{ id: 'room2', title: 'Two', type: 'group' }] })

      const client = await new WebexClient().login({ token: 'test-token' })
      const ids: string[] = []
      for await (const room of client.iterateSpaces({ max: 1000 })) {
        ids.push(room.id)
      }

      expect(ids).toEqual(['room1', 'room2'])
      expect(fetchCalls[0].url).toContain('/rooms?max=1000')
      expect(fetchCalls[1].url).toContain('before=cursor1')
    })

    it('stops after a single page when no next Link is present', async () => {
      mockResponse({ items: [{ id: 'room1', title: 'One', type: 'group' }] })

      const client = await new WebexClient().login({ token: 'test-token' })
      const ids: string[] = []
      for await (const room of client.iterateSpaces()) {
        ids.push(room.id)
      }

      expect(ids).toEqual(['room1'])
      expect(fetchCalls).toHaveLength(1)
    })

    it('stops consuming the generator early without fetching the next page', async () => {
      mockResponse({ items: [{ id: 'room1', title: 'One', type: 'group' }] }, 200, {
        Link: '<https://webexapis.com/v1/rooms?max=1000&before=cursor1>; rel="next"',
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      for await (const room of client.iterateSpaces({ max: 1000 })) {
        expect(room.id).toBe('room1')
        break
      }

      expect(fetchCalls).toHaveLength(1)
    })
  })

  describe('getSpace', () => {
    it('calls GET /rooms/{spaceId}', async () => {
      mockResponse({ id: 'room1', title: 'Test Room', type: 'group' })

      const client = await new WebexClient().login({ token: 'test-token' })
      const space = await client.getSpace('room1')

      expect(space.id).toBe('room1')
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/rooms/room1')
    })
  })

  describe('sendMessage', () => {
    it('posts text message to room', async () => {
      mockResponse({ id: 'msg1', roomId: 'room1', text: 'Hello world' })

      const client = await new WebexClient().login({ token: 'test-token' })
      const message = await client.sendMessage('room1', 'Hello world')

      expect(message.id).toBe('msg1')
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/messages')
      expect(fetchCalls[0].options?.method).toBe('POST')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ roomId: 'room1', text: 'Hello world' }))
    })

    it('sends markdown message when option set', async () => {
      mockResponse({ id: 'msg1', roomId: 'room1', markdown: '**bold**' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.sendMessage('room1', '**bold**', { markdown: true })

      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ roomId: 'room1', markdown: '**bold**' }))
    })
  })

  describe('sendDirectMessage', () => {
    it('posts message with toPersonEmail', async () => {
      mockResponse({ id: 'msg1', toPersonEmail: 'user@example.com', text: 'Hello' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.sendDirectMessage('user@example.com', 'Hello')

      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ toPersonEmail: 'user@example.com', text: 'Hello' }))
    })

    it('sends markdown direct message when option set', async () => {
      mockResponse({ id: 'msg1', toPersonEmail: 'user@example.com' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.sendDirectMessage('user@example.com', '**bold**', { markdown: true })

      expect(fetchCalls[0].options?.body).toBe(
        JSON.stringify({ toPersonEmail: 'user@example.com', markdown: '**bold**' }),
      )
    })
  })

  describe('listMessages', () => {
    it('includes roomId query param and unwraps items', async () => {
      mockResponse({
        items: [
          { id: 'msg1', roomId: 'room1', text: 'Message 1' },
          { id: 'msg2', roomId: 'room1', text: 'Message 2' },
        ],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const messages = await client.listMessages('room1')

      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe('msg1')
      expect(fetchCalls[0].url).toContain('roomId=room1')
      expect(fetchCalls[0].url).toContain('max=50')
    })

    it('passes custom max', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listMessages('room1', { max: 10 })

      expect(fetchCalls[0].url).toContain('max=10')
    })

    it('passes mentionedPeople when requested', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listMessages('room1', { max: 10, mentionedPeople: 'me' })

      const url = new URL(fetchCalls[0].url)
      expect(url.searchParams.get('mentionedPeople')).toBe('me')
    })
  })

  describe('getMessage', () => {
    it('calls GET /messages/{messageId}', async () => {
      mockResponse({ id: 'msg1', roomId: 'room1', text: 'Hello' })

      const client = await new WebexClient().login({ token: 'test-token' })
      const message = await client.getMessage('msg1')

      expect(message.id).toBe('msg1')
      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/messages/msg1')
    })
  })

  describe('deleteMessage', () => {
    it('calls DELETE /messages/{messageId} and handles 204', async () => {
      mockResponse(null, 204)

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.deleteMessage('msg1')

      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/messages/msg1')
      expect(fetchCalls[0].options?.method).toBe('DELETE')
    })
  })

  describe('editMessage', () => {
    it('calls PUT /messages/{messageId} with roomId and text', async () => {
      mockResponse({ id: 'msg1', roomId: 'room1', text: 'Edited text' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.editMessage('msg1', 'room1', 'Edited text')

      expect(fetchCalls[0].url).toBe('https://webexapis.com/v1/messages/msg1')
      expect(fetchCalls[0].options?.method).toBe('PUT')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ roomId: 'room1', text: 'Edited text' }))
    })

    it('sends markdown when option set', async () => {
      mockResponse({ id: 'msg1', roomId: 'room1', markdown: '**edited**' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.editMessage('msg1', 'room1', '**edited**', { markdown: true })

      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ roomId: 'room1', markdown: '**edited**' }))
    })
  })

  describe('listPeople', () => {
    it('returns unwrapped items', async () => {
      mockResponse({
        items: [
          { id: 'u1', displayName: 'User One', emails: ['user1@example.com'] },
          { id: 'u2', displayName: 'User Two', emails: ['user2@example.com'] },
        ],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const people = await client.listPeople()

      expect(people).toHaveLength(2)
      expect(people[0].displayName).toBe('User One')
    })

    it('passes email, displayName, max query params', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listPeople({ email: 'user@example.com', displayName: 'Test', max: 5 })

      expect(fetchCalls[0].url).toContain('email=user%40example.com')
      expect(fetchCalls[0].url).toContain('displayName=Test')
      expect(fetchCalls[0].url).toContain('max=5')
    })
  })

  describe('listMemberships', () => {
    it('includes roomId and returns unwrapped items', async () => {
      mockResponse({
        items: [
          { id: 'm1', roomId: 'room1', personEmail: 'user1@example.com', isModerator: false },
          { id: 'm2', roomId: 'room1', personEmail: 'user2@example.com', isModerator: true },
        ],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const memberships = await client.listMemberships('room1')

      expect(memberships).toHaveLength(2)
      expect(memberships[0].id).toBe('m1')
      expect(fetchCalls[0].url).toContain('roomId=room1')
    })

    it('passes max query param', async () => {
      mockResponse({ items: [] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listMemberships('room1', { max: 20 })

      expect(fetchCalls[0].url).toContain('max=20')
    })
  })

  describe('id ref resolution', () => {
    const roomUuid = '12345678-1234-1234-1234-1234567890ab'
    const personUuid = '22222222-2222-2222-2222-222222222222'
    const messageUuid = '33333333-3333-3333-3333-333333333333'
    const usRoomId = toRestId(roomUuid, 'ROOM')
    const clusteredRoomId = Buffer.from(`ciscospark://urn:TEAM:us-west-2_r/ROOM/${roomUuid}`).toString('base64url')

    const isRoomsList = (url: string) => new URL(url).pathname === '/v1/rooms'

    it('resolves a bare room uuid to the real clustered id before sending', async () => {
      mockResponse({ items: [{ id: clusteredRoomId, title: 'Team', type: 'group' }] })
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.sendMessage(roomUuid, 'hello')

      expect(isRoomsList(fetchCalls[0].url)).toBe(true)
      expect(JSON.parse(fetchCalls[1].options?.body as string).roomId).toBe(clusteredRoomId)
    })

    it('rewrites a us-cluster room id to the real clustered id for memberships', async () => {
      mockResponse({ items: [{ id: clusteredRoomId, title: 'Team', type: 'group' }] })
      mockResponse({ items: [{ id: 'm1', roomId: clusteredRoomId, personId: 'p1' }] })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.listMemberships(usRoomId)

      const membershipsUrl = new URL(fetchCalls[1].url)
      expect(membershipsUrl.pathname).toBe('/v1/memberships')
      expect(membershipsUrl.searchParams.get('roomId')).toBe(clusteredRoomId)
    })

    it('passes an already-clustered room id through without a lookup', async () => {
      mockResponse({ id: 'msg-1', roomId: clusteredRoomId, roomType: 'group' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.sendMessage(clusteredRoomId, 'hello')

      expect(fetchCalls).toHaveLength(1)
      expect(JSON.parse(fetchCalls[0].options?.body as string).roomId).toBe(clusteredRoomId)
    })

    it('fails open to the reconstructed room id and warns when no room matches', async () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mockResponse({ items: [] })
        mockResponse({ id: 'msg-1', roomId: usRoomId, roomType: 'group' })

        const client = await new WebexClient().login({ token: 'test-token' })
        await client.sendMessage(roomUuid, 'hello')

        expect(JSON.parse(fetchCalls[1].options?.body as string).roomId).toBe(usRoomId)
        expect(warnSpy).toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('resolves a person email through the people search endpoint', async () => {
      const personId = toRestId(personUuid, 'PEOPLE')
      mockResponse({ items: [{ id: personId, emails: ['alice@example.com'], displayName: 'Alice', type: 'person' }] })

      const client = await new WebexClient().login({ token: 'test-token' })
      const person = await client.getPerson('alice@example.com')

      expect(person.id).toBe(personId)
      const url = new URL(fetchCalls[0].url)
      expect(url.pathname).toBe('/v1/people')
      expect(url.searchParams.get('email')).toBe('alice@example.com')
    })

    it('reconstructs bare person and message uuids for REST calls', async () => {
      const personId = toRestId(personUuid, 'PEOPLE')
      const messageId = toRestId(messageUuid, 'MESSAGE')
      mockResponse({ id: personId, emails: ['alice@example.com'], displayName: 'Alice', type: 'person' })
      mockResponse({ id: messageId, roomId: usRoomId, text: 'hi' })

      const client = await new WebexClient().login({ token: 'test-token' })
      await client.getPerson(personUuid)
      await client.getMessage(messageUuid)

      expect(fetchCalls[0].url).toBe(`https://webexapis.com/v1/people/${personId}`)
      expect(fetchCalls[1].url).toBe(`https://webexapis.com/v1/messages/${messageId}`)
    })
  })

  describe('rate limiting', () => {
    it('retries on 429 with Retry-After header', async () => {
      mockResponse({ message: 'Rate limited' }, 429, { 'Retry-After': '0.1' })
      mockResponse({
        id: 'user-123',
        displayName: 'Test User',
        emails: ['test@example.com'],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const person = await client.testAuth()

      expect(person.id).toBe('user-123')
      expect(fetchCalls.length).toBe(2)
    })

    it('throws after max retries exceeded on 429', async () => {
      for (let i = 0; i <= MAX_RETRIES; i++) {
        mockResponse({ message: 'Rate limited' }, 429, { 'Retry-After': '0.01' })
      }

      const client = await new WebexClient().login({ token: 'test-token' })
      await expect(client.testAuth()).rejects.toThrow(WebexError)
      expect(fetchCalls.length).toBeLessThanOrEqual(4)
    })
  })

  describe('server errors', () => {
    it('retries on 500 with exponential backoff', async () => {
      mockResponse({ message: 'Internal Server Error' }, 500)
      mockResponse({
        id: 'user-123',
        displayName: 'Test User',
        emails: ['test@example.com'],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const person = await client.testAuth()

      expect(person.id).toBe('user-123')
      expect(fetchCalls.length).toBe(2)
    })

    it('does not retry on 4xx errors except 429', async () => {
      mockResponse({ message: 'Not Found' }, 404)

      const client = await new WebexClient().login({ token: 'test-token' })
      await expect(client.testAuth()).rejects.toThrow(WebexError)
      expect(fetchCalls.length).toBe(1)
    })

    it('backoff increases with multiple retries', async () => {
      mockResponse({ message: 'Error' }, 500)
      mockResponse({ message: 'Error' }, 500)
      mockResponse({
        id: 'user-123',
        displayName: 'Test User',
        emails: ['test@example.com'],
      })

      const client = await new WebexClient().login({ token: 'test-token' })
      const startTime = Date.now()
      await client.testAuth()
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(150)
      expect(fetchCalls.length).toBe(3)
    })
  })

  describe('internal conversation API', () => {
    const TEST_DEVICE_URL = 'https://wdm-r.wbx2.com/wdm/api/v1/devices/test-device-id'
    const CONV_BASE = 'https://conv-r.wbx2.com/conversation/api/v1'
    const TEST_ROOM_ID = Buffer.from('ciscospark://urn:TEAM:us-west-2_r/ROOM/abc123-def456').toString('base64')
    const TEST_CONV_UUID = 'abc123-def456'
    const TEST_ACTIVITY_ID = toRestId('activity-123', 'MESSAGE')

    const mockActivity = (text: string, overrides?: Partial<Record<string, unknown>>) => ({
      id: 'activity-123',
      verb: 'post',
      actor: { displayName: 'Test User', emailAddress: 'test@example.com', entryUUID: 'user-uuid' },
      object: { objectType: 'comment', content: text, displayName: text },
      target: { id: TEST_CONV_UUID },
      published: '2026-01-01T00:00:00.000Z',
      ...overrides,
    })

    const mockConversation = (activities: ReturnType<typeof mockActivity>[]) => ({
      id: TEST_CONV_UUID,
      activities: { items: activities },
    })

    // These tests exercise the cleartext internal-API shape, so the KMS-backed
    // encryption service is cleared after login; the encrypted path has its own
    // createEncryptedClient that re-attaches a stub service.
    const createExtractedClient = async () => {
      const client = await new WebexClient().login({
        token: 'extracted-token',
        deviceUrl: TEST_DEVICE_URL,
        tokenType: 'extracted',
      })
      ;(client as unknown as { encryption: null }).encryption = null
      return client
    }

    describe('sendMessage', () => {
      it('posts activity to /activities with POST method', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        expect(fetchCalls[0].url).toBe(`${CONV_BASE}/activities`)
        expect(fetchCalls[0].options?.method).toBe('POST')
      })

      it('body has verb, object type, and displayName (no content for plain text)', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.verb).toBe('post')
        expect(body.object.objectType).toBe('comment')
        expect(body.object.displayName).toBe('Hello world')
        expect(body.object.content).toBeUndefined()
      })

      it('body has target with decoded conv UUID and conversation type', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.target.id).toBe(TEST_CONV_UUID)
        expect(body.target.objectType).toBe('conversation')
      })

      it('body has clientTempId starting with tmp-', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.clientTempId).toStartWith('tmp-')
      })

      it('includes cisco-device-url header', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        expect(fetchCalls[0].options?.headers).toMatchObject({
          'cisco-device-url': TEST_DEVICE_URL,
        })
      })

      it('returns WebexMessage mapped from activity response', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        const message = await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        expect(message.id).toBe(TEST_ACTIVITY_ID)
        expect(message.text).toBe('Hello world')
        expect(message.personEmail).toBe('test@example.com')
        expect(message.created).toBe('2026-01-01T00:00:00.000Z')
      })

      it('markdown option converts content to HTML and strips displayName', async () => {
        mockResponse(mockActivity('bold text'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, '**bold text**', { markdown: true })

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.displayName).toBe('bold text')
        expect(body.object.content).toBe('<strong>bold text</strong>')
        expect(body.object.markdown).toBeUndefined()
      })

      it('plain text messages omit content field', async () => {
        mockResponse(mockActivity('Hello world'))

        const client = await createExtractedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.displayName).toBe('Hello world')
        expect(body.object.content).toBeUndefined()
      })
    })

    describe('listMessages', () => {
      it('calls GET on conversations endpoint with activitiesLimit and participantsLimit', async () => {
        mockResponse(mockConversation([mockActivity('Hello')]))

        const client = await createExtractedClient()
        await client.listMessages(TEST_ROOM_ID)

        expect(fetchCalls[0].url).toBe(
          `${CONV_BASE}/conversations/${TEST_CONV_UUID}?activitiesLimit=50&participantsLimit=0`,
        )
      })

      it('filters activities to only those with verb post', async () => {
        mockResponse(
          mockConversation([
            mockActivity('Hello'),
            { ...mockActivity('Deleted'), verb: 'delete' },
            mockActivity('World'),
          ]),
        )

        const client = await createExtractedClient()
        const messages = await client.listMessages(TEST_ROOM_ID)

        expect(messages).toHaveLength(2)
        expect(messages[0].text).toBe('Hello')
        expect(messages[1].text).toBe('World')
      })

      it('maps each activity to WebexMessage format', async () => {
        mockResponse(mockConversation([mockActivity('Hello')]))

        const client = await createExtractedClient()
        const messages = await client.listMessages(TEST_ROOM_ID)

        expect(messages[0].id).toBe(TEST_ACTIVITY_ID)
        expect(messages[0].text).toBe('Hello')
        expect(messages[0].personEmail).toBe('test@example.com')
        expect(messages[0].created).toBe('2026-01-01T00:00:00.000Z')
      })

      it('passes custom max to activitiesLimit', async () => {
        mockResponse(mockConversation([]))

        const client = await createExtractedClient()
        await client.listMessages(TEST_ROOM_ID, { max: 25 })

        expect(fetchCalls[0].url).toContain('activitiesLimit=25')
      })

      it('includes cisco-device-url header', async () => {
        mockResponse(mockConversation([]))

        const client = await createExtractedClient()
        await client.listMessages(TEST_ROOM_ID)

        expect(fetchCalls[0].options?.headers).toMatchObject({
          'cisco-device-url': TEST_DEVICE_URL,
        })
      })
    })

    describe('getMessage', () => {
      it('calls GET on activities endpoint', async () => {
        mockResponse(mockActivity('Hello'))

        const client = await createExtractedClient()
        await client.getMessage('activity-123')

        expect(fetchCalls[0].url).toBe(`${CONV_BASE}/activities/activity-123`)
      })

      it('maps activity to WebexMessage format', async () => {
        mockResponse(mockActivity('Hello'))

        const client = await createExtractedClient()
        const message = await client.getMessage('activity-123')

        expect(message.id).toBe(TEST_ACTIVITY_ID)
        expect(message.text).toBe('Hello')
        expect(message.personEmail).toBe('test@example.com')
      })
    })

    describe('deleteMessage', () => {
      it('first GETs the activity then POSTs a delete activity', async () => {
        mockResponse(mockActivity('Hello'))
        mockResponse({})

        const client = await createExtractedClient()
        await client.deleteMessage('activity-123')

        expect(fetchCalls[0].url).toBe(`${CONV_BASE}/activities/activity-123`)
        expect(fetchCalls[1].url).toBe(`${CONV_BASE}/activities`)
        expect(fetchCalls[1].options?.method).toBe('POST')
      })

      it('delete activity body has correct verb, object, and target', async () => {
        mockResponse(mockActivity('Hello'))
        mockResponse({})

        const client = await createExtractedClient()
        await client.deleteMessage('activity-123')

        const body = JSON.parse(fetchCalls[1].options?.body as string)
        expect(body.verb).toBe('delete')
        expect(body.object.id).toBe('activity-123')
        expect(body.object.objectType).toBe('activity')
        expect(body.target.id).toBe(TEST_CONV_UUID)
      })

      it('throws WebexError when activity has no target', async () => {
        mockResponse({ ...mockActivity('Hello'), target: undefined })

        const client = await createExtractedClient()
        await expect(client.deleteMessage('activity-123')).rejects.toThrow(WebexError)
      })
    })

    describe('editMessage', () => {
      const mockEditActivity = (text: string, parentId = 'activity-123') =>
        mockActivity(text, { parent: { id: parentId, type: 'edit' } })

      it('posts activity with verb post and parent edit reference', async () => {
        mockResponse(mockEditActivity('Edited text'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.verb).toBe('post')
        expect(body.parent).toEqual({ id: 'activity-123', type: 'edit' })
      })

      it('plain text edit populates both displayName and content to avoid auto-tombstone', async () => {
        mockResponse(mockEditActivity('Edited text'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.objectType).toBe('comment')
        expect(body.object.displayName).toBe('Edited text')
        expect(body.object.content).toBe('Edited text')
      })

      it('plain text edit HTML-escapes content so bare URLs do not become sparkBase markup', async () => {
        mockResponse(mockEditActivity('https://example.com/a?x=1&y=2'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'https://example.com/a?x=1&y=2')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.displayName).toBe('https://example.com/a?x=1&y=2')
        expect(body.object.content).toBe('https://example.com/a?x=1&amp;y=2')
        expect(body.object.content).not.toContain('&amp;amp;')
        expect(body.object.content).not.toContain('<a ')
        expect(body.object.content).not.toContain('onClick')
        expect(body.object.content).not.toContain('sparkBase')
      })

      it('plain text edit escapes angle brackets and quotes in content', async () => {
        mockResponse(mockEditActivity('a <b> "c" \'d\' & e'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'a <b> "c" \'d\' & e')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.content).toBe('a &lt;b&gt; &quot;c&quot; &#39;d&#39; &amp; e')
      })

      it('clientTempId uses -edit suffix to match Webex web client format', async () => {
        mockResponse(mockEditActivity('Edited text'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.clientTempId).toMatch(/^tmp-\d+-edit$/)
      })

      it('target has decoded conv UUID', async () => {
        mockResponse(mockEditActivity('Edited text'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.target.id).toBe(TEST_CONV_UUID)
      })

      it('markdown option converts content to HTML and strips displayName', async () => {
        mockResponse(mockEditActivity('italic text'))

        const client = await createExtractedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, '_italic text_', { markdown: true })

        const body = JSON.parse(fetchCalls[0].options?.body as string)
        expect(body.object.displayName).toBe('italic text')
        expect(body.object.content).toBe('<em>italic text</em>')
        expect(body.object.markdown).toBeUndefined()
      })

      it('tolerates responses that omit parent (minimal success shape)', async () => {
        mockResponse(mockActivity('Edited text'))

        const client = await createExtractedClient()
        const message = await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')
        expect(message.id).toBe(TEST_ACTIVITY_ID)
      })

      it('throws when server returns activity linked to a different parent', async () => {
        mockResponse(mockEditActivity('Edited text', 'activity-999'))

        const client = await createExtractedClient()
        await expect(client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')).rejects.toThrow(/Edit rejected/)
      })
    })

    describe('encrypted send and edit', () => {
      const TEST_KEY_URI = 'kms://kms-aore.wbx2.com/keys/test-key-id'

      const decodeJweHeader = (jwe: string): Record<string, unknown> => {
        const [header = ''] = jwe.split('.')
        const padded = header + '='.repeat((4 - (header.length % 4)) % 4)
        return JSON.parse(Buffer.from(padded, 'base64url').toString('utf8')) as Record<string, unknown>
      }

      const createEncryptedClient = async () => {
        const keystore = jose.JWK.createKeyStore()
        const key = await keystore.generate('oct', 256, { alg: 'A256GCM' })
        const rawKeys = new Map<string, string>([[TEST_KEY_URI, JSON.stringify({ jwk: key.toJSON(true) })]])
        const service = new WebexEncryptionService(rawKeys)
        const client = await createExtractedClient()
        ;(client as unknown as { encryption: WebexEncryptionService }).encryption = service
        return client
      }

      it('plain text send omits content field on encrypted path (preserves prior fix)', async () => {
        mockResponse({ id: TEST_CONV_UUID, defaultActivityEncryptionKeyUrl: TEST_KEY_URI })
        mockResponse(mockActivity('Hello world'))

        const client = await createEncryptedClient()
        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[1].options?.body as string)
        expect(body.object.content).toBeUndefined()
        expect(body.object.displayName.startsWith('eyJ')).toBe(true)
        expect(body.encryptionKeyUrl).toBe(TEST_KEY_URI)
      })

      it('plain text edit encrypts both displayName and content with kid in JWE header', async () => {
        mockResponse({ id: TEST_CONV_UUID, defaultActivityEncryptionKeyUrl: TEST_KEY_URI })
        mockResponse(mockActivity('Edited text', { parent: { id: 'activity-123', type: 'edit' } }))

        const client = await createEncryptedClient()
        await client.editMessage('activity-123', TEST_ROOM_ID, 'Edited text')

        const body = JSON.parse(fetchCalls[1].options?.body as string)
        expect(body.object.displayName.startsWith('eyJ')).toBe(true)
        expect(body.object.content.startsWith('eyJ')).toBe(true)
        expect(body.encryptionKeyUrl).toBe(TEST_KEY_URI)
        expect(decodeJweHeader(body.object.displayName).kid).toBe(TEST_KEY_URI)
        expect(decodeJweHeader(body.object.content).kid).toBe(TEST_KEY_URI)
      })

      it('explicit-credential login encrypts the send without manually attaching a service', async () => {
        const keystore = jose.JWK.createKeyStore()
        const key = await keystore.generate('oct', 256, { alg: 'A256GCM' })
        const serializedKey = JSON.stringify({ uri: TEST_KEY_URI, jwk: key.toJSON(true) })

        const client = await new WebexClient().login({
          token: 'extracted-token',
          deviceUrl: TEST_DEVICE_URL,
          tokenType: 'extracted',
        })
        const service = (client as unknown as { encryption: WebexEncryptionService | null }).encryption
        expect(service).toBeInstanceOf(WebexEncryptionService)
        service?.setKeyProvider({ fetchKey: async () => serializedKey })

        mockResponse({ id: TEST_CONV_UUID, defaultActivityEncryptionKeyUrl: TEST_KEY_URI })
        mockResponse(mockActivity('Hello world'))

        await client.sendMessage(TEST_ROOM_ID, 'Hello world')

        const body = JSON.parse(fetchCalls[1].options?.body as string)
        expect(body.object.displayName.startsWith('eyJ')).toBe(true)
        expect(body.encryptionKeyUrl).toBe(TEST_KEY_URI)
        expect(decodeJweHeader(body.object.displayName).kid).toBe(TEST_KEY_URI)
      })
    })

    describe('sendDirectMessage', () => {
      it('calls public rooms and memberships API to find room, then sends via internal API', async () => {
        mockResponse({ items: [{ id: TEST_ROOM_ID, title: 'DM', type: 'direct' }] })
        mockResponse({
          items: [{ id: 'm1', roomId: TEST_ROOM_ID, personEmail: 'target@example.com', isModerator: false }],
        })
        mockResponse(mockActivity('Hello'))

        const client = await createExtractedClient()
        const message = await client.sendDirectMessage('target@example.com', 'Hello')

        expect(fetchCalls[0].url).toContain('/rooms?type=direct&max=100')
        expect(fetchCalls[1].url).toContain('/memberships?roomId=')
        expect(fetchCalls[2].url).toBe(`${CONV_BASE}/activities`)
        expect(message.id).toBe(TEST_ACTIVITY_ID)
      })

      it('throws WebexError when no existing direct conversation found', async () => {
        mockResponse({ items: [{ id: 'room-x', title: 'DM', type: 'direct' }] })
        mockResponse({
          items: [{ id: 'm1', roomId: 'room-x', personEmail: 'other@example.com', isModerator: false }],
        })

        const client = await createExtractedClient()
        await expect(client.sendDirectMessage('target@example.com', 'Hello')).rejects.toThrow(WebexError)
      })
    })

    describe('uploadFile', () => {
      const mockUploadFlow = () => {
        // given: the full internal share flow — conv lookup, space, session, PUT, finish, content
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://files.wbx2.com/spaces/sp1' })
        mockResponse({
          uploadUrl: 'https://up.wbx2.com/upload/sess1',
          finishUploadUrl: 'https://up.wbx2.com/upload/sess1/finish',
        })
        mockResponse({}, 200)
        mockResponse({ downloadUrl: 'https://files.wbx2.com/files/f1' })
        mockResponse({ ...mockActivity(''), verb: 'share' })
      }

      const file = () => ({ content: new Blob(['hello world']), filename: 'note.txt' })

      it('routes to the internal conversation API instead of the public messages endpoint', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, file())

        expect(fetchCalls.every((c) => !c.url.includes('webexapis.com/v1/messages'))).toBe(true)
        expect(fetchCalls.at(-1)?.url).toBe(`${CONV_BASE}/conversations/${TEST_CONV_UUID}/content`)
        expect(fetchCalls.at(-1)?.options?.method).toBe('POST')
      })

      it('requests a space, opens an upload session, PUTs the bytes, then finalizes', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, file())

        expect(fetchCalls[1].url).toBe(`${CONV_BASE}/conversations/${TEST_CONV_UUID}/space`)
        expect(fetchCalls[1].options?.method).toBe('PUT')
        expect(fetchCalls[2].url).toBe('https://files.wbx2.com/spaces/sp1/upload_sessions')
        expect(fetchCalls[3].url).toBe('https://up.wbx2.com/upload/sess1')
        expect(fetchCalls[3].options?.method).toBe('PUT')
        expect(fetchCalls[4].url).toBe('https://up.wbx2.com/upload/sess1/finish')
      })

      it('finalize body carries fileSize and a sha256 fileHash of the uploaded bytes', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, file())

        const body = JSON.parse(fetchCalls[4].options?.body as string)
        expect(body.fileSize).toBe(11)
        expect(body.fileHash).toMatch(/^[0-9a-f]{64}$/)
      })

      it('share activity references the uploaded file with download url and metadata', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, file())

        const body = JSON.parse(fetchCalls.at(-1)?.options?.body as string)
        expect(body.verb).toBe('share')
        expect(body.object.objectType).toBe('content')
        expect(body.object.contentCategory).toBe('documents')
        const item = body.object.files.items[0]
        expect(item.objectType).toBe('file')
        expect(item.url).toBe('https://files.wbx2.com/files/f1')
        expect(item.fileSize).toBe(11)
        expect(item.mimeType).toBe('text/plain')
        expect(item.displayName).toBe('note.txt')
      })

      it('attaches an optional text comment to the share activity', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, file(), { text: 'see attached' })

        const body = JSON.parse(fetchCalls.at(-1)?.options?.body as string)
        expect(body.object.displayName).toBe('see attached')
      })

      it('categorizes images by mime type', async () => {
        mockUploadFlow()

        const client = await createExtractedClient()
        await client.uploadFile(TEST_ROOM_ID, { content: new Blob(['x']), filename: 'photo.png' })

        const body = JSON.parse(fetchCalls.at(-1)?.options?.body as string)
        expect(body.object.contentCategory).toBe('images')
        expect(body.object.files.items[0].mimeType).toBe('image/png')
      })

      it('refuses to upload when the server returns an untrusted space url', async () => {
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://evil.example.com/spaces/sp1' })

        const client = await createExtractedClient()

        await expect(client.uploadFile(TEST_ROOM_ID, file())).rejects.toThrow('untrusted host')
        expect(fetchCalls.every((c) => !c.url.includes('evil.example.com'))).toBe(true)
      })

      it('refuses to upload when the server returns a non-https upload url', async () => {
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://files.wbx2.com/spaces/sp1' })
        mockResponse({
          uploadUrl: 'http://up.wbx2.com/upload/sess1',
          finishUploadUrl: 'https://up.wbx2.com/upload/sess1/finish',
        })

        const client = await createExtractedClient()

        await expect(client.uploadFile(TEST_ROOM_ID, file())).rejects.toThrow('untrusted host')
      })

      it('accepts trusted Webex urls that carry an explicit port', async () => {
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://files.wbx2.com:443/spaces/sp1' })
        mockResponse({
          uploadUrl: 'https://up.wbx2.com:443/upload/sess1',
          finishUploadUrl: 'https://up.wbx2.com:443/upload/sess1/finish',
        })
        mockResponse({}, 200)
        mockResponse({ downloadUrl: 'https://files.wbx2.com/files/f1' })
        mockResponse({ ...mockActivity(''), verb: 'share' })

        const client = await createExtractedClient()

        await expect(client.uploadFile(TEST_ROOM_ID, file())).resolves.toBeDefined()
      })

      it('accepts webexcontent.com upload urls returned by the server', async () => {
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://files-prod-us-west-2.webexcontent.com/spaces/sp1' })
        mockResponse({
          uploadUrl: 'https://files-prod-us-west-2.webexcontent.com/upload/sess1',
          finishUploadUrl: 'https://files-prod-us-west-2.webexcontent.com/upload/sess1/finish',
        })
        mockResponse({}, 200)
        mockResponse({ downloadUrl: 'https://files-prod-us-west-2.webexcontent.com/files/f1' })
        mockResponse({ ...mockActivity(''), verb: 'share' })

        const client = await createExtractedClient()

        await expect(client.uploadFile(TEST_ROOM_ID, file())).resolves.toBeDefined()
      })

      it('refuses non-webex upload hosts that merely contain a trusted host', async () => {
        mockResponse({ id: TEST_CONV_UUID })
        mockResponse({ spaceUrl: 'https://webexcontent.com.evil.example/spaces/sp1' })

        const client = await createExtractedClient()

        await expect(client.uploadFile(TEST_ROOM_ID, file())).rejects.toThrow('untrusted host')
        expect(fetchCalls.every((c) => !c.url.includes('evil.example'))).toBe(true)
      })
    })

    describe('error handling', () => {
      it('throws WebexError when internal API returns non-OK response', async () => {
        fetchResponses.push(
          new Response(JSON.stringify({ message: 'Activity not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const client = await createExtractedClient()
        await expect(client.getMessage('bad-activity')).rejects.toThrow(WebexError)
      })

      it('error message extracted from internal API response body', async () => {
        fetchResponses.push(
          new Response(JSON.stringify({ message: 'Activity not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const client = await createExtractedClient()
        let error: WebexError | null = null
        try {
          await client.getMessage('bad-activity')
        } catch (err) {
          error = err as WebexError
        }

        expect(error).toBeInstanceOf(WebexError)
        expect(error?.message).toBe('Activity not found')
      })
    })
  })

  describe('error handling', () => {
    it('throws WebexError with parsed message from response body', async () => {
      mockResponse({ message: 'The requested resource could not be found.', trackingId: 'abc' }, 404)

      const client = await new WebexClient().login({ token: 'test-token' })
      let error: WebexError | null = null
      try {
        await client.testAuth()
      } catch (err) {
        error = err as WebexError
      }

      expect(error).toBeInstanceOf(WebexError)
      expect(error?.message).toBe('The requested resource could not be found.')
    })

    it('falls back to HTTP status message when no body', async () => {
      fetchResponses.push(
        new Response(null, {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = await new WebexClient().login({ token: 'test-token' })
      let error: WebexError | null = null
      try {
        await client.testAuth()
      } catch (err) {
        error = err as WebexError
      }

      expect(error).toBeInstanceOf(WebexError)
      expect(error?.message).toBe('HTTP 403')
    })
  })
})

const MAX_RETRIES = 3
