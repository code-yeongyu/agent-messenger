import { afterEach, beforeEach, expect, spyOn, it } from 'bun:test'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { unreadAction } from './mention'

let clientGetMentionsSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  // Spy on DiscordClient.prototype methods
  clientGetMentionsSpy = spyOn(DiscordClient.prototype, 'getMentions').mockResolvedValue([
    {
      id: 'msg-1',
      channel_id: 'ch-1',
      author: { id: 'user-1', username: 'alice' },
      content: 'Hey @testuser check this out',
      timestamp: '2024-01-29T10:00:00Z',
      mention_everyone: false,
      mentions: [{ id: 'user-me', username: 'testuser' }],
      guild_id: 'guild-1',
    },
    {
      id: 'msg-2',
      channel_id: 'ch-2',
      author: { id: 'user-2', username: 'bob' },
      content: '@everyone important announcement',
      timestamp: '2024-01-29T09:00:00Z',
      mention_everyone: true,
      mentions: [],
      guild_id: 'guild-1',
    },
  ])

  // Spy on DiscordCredentialManager.prototype methods
  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_server: 'server-1',
    servers: {
      'server-1': { server_id: 'server-1', server_name: 'Server One' },
    },
  })
})

afterEach(() => {
  clientGetMentionsSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

it('getMentions: returns mentions', async () => {
  // given: discord client
  const client = await new DiscordClient().login({ token: 'test-token' })

  // when: getting mentions
  const mentions = await client.getMentions()

  // then: mentions are returned
  expect(mentions).toBeDefined()
  expect(mentions).toHaveLength(2)
  expect(mentions[0].id).toBe('msg-1')
  expect(mentions[0].author.username).toBe('alice')
  expect(mentions[0].mentions).toHaveLength(1)
  expect(mentions[1].mention_everyone).toBe(true)
})

it('getMentions: respects limit option', async () => {
  // given: discord client with limit option
  const client = await new DiscordClient().login({ token: 'test-token' })
  clientGetMentionsSpy.mockResolvedValue([
    {
      id: 'msg-1',
      channel_id: 'ch-1',
      author: { id: 'user-1', username: 'alice' },
      content: 'Hey @testuser',
      timestamp: '2024-01-29T10:00:00Z',
      mention_everyone: false,
      mentions: [{ id: 'user-me', username: 'testuser' }],
    },
  ])

  // when: getting mentions with limit
  const mentions = await client.getMentions({ limit: 1 })

  // then: limit is respected
  expect(mentions).toHaveLength(1)
  expect(clientGetMentionsSpy).toHaveBeenCalledWith({ limit: 1 })
})

it('getMentions: respects guildId option', async () => {
  // given: discord client with guildId option
  const client = await new DiscordClient().login({ token: 'test-token' })
  clientGetMentionsSpy.mockResolvedValue([
    {
      id: 'msg-1',
      channel_id: 'ch-1',
      author: { id: 'user-1', username: 'alice' },
      content: 'Hey @testuser',
      timestamp: '2024-01-29T10:00:00Z',
      mention_everyone: false,
      mentions: [{ id: 'user-me', username: 'testuser' }],
      guild_id: 'guild-1',
    },
  ])

  // when: getting mentions with guildId
  const mentions = await client.getMentions({ guildId: 'guild-1' })

  // then: guildId is respected
  expect(mentions).toHaveLength(1)
  expect(mentions[0].guild_id).toBe('guild-1')
  expect(clientGetMentionsSpy).toHaveBeenCalledWith({ guildId: 'guild-1' })
})

it('getMentions: includes mention metadata', async () => {
  // given: discord client with mentions
  const client = await new DiscordClient().login({ token: 'test-token' })
  const mentions = await client.getMentions()

  // when: checking mention properties
  const mention = mentions[0]

  // then: mention has required fields
  expect(mention.id).toBeDefined()
  expect(mention.channel_id).toBeDefined()
  expect(mention.author).toBeDefined()
  expect(mention.author.username).toBeDefined()
  expect(mention.content).toBeDefined()
  expect(mention.timestamp).toBeDefined()
  expect(mention.mention_everyone).toBeDefined()
  expect(mention.mentions).toBeDefined()
})

it('unread command: emits snake_case JSON and forwards guild/limit options', async () => {
  // given: an authenticated client whose getUnreadMentions returns one unread mention
  credManagerLoadSpy.mockResolvedValue({
    token: 'test-token',
    current_server: null,
    servers: {},
  })
  const loginSpy = spyOn(DiscordClient.prototype, 'login').mockImplementation(async function (this: DiscordClient) {
    return this
  })
  const getUnreadSpy = spyOn(DiscordClient.prototype, 'getUnreadMentions').mockResolvedValue({
    mentions: [
      {
        id: 'msg-1',
        channel_id: 'ch-1',
        author: { id: 'user-1', username: 'alice' },
        content: 'Hey @testuser',
        timestamp: '2024-01-29T10:00:00Z',
        mention_everyone: false,
        mentions: [{ id: 'user-me', username: 'testuser' }],
        guild_id: 'guild-1',
        mention_count: 2,
      },
    ],
    count: 1,
    badgeCount: 2,
    complete: true,
    windowDays: 7,
  })
  const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})

  // when: running the unread action with guild and limit
  await unreadAction({ guild: 'guild-1', limit: 200 })

  // then: options are forwarded and the emitted JSON uses documented snake_case keys
  expect(getUnreadSpy).toHaveBeenCalledWith({ guildId: 'guild-1', limit: 200 })
  const lastCall = consoleLogSpy.mock.calls.at(-1) as [string]
  const emitted = JSON.parse(lastCall[0])
  expect(emitted).toEqual({
    mentions: [
      {
        id: 'msg-1',
        channel_id: 'ch-1',
        author: 'alice',
        content: 'Hey @testuser',
        timestamp: '2024-01-29T10:00:00Z',
        mention_everyone: false,
        mentioned_users: ['testuser'],
        guild_id: 'guild-1',
      },
    ],
    count: 1,
    badge_count: 2,
    complete: true,
    window_days: 7,
  })

  loginSpy.mockRestore()
  getUnreadSpy.mockRestore()
  consoleLogSpy.mockRestore()
})

it('unread command: exits with error when not authenticated', async () => {
  // given: no token in credentials
  credManagerLoadSpy.mockResolvedValue({
    token: undefined,
    current_server: null,
    servers: {},
  })
  const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
  const processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)

  // when: running the unread action
  await unreadAction({})

  // then: it reports the auth error and exits
  expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ error: 'Not authenticated. Run "auth extract" first.' }))
  expect(processExitSpy).toHaveBeenCalledWith(1)

  consoleLogSpy.mockRestore()
  processExitSpy.mockRestore()
})
