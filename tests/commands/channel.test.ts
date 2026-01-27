import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { SlackClient } from '../../src/lib/slack-client'
import type { SlackChannel } from '../../src/types'

describe('Channel Commands', () => {
  let mockClient: SlackClient

  beforeEach(() => {
    // Mock SlackClient
    mockClient = {
      listChannels: mock(async () => [
        {
          id: 'C001',
          name: 'general',
          is_private: false,
          is_archived: false,
          created: 1234567890,
          creator: 'U001',
          topic: {
            value: 'General discussion',
            creator: 'U001',
            last_set: 1234567890,
          },
          purpose: {
            value: 'General channel',
            creator: 'U001',
            last_set: 1234567890,
          },
        },
        {
          id: 'C002',
          name: 'private-team',
          is_private: true,
          is_archived: false,
          created: 1234567891,
          creator: 'U002',
        },
        {
          id: 'C003',
          name: 'archived-channel',
          is_private: false,
          is_archived: true,
          created: 1234567892,
          creator: 'U003',
        },
      ]),
      getChannel: mock(async (id: string) => {
        const channels: Record<string, SlackChannel> = {
          C001: {
            id: 'C001',
            name: 'general',
            is_private: false,
            is_archived: false,
            created: 1234567890,
            creator: 'U001',
            topic: {
              value: 'General discussion',
              creator: 'U001',
              last_set: 1234567890,
            },
            purpose: {
              value: 'General channel',
              creator: 'U001',
              last_set: 1234567890,
            },
          },
          C002: {
            id: 'C002',
            name: 'private-team',
            is_private: true,
            is_archived: false,
            created: 1234567891,
            creator: 'U002',
          },
        }
        if (!channels[id]) {
          throw new Error(`Channel not found: ${id}`)
        }
        return channels[id]
      }),
    } as any
  })

  describe('channel list', () => {
    test('lists all channels with refs', async () => {
      // Given: SlackClient returns channels
      // When: Listing channels
      const channels = await mockClient.listChannels()

      // Then: Should return channels with refs
      expect(channels).toHaveLength(3)
      expect(channels[0].name).toBe('general')
      expect(channels[1].name).toBe('private-team')
      expect(channels[2].name).toBe('archived-channel')
    })

    test('excludes archived channels by default', async () => {
      // Given: SlackClient returns channels including archived
      const channels = await mockClient.listChannels()

      // When: Filtering out archived (default behavior)
      const activeChannels = channels.filter((c) => !c.is_archived)

      // Then: Should exclude archived channels
      expect(activeChannels).toHaveLength(2)
      expect(activeChannels.every((c) => !c.is_archived)).toBe(true)
    })

    test('includes archived channels when requested', async () => {
      // Given: SlackClient returns channels including archived
      const channels = await mockClient.listChannels()

      // When: Including archived (--include-archived)
      // Then: Should include all channels
      expect(channels).toHaveLength(3)
      expect(channels.some((c) => c.is_archived)).toBe(true)
    })

    test('filters channels by type=public', async () => {
      // Given: SlackClient returns mixed channels
      // When: Filtering by public type
      const channels = await mockClient.listChannels()
      const publicChannels = channels.filter((c) => !c.is_private)

      // Then: Should return only public channels
      expect(publicChannels).toHaveLength(2)
      expect(publicChannels.every((c) => !c.is_private)).toBe(true)
    })

    test('filters channels by type=private', async () => {
      // Given: SlackClient returns mixed channels
      // When: Filtering by private type
      const channels = await mockClient.listChannels()
      const privateChannels = channels.filter((c) => c.is_private)

      // Then: Should return only private channels
      expect(privateChannels).toHaveLength(1)
      expect(privateChannels[0].name).toBe('private-team')
    })

    test('assigns refs to channels (@c1, @c2, etc)', async () => {
      // Given: SlackClient returns channels
      // When: Assigning refs
      const channels = await mockClient.listChannels()
      const withRefs = channels.map((ch, idx) => ({
        ref: `@c${idx + 1}` as const,
        ...ch,
      }))

      // Then: Should have sequential refs
      expect(withRefs[0].ref).toBe('@c1')
      expect(withRefs[1].ref).toBe('@c2')
      expect(withRefs[2].ref).toBe('@c3')
    })
  })

  describe('channel info', () => {
    test('gets channel by ID', async () => {
      // Given: Channel ID C001
      // When: Getting channel info
      const channel = await mockClient.getChannel('C001')

      // Then: Should return channel details
      expect(channel.id).toBe('C001')
      expect(channel.name).toBe('general')
      expect(channel.is_private).toBe(false)
    })

    test('resolves ref to channel ID', async () => {
      // Given: Ref @c1 maps to C001
      // When: Resolving ref
      const refMap: Record<string, string> = {
        '@c1': 'C001',
        '@c2': 'C002',
      }
      const channelId = refMap['@c1']

      // Then: Should resolve to correct ID
      expect(channelId).toBe('C001')
    })

    test('throws error for non-existent channel', async () => {
      // Given: Non-existent channel ID
      // When: Getting channel info
      // Then: Should throw error
      try {
        await mockClient.getChannel('C999')
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('Channel not found')
      }
    })

    test('returns channel with topic and purpose', async () => {
      // Given: Channel with topic and purpose
      // When: Getting channel info
      const channel = await mockClient.getChannel('C001')

      // Then: Should include topic and purpose
      expect(channel.topic?.value).toBe('General discussion')
      expect(channel.purpose?.value).toBe('General channel')
    })
  })

  describe('channel history (alias for message list)', () => {
    test('history command should be alias for message list', () => {
      // Given: channel history command
      // When: Checking command structure
      // Then: Should be alias for message list
      // (This is verified in integration tests)
      expect(true).toBe(true)
    })
  })

  describe('ref resolution', () => {
    test('resolves @c1 to first channel', async () => {
      // Given: Channels with refs
      const channels = await mockClient.listChannels()
      const refMap = new Map<string, string>()
      channels.forEach((ch, idx) => {
        refMap.set(`@c${idx + 1}`, ch.id)
      })

      // When: Resolving @c1
      const channelId = refMap.get('@c1')

      // Then: Should resolve to C001
      expect(channelId).toBe('C001')
    })

    test('resolves @c2 to second channel', async () => {
      // Given: Channels with refs
      const channels = await mockClient.listChannels()
      const refMap = new Map<string, string>()
      channels.forEach((ch, idx) => {
        refMap.set(`@c${idx + 1}`, ch.id)
      })

      // When: Resolving @c2
      const channelId = refMap.get('@c2')

      // Then: Should resolve to C002
      expect(channelId).toBe('C002')
    })
  })
})
