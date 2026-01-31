import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { WebClient } from '@slack/web-api'
import { SlackClient, SlackError } from '../src/platforms/slack/client'

const mockWebClient: any = {
  conversations: {
    list: mock((): Promise<any> => Promise.resolve({ ok: true, channels: [] })),
    info: mock((): Promise<any> => Promise.resolve({ ok: true, channel: {} })),
    history: mock((): Promise<any> => Promise.resolve({ ok: true, messages: [] })),
    replies: mock((): Promise<any> => Promise.resolve({ ok: true, messages: [], has_more: false })),
    mark: mock((): Promise<any> => Promise.resolve({ ok: true })),
  },
  chat: {
    postMessage: mock(
      (): Promise<any> => Promise.resolve({ ok: true, ts: '123.456', message: {} })
    ),
    update: mock((): Promise<any> => Promise.resolve({ ok: true, ts: '123.456', message: {} })),
    delete: mock((): Promise<any> => Promise.resolve({ ok: true })),
  },
  reactions: {
    add: mock((): Promise<any> => Promise.resolve({ ok: true })),
    remove: mock((): Promise<any> => Promise.resolve({ ok: true })),
  },
  users: {
    list: mock((): Promise<any> => Promise.resolve({ ok: true, members: [] })),
    info: mock((): Promise<any> => Promise.resolve({ ok: true, user: {} })),
  },
  files: {
    uploadV2: mock((): Promise<any> => Promise.resolve({ ok: true, file: {} })),
    list: mock((): Promise<any> => Promise.resolve({ ok: true, files: [] })),
  },
  auth: {
    test: mock((): Promise<any> => Promise.resolve({ ok: true, user_id: 'U123', team_id: 'T123' })),
  },
  apiCall: mock((): Promise<any> => Promise.resolve({ ok: true })),
}

