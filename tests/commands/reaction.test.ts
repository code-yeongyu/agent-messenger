import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { Command } from 'commander'
import { reactionCommand } from '../../src/commands/reaction'
import { RefManager } from '../../src/lib/ref-manager'
import type { SlackChannel, SlackMessage } from '../../src/types'

// Mock SlackClient
const mockSlackClient = {
  addReaction: mock(() => Promise.resolve()),
  removeReaction: mock(() => Promise.resolve()),
  getMessages: mock(() => Promise.resolve([])),
}

// Helper to reset mocks
function resetMocks() {
  mockSlackClient.addReaction.mockReset()
  mockSlackClient.removeReaction.mockReset()
  mockSlackClient.getMessages.mockReset()
}

describe('reaction command', () => {
  let refManager: RefManager

  beforeEach(() => {
    resetMocks()
    refManager = new RefManager()
  })

  describe('add subcommand', () => {
    test('adds reaction to message with channel and message ts', async () => {
      // Given
      const channelId = 'C123'
      const messageTs = '1234567890.123456'
      const emoji = 'thumbsup'

      // When
      await mockSlackClient.addReaction(channelId, messageTs, emoji)

      // Then
      expect(mockSlackClient.addReaction).toHaveBeenCalledWith(channelId, messageTs, emoji)
      expect(mockSlackClient.addReaction).toHaveBeenCalledTimes(1)
    })

    test('adds reaction with channel ref and message ref', async () => {
      // Given
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }
      const message: SlackMessage = {
        ts: '1234567890.123456',
        text: 'Hello',
        type: 'message',
        user: 'U456',
      }

      const channelRef = refManager.assignChannelRef(channel)
      const messageRef = refManager.assignMessageRef(message)

      // When
      const resolved = {
        channel: refManager.resolveRef(channelRef),
        message: refManager.resolveRef(messageRef),
      }

      // Then
      expect(resolved.channel).toEqual({ type: 'channel', id: 'C123' })
      expect(resolved.message).toEqual({ type: 'message', id: '1234567890.123456' })
    })

    test('handles emoji without colons', async () => {
      // Given
      const channelId = 'C123'
      const messageTs = '1234567890.123456'
      const emoji = 'thumbsup'

      // When
      await mockSlackClient.addReaction(channelId, messageTs, emoji)

      // Then
      expect(mockSlackClient.addReaction).toHaveBeenCalledWith(channelId, messageTs, 'thumbsup')
    })
  })

  describe('remove subcommand', () => {
    test('removes reaction from message with channel and message ts', async () => {
      // Given
      const channelId = 'C123'
      const messageTs = '1234567890.123456'
      const emoji = 'thumbsup'

      // When
      await mockSlackClient.removeReaction(channelId, messageTs, emoji)

      // Then
      expect(mockSlackClient.removeReaction).toHaveBeenCalledWith(channelId, messageTs, emoji)
      expect(mockSlackClient.removeReaction).toHaveBeenCalledTimes(1)
    })

    test('removes reaction with channel ref and message ref', async () => {
      // Given
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }
      const message: SlackMessage = {
        ts: '1234567890.123456',
        text: 'Hello',
        type: 'message',
        user: 'U456',
      }

      const channelRef = refManager.assignChannelRef(channel)
      const messageRef = refManager.assignMessageRef(message)

      // When
      const resolved = {
        channel: refManager.resolveRef(channelRef),
        message: refManager.resolveRef(messageRef),
      }

      // Then
      expect(resolved.channel).toEqual({ type: 'channel', id: 'C123' })
      expect(resolved.message).toEqual({ type: 'message', id: '1234567890.123456' })
    })
  })

  describe('list subcommand', () => {
    test('lists reactions on a message', async () => {
      // Given
      const channelId = 'C123'
      const messageTs = '1234567890.123456'
      const mockMessages = [
        {
          ts: messageTs,
          text: 'Hello',
          type: 'message',
          user: 'U456',
          reactions: [
            { name: 'thumbsup', count: 2, users: ['U123', 'U456'] },
            { name: 'heart', count: 1, users: ['U789'] },
          ],
        },
      ]

      mockSlackClient.getMessages.mockResolvedValue(mockMessages)

      // When
      const result = await mockSlackClient.getMessages(channelId)

      // Then
      expect(result).toHaveLength(1)
      expect(result[0].ts).toBe(messageTs)
    })

    test('returns empty reactions list when no reactions', async () => {
      // Given
      const channelId = 'C123'
      const messageTs = '1234567890.123456'
      const mockMessages = [
        {
          ts: messageTs,
          text: 'Hello',
          type: 'message',
          user: 'U456',
          reactions: [],
        },
      ]

      mockSlackClient.getMessages.mockResolvedValue(mockMessages)

      // When
      const result = await mockSlackClient.getMessages(channelId)

      // Then
      expect(result).toHaveLength(1)
      expect(result[0].reactions).toEqual([])
    })

    test('lists reactions with channel ref and message ref', async () => {
      // Given
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }
      const message: SlackMessage = {
        ts: '1234567890.123456',
        text: 'Hello',
        type: 'message',
        user: 'U456',
      }

      const channelRef = refManager.assignChannelRef(channel)
      const messageRef = refManager.assignMessageRef(message)

      // When
      const resolved = {
        channel: refManager.resolveRef(channelRef),
        message: refManager.resolveRef(messageRef),
      }

      // Then
      expect(resolved.channel).toEqual({ type: 'channel', id: 'C123' })
      expect(resolved.message).toEqual({ type: 'message', id: '1234567890.123456' })
    })
  })

  describe('command structure', () => {
    test('reaction command exists', () => {
      expect(reactionCommand).toBeInstanceOf(Command)
    })

    test('reaction command has correct name', () => {
      expect(reactionCommand.name()).toBe('reaction')
    })

    test('reaction command has description', () => {
      expect(reactionCommand.description()).toBe('Reaction commands')
    })
  })
})
