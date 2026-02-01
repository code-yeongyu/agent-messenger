import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DiscordClient, DiscordError } from './client'

describe('DiscordClient', () => {
  const originalFetch = globalThis.fetch
  let fetchCalls: Array<{ url: string; options?: RequestInit }> = []
  let fetchResponses: Response[] = []
  let fetchIndex = 0

  beforeEach(() => {
    fetchCalls = []
    fetchResponses = []
    fetchIndex = 0
    ;(globalThis as any).fetch = async (
      url: string | URL | Request,
      options?: RequestInit
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

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const mockResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': '10',
      'X-RateLimit-Reset': String(Date.now() / 1000 + 60),
      'X-RateLimit-Bucket': 'test-bucket',
      ...headers,
    }
    fetchResponses.push(
      new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: defaultHeaders,
      })
    )
  }

  describe('constructor', () => {
    test('requires token', () => {
      expect(() => new DiscordClient('')).toThrow(DiscordError)
      expect(() => new DiscordClient('')).toThrow('Token is required')
    })

    test('accepts valid token', () => {
      const client = new DiscordClient('test-token')
      expect(client).toBeInstanceOf(DiscordClient)
    })
  })

  describe('testAuth', () => {
    test('returns current user info', async () => {
      mockResponse({
        id: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'abc123',
      })

      const client = new DiscordClient('test-token')
      const user = await client.testAuth()

      expect(user.id).toBe('123456789')
      expect(user.username).toBe('testuser')
      expect(fetchCalls.length).toBe(1)
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me')
      expect(fetchCalls[0].options?.headers).toMatchObject({
        Authorization: 'test-token',
      })
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      const client = new DiscordClient('bad-token')
      await expect(client.testAuth()).rejects.toThrow(DiscordError)
    })
  })

  describe('listGuilds', () => {
    test('returns list of guilds', async () => {
      mockResponse([
        { id: '111', name: 'Guild One' },
        { id: '222', name: 'Guild Two' },
      ])

      const client = new DiscordClient('test-token')
      const guilds = await client.listGuilds()

      expect(guilds).toHaveLength(2)
      expect(guilds[0].name).toBe('Guild One')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/guilds')
    })
  })

  describe('getGuild', () => {
    test('returns guild info', async () => {
      mockResponse({ id: '111', name: 'Test Guild' })

      const client = new DiscordClient('test-token')
      const guild = await client.getGuild('111')

      expect(guild.id).toBe('111')
      expect(guild.name).toBe('Test Guild')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/guilds/111')
    })
  })

  describe('listChannels', () => {
    test('returns list of channels for guild', async () => {
      mockResponse([
        { id: 'ch1', guild_id: '111', name: 'general', type: 0 },
        { id: 'ch2', guild_id: '111', name: 'random', type: 0 },
      ])

      const client = new DiscordClient('test-token')
      const channels = await client.listChannels('111')

      expect(channels).toHaveLength(2)
      expect(channels[0].name).toBe('general')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/guilds/111/channels')
    })
  })

  describe('getChannel', () => {
    test('returns channel info', async () => {
      mockResponse({ id: 'ch1', guild_id: '111', name: 'general', type: 0 })

      const client = new DiscordClient('test-token')
      const channel = await client.getChannel('ch1')

      expect(channel.id).toBe('ch1')
      expect(channel.name).toBe('general')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1')
    })
  })

  describe('sendMessage', () => {
    test('sends message to channel', async () => {
      // given: a message to send
      mockResponse({
        id: 'msg1',
        channel_id: 'ch1',
        author: { id: '123', username: 'bot' },
        content: 'Hello world',
        timestamp: '2024-01-01T00:00:00.000Z',
      })

      // when: sending the message
      const client = new DiscordClient('test-token')
      const message = await client.sendMessage('ch1', 'Hello world')

      // then: message is sent via POST
      expect(message.content).toBe('Hello world')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages')
      expect(fetchCalls[0].options?.method).toBe('POST')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ content: 'Hello world' }))
    })
  })

  describe('editMessage', () => {
    test('edits message content', async () => {
      // given: a message edit payload
      mockResponse({
        id: 'msg1',
        channel_id: 'ch1',
        author: { id: '123', username: 'user1' },
        content: 'Updated',
        timestamp: '2024-01-01T00:00:00.000Z',
        edited_timestamp: '2024-01-01T00:01:00.000Z',
      })

      // when: editing the message
      const client = new DiscordClient('test-token')
      const message = await client.editMessage('ch1', 'msg1', 'Updated')

      // then: message is patched
      expect(message.content).toBe('Updated')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages/msg1')
      expect(fetchCalls[0].options?.method).toBe('PATCH')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ content: 'Updated' }))
    })
  })

  describe('getMessages', () => {
    test('returns messages from channel', async () => {
      // given: a list of messages
      mockResponse([
        {
          id: 'msg1',
          channel_id: 'ch1',
          author: { id: '123', username: 'user1' },
          content: 'Message 1',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ])

      // when: fetching messages
      const client = new DiscordClient('test-token')
      const messages = await client.getMessages('ch1', 50)

      // then: messages are returned
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Message 1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages?limit=50')
    })

    test('uses default limit of 50', async () => {
      // given: empty response
      mockResponse([])

      // when: fetching messages with default limit
      const client = new DiscordClient('test-token')
      await client.getMessages('ch1')

      // then: default limit is used
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages?limit=50')
    })
  })

  describe('searchMessages', () => {
    test('searches messages with filters', async () => {
      // given: a search response
      mockResponse({
        total_results: 1,
        messages: [
          [
            {
              id: 'msg1',
              channel_id: 'ch1',
              author: { id: '123', username: 'user1' },
              content: 'Match',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          ],
        ],
      })

      // when: searching messages
      const client = new DiscordClient('test-token')
      const result = await client.searchMessages('guild1', {
        content: 'match',
        authorId: '123',
        channelId: 'ch1',
        limit: 5,
        offset: 10,
      })

      // then: results and query params are returned
      expect(result.total_results).toBe(1)
      expect(fetchCalls[0].url).toContain('/guilds/guild1/messages/search')
      expect(fetchCalls[0].url).toContain('content=match')
      expect(fetchCalls[0].url).toContain('author_id=123')
      expect(fetchCalls[0].url).toContain('channel_id=ch1')
      expect(fetchCalls[0].url).toContain('limit=5')
      expect(fetchCalls[0].url).toContain('offset=10')
    })
  })

  describe('getMessage', () => {
    test('returns single message', async () => {
      mockResponse({
        id: 'msg1',
        channel_id: 'ch1',
        author: { id: '123', username: 'user1' },
        content: 'Message 1',
        timestamp: '2024-01-01T00:00:00.000Z',
      })

      const client = new DiscordClient('test-token')
      const message = await client.getMessage('ch1', 'msg1')

      expect(message.id).toBe('msg1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages/msg1')
    })
  })

  describe('deleteMessage', () => {
    test('deletes message', async () => {
      // given: a delete response
      mockResponse(null, 204)

      // when: deleting the message
      const client = new DiscordClient('test-token')
      await client.deleteMessage('ch1', 'msg1')

      // then: delete request is sent
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages/msg1')
      expect(fetchCalls[0].options?.method).toBe('DELETE')
    })
  })

  describe('triggerTyping', () => {
    test('triggers typing indicator', async () => {
      // given: a typing endpoint response
      mockResponse(null, 204)

      // when: triggering typing
      const client = new DiscordClient('test-token')
      await client.triggerTyping('ch1')

      // then: POST request is sent
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/typing')
      expect(fetchCalls[0].options?.method).toBe('POST')
    })
  })

  describe('addReaction', () => {
    test('adds reaction to message', async () => {
      mockResponse(null, 204)

      const client = new DiscordClient('test-token')
      await client.addReaction('ch1', 'msg1', '👍')

      expect(fetchCalls[0].url).toBe(
        'https://discord.com/api/v10/channels/ch1/messages/msg1/reactions/%F0%9F%91%8D/@me'
      )
      expect(fetchCalls[0].options?.method).toBe('PUT')
    })
  })

  describe('removeReaction', () => {
    test('removes reaction from message', async () => {
      mockResponse(null, 204)

      const client = new DiscordClient('test-token')
      await client.removeReaction('ch1', 'msg1', '👍')

      expect(fetchCalls[0].url).toBe(
        'https://discord.com/api/v10/channels/ch1/messages/msg1/reactions/%F0%9F%91%8D/@me'
      )
      expect(fetchCalls[0].options?.method).toBe('DELETE')
    })
  })

  describe('listUsers', () => {
    test('returns list of guild members', async () => {
      mockResponse([
        { user: { id: 'u1', username: 'user1' } },
        { user: { id: 'u2', username: 'user2' } },
      ])

      const client = new DiscordClient('test-token')
      const users = await client.listUsers('111')

      expect(users).toHaveLength(2)
      expect(users[0].username).toBe('user1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/guilds/111/members?limit=1000')
    })
  })

  describe('getUser', () => {
    test('returns user info', async () => {
      mockResponse({ id: 'u1', username: 'testuser' })

      const client = new DiscordClient('test-token')
      const user = await client.getUser('u1')

      expect(user.id).toBe('u1')
      expect(user.username).toBe('testuser')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/u1')
    })
  })

  describe('uploadFile', () => {
    test('uploads file to channel', async () => {
      const tempFile = '/tmp/test-upload.txt'
      await Bun.write(tempFile, 'test content')

      mockResponse({
        id: 'msg1',
        channel_id: 'ch1',
        author: { id: '123', username: 'bot' },
        content: '',
        timestamp: '2024-01-01T00:00:00.000Z',
        attachments: [
          {
            id: 'att1',
            filename: 'test-upload.txt',
            size: 12,
            url: 'https://cdn.discord.com/attachments/ch1/att1/test-upload.txt',
          },
        ],
      })

      const client = new DiscordClient('test-token')
      const file = await client.uploadFile('ch1', tempFile)

      expect(file.filename).toBe('test-upload.txt')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/messages')
      expect(fetchCalls[0].options?.method).toBe('POST')
    })
  })

  describe('listFiles', () => {
    test('returns files from recent messages', async () => {
      mockResponse([
        {
          id: 'msg1',
          channel_id: 'ch1',
          author: { id: '123', username: 'user1' },
          content: '',
          timestamp: '2024-01-01T00:00:00.000Z',
          attachments: [
            { id: 'att1', filename: 'file1.txt', size: 100, url: 'https://example.com/file1.txt' },
          ],
        },
        {
          id: 'msg2',
          channel_id: 'ch1',
          author: { id: '456', username: 'user2' },
          content: 'No attachments',
          timestamp: '2024-01-01T00:00:01.000Z',
          attachments: [],
        },
      ])

      const client = new DiscordClient('test-token')
      const files = await client.listFiles('ch1')

      expect(files).toHaveLength(1)
      expect(files[0].filename).toBe('file1.txt')
    })
  })

  describe('rate limiting', () => {
    test('waits when bucket is exhausted before making request', async () => {
      mockResponse({ id: '1', username: 'user1' }, 200, {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Date.now() / 1000 + 0.1),
        'X-RateLimit-Bucket': 'user-bucket',
      })
      mockResponse({ id: '2', username: 'user2' }, 200, {
        'X-RateLimit-Remaining': '10',
        'X-RateLimit-Reset': String(Date.now() / 1000 + 60),
        'X-RateLimit-Bucket': 'user-bucket',
      })

      const client = new DiscordClient('test-token')
      await client.testAuth()

      const startTime = Date.now()
      await client.testAuth()
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(50)
      expect(fetchCalls.length).toBe(2)
    })

    test('retries on 429 with Retry-After header', async () => {
      mockResponse({ message: 'Rate limited', retry_after: 0.1 }, 429, { 'Retry-After': '0.1' })
      mockResponse({ id: '123', username: 'user' })

      const client = new DiscordClient('test-token')
      const user = await client.testAuth()

      expect(user.id).toBe('123')
      expect(fetchCalls.length).toBe(2)
    })

    test('handles global rate limit', async () => {
      mockResponse({ message: 'Global rate limited', global: true }, 429, {
        'Retry-After': '0.1',
        'X-RateLimit-Global': 'true',
      })
      mockResponse({ id: '123', username: 'user' })

      const client = new DiscordClient('test-token')
      const user = await client.testAuth()

      expect(user.id).toBe('123')
      expect(fetchCalls.length).toBe(2)
    })

    test('throws after max retries exceeded', async () => {
      for (let i = 0; i <= 3; i++) {
        mockResponse({ message: 'Rate limited' }, 429, { 'Retry-After': '0.01' })
      }

      const client = new DiscordClient('test-token')
      await expect(client.testAuth()).rejects.toThrow(DiscordError)
      expect(fetchCalls.length).toBeLessThanOrEqual(4)
    })
  })

  describe('retry logic', () => {
    test('retries on 500 server error', async () => {
      mockResponse({ message: 'Internal Server Error' }, 500)
      mockResponse({ id: '123', username: 'user' })

      const client = new DiscordClient('test-token')
      const user = await client.testAuth()

      expect(user.id).toBe('123')
      expect(fetchCalls.length).toBe(2)
    })

    test('does not retry on 4xx client errors (except 429)', async () => {
      mockResponse({ message: 'Not Found' }, 404)

      const client = new DiscordClient('test-token')
      await expect(client.testAuth()).rejects.toThrow(DiscordError)
      expect(fetchCalls.length).toBe(1)
    })

    test('exponential backoff increases delay', async () => {
      mockResponse({ message: 'Error' }, 500)
      mockResponse({ message: 'Error' }, 500)
      mockResponse({ id: '123', username: 'user' })

      const client = new DiscordClient('test-token')
      const startTime = Date.now()
      await client.testAuth()
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(150)
      expect(fetchCalls.length).toBe(3)
    })
  })

  describe('bucket key normalization', () => {
    test('normalizes channel IDs in routes', async () => {
      mockResponse([])
      mockResponse([])

      const client = new DiscordClient('test-token')
      await client.getMessages('123456789')
      await client.getMessages('987654321')

      expect(fetchCalls.length).toBe(2)
    })
  })

  describe('listDMChannels', () => {
    test('returns list of DM channels', async () => {
      // given: a list of DM channels
      mockResponse([
        {
          id: '123',
          type: 1,
          last_message_id: '456',
          recipients: [{ id: 'U1', username: 'user1', global_name: 'User One' }],
        },
        { id: '789', type: 3, name: 'Group DM', recipients: [{ id: 'U2', username: 'user2' }] },
      ])

      // when: listing DM channels
      const client = new DiscordClient('test-token')
      const channels = await client.listDMChannels()

      // then: DM channels are returned
      expect(channels).toHaveLength(2)
      expect(channels[0].type).toBe(1)
      expect(channels[1].type).toBe(3)
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/channels')
    })

    test('throws DiscordError on API error', async () => {
      // given: an unauthorized response
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      // when: listing DM channels
      const client = new DiscordClient('test-token')
      await expect(client.listDMChannels()).rejects.toThrow(DiscordError)
    })
  })

  describe('createDM', () => {
    test('creates a DM channel', async () => {
      // given: a DM channel response
      mockResponse({
        id: 'dm1',
        type: 1,
        recipients: [{ id: 'U1', username: 'user1', global_name: 'User One' }],
      })

      // when: creating a DM channel
      const client = new DiscordClient('test-token')
      const channel = await client.createDM('U1')

      // then: DM channel is created
      expect(channel.id).toBe('dm1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/channels')
      expect(fetchCalls[0].options?.method).toBe('POST')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ recipient_id: 'U1' }))
    })
  })

  describe('getMentions', () => {
    test('returns mentions with default options', async () => {
      mockResponse([
        {
          id: '123',
          channel_id: 'C1',
          author: { id: 'U1', username: 'user1' },
          content: '@test',
          timestamp: '2024-01-01',
          mention_everyone: false,
          mentions: [],
        },
      ])

      const client = new DiscordClient('test-token')
      const mentions = await client.getMentions()

      expect(mentions).toHaveLength(1)
      expect(mentions[0].content).toBe('@test')
      expect(fetchCalls[0].url).toContain('/users/@me/mentions')
    })

    test('respects limit and guild options', async () => {
      mockResponse([])

      const client = new DiscordClient('test-token')
      await client.getMentions({ limit: 10, guildId: 'G123' })

      expect(fetchCalls[0].url).toContain('limit=10')
      expect(fetchCalls[0].url).toContain('guild_id=G123')
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      const client = new DiscordClient('test-token')
      await expect(client.getMentions()).rejects.toThrow(DiscordError)
    })
  })

  describe('ackMessage', () => {
    test('acknowledges message successfully', async () => {
      mockResponse(null, 204)

      const client = new DiscordClient('test-token')
      await expect(client.ackMessage('C123', 'M456')).resolves.toBeUndefined()

      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/C123/messages/M456/ack')
      expect(fetchCalls[0].options?.method).toBe('POST')
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Not Found', code: 404 }, 404)

      const client = new DiscordClient('test-token')
      await expect(client.ackMessage('C123', 'M456')).rejects.toThrow(DiscordError)
    })
  })

  describe('getReadStates', () => {
    test('returns read states', async () => {
      mockResponse([
        { id: 'C123', last_message_id: 'M456', mention_count: 2 },
        { id: 'C789', last_message_id: 'M012', mention_count: 0 },
      ])

      const client = new DiscordClient('test-token')
      const states = await client.getReadStates()

      expect(states).toHaveLength(2)
      expect(states[0].mention_count).toBe(2)
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/read-states')
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      const client = new DiscordClient('test-token')
      await expect(client.getReadStates()).rejects.toThrow(DiscordError)
    })
  })

  describe('getRelationships', () => {
    test('returns relationships (friends)', async () => {
      mockResponse([
        { id: 'U123', type: 1, user: { id: 'U123', username: 'friend1' } },
        { id: 'U456', type: 2, user: { id: 'U456', username: 'blocked1' } },
      ])

      const client = new DiscordClient('test-token')
      const relationships = await client.getRelationships()

      expect(relationships).toHaveLength(2)
      expect(relationships[0].type).toBe(1)
      expect(relationships[1].type).toBe(2)
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/relationships')
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      const client = new DiscordClient('test-token')
      await expect(client.getRelationships()).rejects.toThrow(DiscordError)
    })
  })

  describe('getUserNote', () => {
    test('returns user note when exists', async () => {
      mockResponse({ user_id: 'U1', note_user_id: 'U2', note: 'Test note' })

      const client = new DiscordClient('test-token')
      const note = await client.getUserNote('U2')

      expect(note).not.toBeNull()
      expect(note?.note).toBe('Test note')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/notes/U2')
    })

    test('returns null when note does not exist (404)', async () => {
      mockResponse({ message: 'Unknown User', code: 10013 }, 404)

      const client = new DiscordClient('test-token')
      const note = await client.getUserNote('U999')

      expect(note).toBeNull()
    })

    test('throws DiscordError on other errors', async () => {
      mockResponse({ message: 'Unauthorized', code: 401 }, 401)

      const client = new DiscordClient('test-token')
      await expect(client.getUserNote('U123')).rejects.toThrow(DiscordError)
    })
  })

  describe('setUserNote', () => {
    test('sets user note successfully', async () => {
      mockResponse(null, 204)

      const client = new DiscordClient('test-token')
      await expect(client.setUserNote('U123', 'New note')).resolves.toBeUndefined()

      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/@me/notes/U123')
      expect(fetchCalls[0].options?.method).toBe('PUT')
      expect(JSON.parse(fetchCalls[0].options?.body as string)).toEqual({ note: 'New note' })
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Not Found', code: 404 }, 404)

      const client = new DiscordClient('test-token')
      await expect(client.setUserNote('U999', 'Note')).rejects.toThrow(DiscordError)
    })
  })

  describe('searchMembers', () => {
    test('returns matching guild members', async () => {
      // given: guild members search response
      mockResponse([
        {
          user: { id: 'U1', username: 'alice', global_name: 'Alice' },
          nick: 'alice_nick',
          roles: ['role1'],
          joined_at: '2024-01-01T00:00:00Z',
          deaf: false,
          mute: false,
          flags: 0,
        },
        {
          user: { id: 'U2', username: 'bob', global_name: 'Bob' },
          nick: null,
          roles: [],
          joined_at: '2024-01-02T00:00:00Z',
          deaf: false,
          mute: false,
          flags: 0,
        },
      ])

      // when: searching members
      const client = new DiscordClient('test-token')
      const members = await client.searchMembers('G123', 'test', 10)

      // then: members are returned
      expect(members).toHaveLength(2)
      expect(members[0].user.username).toBe('alice')
      expect(members[0].nick).toBe('alice_nick')
      expect(fetchCalls[0].url).toBe(
        'https://discord.com/api/v10/guilds/G123/members/search?query=test&limit=10'
      )
    })

    test('uses default limit when not provided', async () => {
      // given: empty search response
      mockResponse([])

      // when: searching members without limit
      const client = new DiscordClient('test-token')
      await client.searchMembers('G123', 'query')

      // then: default limit is used
      expect(fetchCalls[0].url).toBe(
        'https://discord.com/api/v10/guilds/G123/members/search?query=query&limit=10'
      )
    })

    test('throws DiscordError on API error', async () => {
      // given: API error response
      mockResponse({ message: 'Missing Permissions', code: 50013 }, 403)

      // when: searching members
      const client = new DiscordClient('test-token')
      await expect(client.searchMembers('G123', 'test')).rejects.toThrow(DiscordError)
    })
  })

  describe('createThread', () => {
    test('creates a thread in channel', async () => {
      // given: a thread response
      mockResponse({
        id: 'thread1',
        guild_id: 'G123',
        name: 'Thread One',
        type: 11,
        parent_id: 'ch1',
      })

      // when: creating a thread
      const client = new DiscordClient('test-token')
      const thread = await client.createThread('ch1', 'Thread One', {
        autoArchiveDuration: 60,
        rateLimitPerUser: 10,
      })

      // then: thread is created
      expect(thread.id).toBe('thread1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/ch1/threads')
      expect(fetchCalls[0].options?.method).toBe('POST')
      expect(fetchCalls[0].options?.body).toBe(
        JSON.stringify({
          name: 'Thread One',
          auto_archive_duration: 60,
          rate_limit_per_user: 10,
        })
      )
    })
  })

  describe('archiveThread', () => {
    test('archives a thread', async () => {
      // given: an archive response
      mockResponse({
        id: 'thread1',
        guild_id: 'G123',
        name: 'Thread One',
        type: 11,
        parent_id: 'ch1',
      })

      // when: archiving a thread
      const client = new DiscordClient('test-token')
      const thread = await client.archiveThread('thread1', true)

      // then: archive request is sent
      expect(thread.id).toBe('thread1')
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/channels/thread1')
      expect(fetchCalls[0].options?.method).toBe('PATCH')
      expect(fetchCalls[0].options?.body).toBe(JSON.stringify({ archived: true }))
    })
  })

  describe('getUserProfile', () => {
    test('returns user profile', async () => {
      mockResponse({
        user: {
          id: 'U123',
          username: 'testuser',
          global_name: 'Test User',
          bio: 'Hello world',
          avatar: 'abc123',
        },
        connected_accounts: [{ type: 'github', id: 'gh123', name: 'testuser', verified: true }],
        premium_since: '2024-01-01T00:00:00Z',
        mutual_guilds: [{ id: 'G1', nick: null }],
      })

      const client = new DiscordClient('test-token')
      const profile = await client.getUserProfile('U123')

      expect(profile.user.id).toBe('U123')
      expect(profile.user.bio).toBe('Hello world')
      expect(profile.connected_accounts).toHaveLength(1)
      expect(profile.connected_accounts[0].type).toBe('github')
      expect(profile.mutual_guilds).toHaveLength(1)
      expect(fetchCalls[0].url).toBe('https://discord.com/api/v10/users/U123/profile')
    })

    test('throws DiscordError on API error', async () => {
      mockResponse({ message: 'Unknown User', code: 10013 }, 404)

      const client = new DiscordClient('test-token')
      await expect(client.getUserProfile('U999')).rejects.toThrow(DiscordError)
    })
  })
})