function resetMocks() {
  for (const group of Object.values(mockWebClient) as any[]) {
    for (const fn of Object.values(group) as any[]) {
      if (typeof fn.mockReset === 'function') {
        fn.mockReset()
      }
    }
  }
  if (typeof mockWebClient.apiCall?.mockReset === 'function') {
    mockWebClient.apiCall.mockReset()
  }
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

  describe('getThreadReplies', () => {
    beforeEach(() => resetMocks())

    test('returns thread replies including parent message', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: true,
        messages: [
          {
            ts: '123.456',
            text: 'Parent message',
            type: 'message',
            user: 'U123',
            thread_ts: '123.456',
            reply_count: 2,
          },
          {
            ts: '123.457',
            text: 'First reply',
            type: 'message',
            user: 'U456',
            thread_ts: '123.456',
          },
          {
            ts: '123.458',
            text: 'Second reply',
            type: 'message',
            user: 'U789',
            thread_ts: '123.456',
          },
        ],
        has_more: false,
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getThreadReplies('C123', '123.456')
      expect(result.messages).toHaveLength(3)
      expect(result.messages[0].text).toBe('Parent message')
      expect(result.messages[0].reply_count).toBe(2)
      expect(result.messages[1].text).toBe('First reply')
      expect(result.messages[2].text).toBe('Second reply')
      expect(result.has_more).toBe(false)
    })

    test('respects limit parameter', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: true,
        messages: [{ ts: '123.456', text: 'Hello', type: 'message' }],
        has_more: false,
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await client.getThreadReplies('C123', '123.456', { limit: 50 })
      expect(mockWebClient.conversations.replies).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'C123', ts: '123.456', limit: 50 })
      )
    })

    test('passes optional oldest and latest parameters', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: true,
        messages: [],
        has_more: false,
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await client.getThreadReplies('C123', '123.456', {
        oldest: '123.400',
        latest: '123.500',
      })
      expect(mockWebClient.conversations.replies).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C123',
          ts: '123.456',
          oldest: '123.400',
          latest: '123.500',
        })
      )
    })

    test('returns pagination info when has_more is true', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: true,
        messages: [{ ts: '123.456', text: 'Hello', type: 'message' }],
        has_more: true,
        response_metadata: { next_cursor: 'cursor123' },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getThreadReplies('C123', '123.456')
      expect(result.has_more).toBe(true)
      expect(result.next_cursor).toBe('cursor123')
    })

    test('throws SlackError when thread not found', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: false,
        error: 'thread_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getThreadReplies('C123', '999.999')).rejects.toThrow(SlackError)
    })

    test('throws SlackError when channel not found', async () => {
      mockWebClient.conversations.replies.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getThreadReplies('C999', '123.456')).rejects.toThrow(SlackError)
    })
  })

  describe('getUnreadCounts', () => {
    beforeEach(() => resetMocks())

    test('returns unread counts for channels, IMs, and threads', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C123',
            last_read: '123.456',
            latest: '123.789',
            mention_count: 2,
            has_unreads: true,
          },
        ],
        ims: [
          {
            id: 'D123',
            last_read: '123.456',
            latest: '123.789',
            mention_count: 1,
            has_unreads: true,
          },
        ],
        mpims: [],
        threads: { has_unreads: true, mention_count: 3 },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getUnreadCounts()
      expect(result.channels).toHaveLength(1)
      expect(result.channels[0].mention_count).toBe(2)
      expect(result.threads.has_unreads).toBe(true)
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('client.counts', {})
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_auth' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getUnreadCounts()).rejects.toThrow(SlackError)
    })
  })

  describe('getUnreadThreads', () => {
    beforeEach(() => resetMocks())

    test('returns unread threads with default limit', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        total_unread_replies: 5,
        new_threads_count: 2,
        threads: [
          {
            root_msg: {
              ts: '123.456',
              text: 'Thread',
              user: 'U123',
              channel: 'C123',
              thread_ts: '123.456',
              reply_count: 3,
              latest_reply: '123.789',
              last_read: '123.500',
            },
            unread_replies: [{ ts: '123.789', text: 'Reply', user: 'U456', thread_ts: '123.456' }],
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getUnreadThreads()
      expect(result.total_unread_replies).toBe(5)
      expect(result.threads).toHaveLength(1)
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('subscriptions.thread.getView', {
        limit: 25,
      })
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_auth' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getUnreadThreads()).rejects.toThrow(SlackError)
    })
  })

  describe('markAsRead', () => {
    beforeEach(() => resetMocks())

    test('marks channel as read', async () => {
      mockWebClient.conversations.mark.mockResolvedValue({ ok: true })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.markAsRead('C123', '123.456')).resolves.toBeUndefined()
      expect(mockWebClient.conversations.mark).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '123.456',
      })
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.conversations.mark.mockResolvedValue({ ok: false, error: 'channel_not_found' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.markAsRead('C999', '123.456')).rejects.toThrow(SlackError)
    })
  })

  describe('getActivityFeed', () => {
    beforeEach(() => resetMocks())

    test('returns activity feed with default options', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        items: [
          {
            is_unread: true,
            feed_ts: '123.456',
            item: {
              type: 'thread_reply',
              message: {
                ts: '123.456',
                channel: 'C123',
                thread_ts: '123.400',
                author_user_id: 'U123',
              },
            },
            key: 'thread_reply-C123-123.456',
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getActivityFeed()
      expect(result.items).toHaveLength(1)
      expect(result.items[0].item.type).toBe('thread_reply')
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_arguments' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getActivityFeed()).rejects.toThrow(SlackError)
    })
  })

  describe('getSavedItems', () => {
    beforeEach(() => resetMocks())

    test('returns saved items with counts', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        saved_items: [
          {
            item_id: 'C123',
            item_type: 'message',
            date_created: 1234567890,
            date_due: 0,
            date_completed: 0,
            date_updated: 1234567890,
            is_archived: false,
            date_snoozed_until: 0,
            ts: '123.456',
            state: 'in_progress',
          },
        ],
        counts: {
          uncompleted_count: 10,
          uncompleted_overdue_count: 0,
          archived_count: 0,
          completed_count: 5,
          total_count: 15,
        },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getSavedItems()
      expect(result.saved_items).toHaveLength(1)
      expect(result.counts.total_count).toBe(15)
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('saved.list', { limit: 25 })
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_auth' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getSavedItems()).rejects.toThrow(SlackError)
    })
  })

  describe('getDrafts', () => {
    beforeEach(() => resetMocks())

    test('returns drafts list', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        drafts: [
          {
            id: 'D123',
            channel_id: 'C123',
            date_created: 1234567890,
            date_updated: 1234567891,
            message: { text: 'Draft message' },
            type: 'message',
          },
        ],
        response_metadata: { next_cursor: 'cursor123' },
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getDrafts()
      expect(result.drafts).toHaveLength(1)
      expect(result.drafts[0].message?.text).toBe('Draft message')
      expect(result.response_metadata?.next_cursor).toBe('cursor123')
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('drafts.list', {})
    })

    test('passes limit and cursor options', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        drafts: [],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await client.getDrafts({ limit: 10, cursor: 'abc123' })
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('drafts.list', {
        limit: 10,
        cursor: 'abc123',
      })
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_auth' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getDrafts()).rejects.toThrow(SlackError)
    })
  })

  describe('getChannelSections', () => {
    beforeEach(() => resetMocks())

    test('returns channel sections', async () => {
      mockWebClient.apiCall.mockResolvedValue({
        ok: true,
        channel_sections: [
          {
            id: 'S123',
            name: 'Favorites',
            emoji: 'star',
            is_expanded: true,
            position: 0,
            channels: ['C123', 'C456'],
          },
          {
            id: 'S456',
            name: 'Work',
            emoji: null,
            is_expanded: false,
            position: 1,
            channels: ['C789'],
          },
        ],
      })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      const result = await client.getChannelSections()
      expect(result.channel_sections).toHaveLength(2)
      expect(result.channel_sections[0].name).toBe('Favorites')
      expect(result.channel_sections[0].channels).toEqual(['C123', 'C456'])
      expect(mockWebClient.apiCall).toHaveBeenCalledWith('users.channelSections.list', {})
    })

    test('throws SlackError on API failure', async () => {
      mockWebClient.apiCall.mockResolvedValue({ ok: false, error: 'invalid_auth' })

      const client = new SlackClient('xoxc-token', 'xoxd-cookie')
      // @ts-expect-error - accessing private property for testing
      client.client = mockWebClient as unknown as WebClient

      await expect(client.getChannelSections()).rejects.toThrow(SlackError)
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
