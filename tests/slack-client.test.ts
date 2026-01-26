import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { WebClient } from '@slack/web-api'
import { SlackClient, SlackError } from '../src/lib/slack-client'

// Mock WebClient
const mockWebClient = {
  conversations: {
    list: mock(() => Promise.resolve({ ok: true, channels: [] })),
    info: mock(() => Promise.resolve({ ok: true, channel: {} })),
    history: mock(() => Promise.resolve({ ok: true, messages: [] })),
  },
  chat: {
    postMessage: mock(() => Promise.resolve({ ok: true, ts: '123.456', message: {} })),
    update: mock(() => Promise.resolve({ ok: true, ts: '123.456', message: {} })),
    delete: mock(() => Promise.resolve({ ok: true })),
  },
  reactions: {
    add: mock(() => Promise.resolve({ ok: true })),
    remove: mock(() => Promise.resolve({ ok: true })),
  },
  users: {
    list: mock(() => Promise.resolve({ ok: true, members: [] })),
    info: mock(() => Promise.resolve({ ok: true, user: {} })),
  },
  files: {
    uploadV2: mock(() => Promise.resolve({ ok: true, file: {} })),
    list: mock(() => Promise.resolve({ ok: true, files: [] })),
  },
  auth: {
    test: mock(() => Promise.resolve({ ok: true, user_id: 'U123', team_id: 'T123' })),
  },
}

// Helper to reset all mocks
function resetMocks() {
  Object.values(mockWebClient).forEach((group) => {
    Object.values(group).forEach((fn) => {
      if (typeof fn.mockReset === 'function') {
        fn.mockReset()
      }
    })
  })
}

