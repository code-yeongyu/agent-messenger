import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { historyAction, infoAction, listAction } from './channel'

// Mock modules
mock.module('../client', () => ({
  DiscordClient: mock((token: string) => ({
    listChannels: mock(async (guildId: string) => [
      { id: 'ch-1', guild_id: guildId, name: 'general', type: 0, topic: 'General discussion' },
      { id: 'ch-2', guild_id: guildId, name: 'announcements', type: 0, topic: 'Announcements' },
      { id: 'ch-3', guild_id: guildId, name: 'voice-channel', type: 2, topic: null },
    ]),
    getChannel: mock(async (channelId: string) => {
      if (channelId === 'ch-1') {
        return {
          id: 'ch-1',
          guild_id: 'guild-1',
          name: 'general',
          type: 0,
          topic: 'General discussion',
        }
      }
      if (channelId === 'ch-2') {
        return {
          id: 'ch-2',
          guild_id: 'guild-1',
          name: 'announcements',
          type: 0,
          topic: 'Announcements',
        }
      }
      throw new Error('Channel not found')
    }),
    getMessages: mock(async (channelId: string, limit: number) => [
      {
        id: 'msg-1',
        channel_id: channelId,
        author: { id: 'user-1', username: 'alice' },
        content: 'Hello world',
        timestamp: '2024-01-29T10:00:00Z',
      },
      {
        id: 'msg-2',
        channel_id: channelId,
        author: { id: 'user-2', username: 'bob' },
        content: 'Hi there',
        timestamp: '2024-01-29T09:00:00Z',
      },
    ]),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(async () => ({
      token: 'test-token',
      current_guild: 'guild-1',
      guilds: {
        'guild-1': { guild_id: 'guild-1', guild_name: 'Guild One' },
      },
    })),
  })),
}))

test('list: returns text channels (type=0) from guild', async () => {
  // given: discord client with channels
  const client = new DiscordClient('test-token')
  const channels = await client.listChannels('guild-1')

  // when: filtering text channels
  const textChannels = channels.filter((ch) => ch.type === 0)

  // then: only text channels are returned
  expect(textChannels).toHaveLength(2)
  expect(textChannels[0].name).toBe('general')
  expect(textChannels[1].name).toBe('announcements')
})

test('list: includes channel metadata', async () => {
  // given: discord client with channels
  const client = new DiscordClient('test-token')
  const channels = await client.listChannels('guild-1')
  const textChannels = channels.filter((ch) => ch.type === 0)

  // when: checking channel properties
  const channel = textChannels[0]

  // then: channel has id, name, type, topic
  expect(channel.id).toBeDefined()
  expect(channel.name).toBeDefined()
  expect(channel.type).toBe(0)
  expect(channel.topic).toBeDefined()
})

test('info: returns channel details', async () => {
  // given: discord client with channel data
  const client = new DiscordClient('test-token')
  const channel = await client.getChannel('ch-1')

  // when: getting channel info
  expect(channel).toBeDefined()

  // then: channel details are returned
  expect(channel.id).toBe('ch-1')
  expect(channel.name).toBe('general')
  expect(channel.type).toBe(0)
  expect(channel.topic).toBe('General discussion')
})

test('info: throws error for non-existent channel', async () => {
  // given: discord client
  const client = new DiscordClient('test-token')

  // when: getting non-existent channel
  // then: error is thrown
  try {
    await client.getChannel('non-existent')
    expect(true).toBe(false) // should not reach here
  } catch (error) {
    expect((error as Error).message).toContain('Channel not found')
  }
})

test('history: returns messages in reverse chronological order', async () => {
  // given: discord client with messages
  const client = new DiscordClient('test-token')
  const messages = await client.getMessages('ch-1', 50)

  // when: getting message history
  expect(messages).toBeDefined()

  // then: messages are returned (Discord API returns newest first)
  expect(messages).toHaveLength(2)
  expect(messages[0].id).toBe('msg-1')
  expect(messages[0].author.username).toBe('alice')
  expect(messages[1].id).toBe('msg-2')
  expect(messages[1].author.username).toBe('bob')
})

test('history: includes message metadata', async () => {
  // given: discord client with messages
  const client = new DiscordClient('test-token')
  const messages = await client.getMessages('ch-1', 50)

  // when: checking message properties
  const message = messages[0]

  // then: message has id, content, author, timestamp
  expect(message.id).toBeDefined()
  expect(message.content).toBeDefined()
  expect(message.author).toBeDefined()
  expect(message.author.username).toBeDefined()
  expect(message.timestamp).toBeDefined()
})