describe('SlackClient', () => {
  describe('constructor', () => {
    test('throws SlackError when token is empty', () => {
      expect(() => new SlackClient('', 'xoxd-cookie')).toThrow(SlackError)
      expect(() => new SlackClient('', 'xoxd-cookie')).toThrow('Token is required')
    })

    test('throws SlackError when cookie is empty', () => {
      expect(() => new SlackClient('xoxc-token', '')).toThrow(SlackError)
      expect(() => new SlackClient('xoxc-token', '')).toThrow('Cookie is required')
    })

    test('throws SlackError when both token and cookie are empty', () => {
      expect(() => new SlackClient('', '')).toThrow(SlackError)
    })

    test('creates client successfully with valid token and cookie', () => {
      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      expect(client).toBeInstanceOf(SlackClient)
    })
  })

  describe('testAuth', () => {
    beforeEach(() => resetMocks())

    test('returns auth info on success', async () => {
      mockWebClient.auth.test.mockResolvedValue({
        ok: true,
        user_id: 'U123',
        team_id: 'T123',
        user: 'testuser',
        team: 'Test Team',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.testAuth()
      expect(result.user_id).toBe('U123')
      expect(result.team_id).toBe('T123')
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.auth.test.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.testAuth()).rejects.toThrow(SlackError)
    })
  })

  describe('listChannels', () => {
    beforeEach(() => resetMocks())

    test('returns list of channels', async () => {
      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C123',
            name: 'general',
            is_private: false,
            is_archived: false,
            created: 1234567890,
            creator: 'U123',
          },
          {
            id: 'C456',
            name: 'random',
            is_private: false,
            is_archived: false,
            created: 1234567891,
            creator: 'U123',
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const channels = await client.listChannels()
      expect(channels).toHaveLength(2)
      expect(channels[0].id).toBe('C123')
      expect(channels[1].name).toBe('random')
    })

    test('handles pagination automatically', async () => {
      mockWebClient.conversations.list
        .mockResolvedValueOnce({
          ok: true,
          channels: [
            {
              id: 'C123',
              name: 'general',
              is_private: false,
              is_archived: false,
              created: 1234567890,
              creator: 'U123',
            },
          ],
          response_metadata: { next_cursor: 'cursor123' },
        })
        .mockResolvedValueOnce({
          ok: true,
          channels: [
            {
              id: 'C456',
              name: 'random',
              is_private: false,
              is_archived: false,
              created: 1234567891,
              creator: 'U123',
            },
          ],
        })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const channels = await client.listChannels()
      expect(channels).toHaveLength(2)
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(2)
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.conversations.list.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.listChannels()).rejects.toThrow(SlackError)
    })
  })

  describe('getChannel', () => {
    beforeEach(() => resetMocks())

    test('returns channel info', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C123',
          name: 'general',
          is_private: false,
          is_archived: false,
          created: 1234567890,
          creator: 'U123',
        },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const channel = await client.getChannel('C123')
      expect(channel.id).toBe('C123')
      expect(channel.name).toBe('general')
    })

    test('throws SlackError when channel not found', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getChannel('C999')).rejects.toThrow(SlackError)
    })
  })

  describe('getMessages', () => {
    beforeEach(() => resetMocks())

    test('returns messages with default limit of 20', async () => {
      const messages = Array.from({ length: 20 }, (_, i) => ({
        ts: `123.${i}`,
        text: `Message ${i}`,
        type: 'message',
      }))
      mockWebClient.conversations.history.mockResolvedValue({
        ok: true,
        messages,
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getMessages('C123')
      expect(result).toHaveLength(20)
      expect(mockWebClient.conversations.history).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', limit: 20 })
      )
    })

    test('respects custom limit', async () => {
      mockWebClient.conversations.history.mockResolvedValue({
        ok: true,
        messages: [{ ts: '123.456', text: 'Hello', type: 'message' }],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await client.getMessages('C123', 50)
      expect(mockWebClient.conversations.history).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', limit: 50 })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.conversations.history.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getMessages('C999')).rejects.toThrow(SlackError)
    })
  })

  describe('sendMessage', () => {
    beforeEach(() => resetMocks())

    test('sends message to channel', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '123.456',
        message: { ts: '123.456', text: 'Hello', type: 'message' },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const message = await client.sendMessage('C123', 'Hello')
      expect(message.ts).toBe('123.456')
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', text: 'Hello' })
      )
    })

    test('sends message to thread', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '123.789',
        message: { ts: '123.789', text: 'Reply', type: 'message', thread_ts: '123.456' },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const message = await client.sendMessage('C123', 'Reply', '123.456')
      expect(message.thread_ts).toBe('123.456')
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', text: 'Reply', thread_ts: '123.456' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.sendMessage('C999', 'Hello')).rejects.toThrow(SlackError)
    })
  })

  describe('updateMessage', () => {
    beforeEach(() => resetMocks())

    test('updates message text', async () => {
      mockWebClient.chat.update.mockResolvedValue({
        ok: true,
        ts: '123.456',
        message: { ts: '123.456', text: 'Updated', type: 'message' },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const message = await client.updateMessage('C123', '123.456', 'Updated')
      expect(message.text).toBe('Updated')
      expect(mockWebClient.chat.update).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', ts: '123.456', text: 'Updated' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.chat.update.mockResolvedValue({
        ok: false,
        error: 'message_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.updateMessage('C123', '999.999', 'Updated')).rejects.toThrow(SlackError)
    })
  })

  describe('deleteMessage', () => {
    beforeEach(() => resetMocks())

    test('deletes message', async () => {
      mockWebClient.chat.delete.mockResolvedValue({ ok: true })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.deleteMessage('C123', '123.456')).resolves.toBeUndefined()
      expect(mockWebClient.chat.delete).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', ts: '123.456' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.chat.delete.mockResolvedValue({
        ok: false,
        error: 'message_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.deleteMessage('C123', '999.999')).rejects.toThrow(SlackError)
    })
  })

  describe('addReaction', () => {
    beforeEach(() => resetMocks())

    test('adds reaction to message', async () => {
      mockWebClient.reactions.add.mockResolvedValue({ ok: true })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.addReaction('C123', '123.456', 'thumbsup')).resolves.toBeUndefined()
      expect(mockWebClient.reactions.add).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', timestamp: '123.456', name: 'thumbsup' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.reactions.add.mockResolvedValue({
        ok: false,
        error: 'already_reacted',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.addReaction('C123', '123.456', 'thumbsup')).rejects.toThrow(SlackError)
    })
  })

  describe('removeReaction', () => {
    beforeEach(() => resetMocks())

    test('removes reaction from message', async () => {
      mockWebClient.reactions.remove.mockResolvedValue({ ok: true })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.removeReaction('C123', '123.456', 'thumbsup')).resolves.toBeUndefined()
      expect(mockWebClient.reactions.remove).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', timestamp: '123.456', name: 'thumbsup' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.reactions.remove.mockResolvedValue({
        ok: false,
        error: 'no_reaction',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.removeReaction('C123', '123.456', 'thumbsup')).rejects.toThrow(SlackError)
    })
  })

  describe('listUsers', () => {
    beforeEach(() => resetMocks())

    test('returns list of users', async () => {
      mockWebClient.users.list.mockResolvedValue({
        ok: true,
        members: [
          {
            id: 'U123',
            name: 'alice',
            real_name: 'Alice',
            is_admin: false,
            is_owner: false,
            is_bot: false,
            is_app_user: false,
          },
          {
            id: 'U456',
            name: 'bob',
            real_name: 'Bob',
            is_admin: true,
            is_owner: false,
            is_bot: false,
            is_app_user: false,
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const users = await client.listUsers()
      expect(users).toHaveLength(2)
      expect(users[0].name).toBe('alice')
      expect(users[1].is_admin).toBe(true)
    })

    test('handles pagination automatically', async () => {
      mockWebClient.users.list
        .mockResolvedValueOnce({
          ok: true,
          members: [
            {
              id: 'U123',
              name: 'alice',
              real_name: 'Alice',
              is_admin: false,
              is_owner: false,
              is_bot: false,
              is_app_user: false,
            },
          ],
          response_metadata: { next_cursor: 'cursor123' },
        })
        .mockResolvedValueOnce({
          ok: true,
          members: [
            {
              id: 'U456',
              name: 'bob',
              real_name: 'Bob',
              is_admin: false,
              is_owner: false,
              is_bot: false,
              is_app_user: false,
            },
          ],
        })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const users = await client.listUsers()
      expect(users).toHaveLength(2)
      expect(mockWebClient.users.list).toHaveBeenCalledTimes(2)
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.users.list.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.listUsers()).rejects.toThrow(SlackError)
    })
  })

  describe('getUser', () => {
    beforeEach(() => resetMocks())

    test('returns user info', async () => {
      mockWebClient.users.info.mockResolvedValue({
        ok: true,
        user: {
          id: 'U123',
          name: 'alice',
          real_name: 'Alice',
          is_admin: false,
          is_owner: false,
          is_bot: false,
          is_app_user: false,
        },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const user = await client.getUser('U123')
      expect(user.id).toBe('U123')
      expect(user.name).toBe('alice')
    })

    test('throws SlackError when user not found', async () => {
      mockWebClient.users.info.mockResolvedValue({
        ok: false,
        error: 'user_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getUser('U999')).rejects.toThrow(SlackError)
    })
  })

  describe('uploadFile', () => {
    beforeEach(() => resetMocks())

    test('uploads file to channels', async () => {
      mockWebClient.files.uploadV2.mockResolvedValue({
        ok: true,
        file: {
          id: 'F123',
          name: 'test.txt',
          title: 'test.txt',
          mimetype: 'text/plain',
          size: 100,
          url_private: 'https://...',
          created: 1234567890,
          user: 'U123',
        },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const file = await client.uploadFile(['C123'], Buffer.from('test'), 'test.txt')
      expect(file.id).toBe('F123')
      expect(mockWebClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({ channel_id: 'C123', filename: 'test.txt' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.files.uploadV2.mockResolvedValue({
        ok: false,
        error: 'file_upload_failed',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.uploadFile(['C123'], Buffer.from('test'), 'test.txt')).rejects.toThrow(
        SlackError
      )
    })
  })

  describe('listFiles', () => {
    beforeEach(() => resetMocks())

    test('returns list of files', async () => {
      mockWebClient.files.list.mockResolvedValue({
        ok: true,
        files: [
          {
            id: 'F123',
            name: 'test.txt',
            title: 'test.txt',
            mimetype: 'text/plain',
            size: 100,
            url_private: 'https://...',
            created: 1234567890,
            user: 'U123',
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const files = await client.listFiles()
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('test.txt')
    })

    test('filters by channel when provided', async () => {
      mockWebClient.files.list.mockResolvedValue({
        ok: true,
        files: [],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await client.listFiles('C123')
      expect(mockWebClient.files.list).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123' })
      )
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.files.list.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.listFiles()).rejects.toThrow(SlackError)
    })
  })

  describe('rate limiting', () => {
    beforeEach(() => resetMocks())

    test('retries on rate limit error with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limited')
      ;(rateLimitError as any).code = 'slack_webapi_rate_limited_error'
      ;(rateLimitError as any).retryAfter = 0.001

      mockWebClient.conversations.list
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          ok: true,
          channels: [
            {
              id: 'C123',
              name: 'general',
              is_private: false,
              is_archived: false,
              created: 1234567890,
              creator: 'U123',
            },
          ],
        })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const channels = await client.listChannels()
      expect(channels).toHaveLength(1)
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(3)
    })

    test('throws SlackError after max retries (3)', async () => {
      const rateLimitError = new Error('Rate limited')
      ;(rateLimitError as any).code = 'slack_webapi_rate_limited_error'
      ;(rateLimitError as any).retryAfter = 0.001

      mockWebClient.conversations.list.mockRejectedValue(rateLimitError)

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.listChannels()).rejects.toThrow(SlackError)
      // Initial call + 3 retries = 4 total calls
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(4)
    })

    test('does not retry on non-rate-limit errors', async () => {
      const otherError = new Error('Some other error')
      ;(otherError as any).code = 'some_other_error'

      mockWebClient.conversations.list.mockRejectedValue(otherError)

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.listChannels()).rejects.toThrow(SlackError)
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(1)
    })
  })

  describe('SlackError', () => {
    test('is an instance of Error', () => {
      const error = new SlackError('test error', 'test_code')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SlackError)
    })

    test('has message and code properties', () => {
      const error = new SlackError('test error', 'test_code')
      expect(error.message).toBe('test error')
      expect(error.code).toBe('test_code')
    })

    test('has name property set to SlackError', () => {
      const error = new SlackError('test error', 'test_code')
      expect(error.name).toBe('SlackError')
    })
  })
})
