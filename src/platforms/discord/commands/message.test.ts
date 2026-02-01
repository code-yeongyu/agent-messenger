import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import {
  deleteAction,
  editAction,
  getAction,
  listAction,
  searchAction,
  sendAction,
} from './message'

let clientSendMessageSpy: ReturnType<typeof spyOn>
let clientGetMessagesSpy: ReturnType<typeof spyOn>
let clientGetMessageSpy: ReturnType<typeof spyOn>
let clientDeleteMessageSpy: ReturnType<typeof spyOn>
let clientTriggerTypingSpy: ReturnType<typeof spyOn>
let clientEditMessageSpy: ReturnType<typeof spyOn>
let clientSearchMessagesSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  // Spy on DiscordClient.prototype methods
  clientSendMessageSpy = spyOn(DiscordClient.prototype, 'sendMessage').mockResolvedValue({
    id: 'msg_123',
    channel_id: 'ch_456',
    author: { id: 'user_789', username: 'testuser' },
    content: 'Hello world',
    timestamp: '2025-01-29T10:00:00Z',
  })

  clientGetMessagesSpy = spyOn(DiscordClient.prototype, 'getMessages').mockResolvedValue([
    {
      id: 'msg_123',
      channel_id: 'ch_456',
      author: { id: 'user_789', username: 'testuser' },
      content: 'Hello world',
      timestamp: '2025-01-29T10:00:00Z',
    },
    {
      id: 'msg_124',
      channel_id: 'ch_456',
      author: { id: 'user_789', username: 'testuser' },
      content: 'Second message',
      timestamp: '2025-01-29T10:01:00Z',
    },
  ])

  clientGetMessageSpy = spyOn(DiscordClient.prototype, 'getMessage').mockResolvedValue({
    id: 'msg_123',
    channel_id: 'ch_456',
    author: { id: 'user_789', username: 'testuser' },
    content: 'Hello world',
    timestamp: '2025-01-29T10:00:00Z',
  })

  clientDeleteMessageSpy = spyOn(DiscordClient.prototype, 'deleteMessage').mockResolvedValue(
    undefined
  )

  clientTriggerTypingSpy = spyOn(DiscordClient.prototype, 'triggerTyping').mockResolvedValue(
    undefined
  )

  clientEditMessageSpy = spyOn(DiscordClient.prototype, 'editMessage').mockResolvedValue({
    id: 'msg_125',
    channel_id: 'ch_456',
    author: { id: 'user_789', username: 'testuser' },
    content: 'Updated message',
    timestamp: '2025-01-29T10:02:00Z',
    edited_timestamp: '2025-01-29T10:03:00Z',
  })

  clientSearchMessagesSpy = spyOn(DiscordClient.prototype, 'searchMessages').mockResolvedValue({
    total_results: 1,
    messages: [
      [
        {
          id: 'msg_126',
          channel_id: 'ch_456',
          author: { id: 'user_789', username: 'testuser' },
          content: 'Search result',
          timestamp: '2025-01-29T10:04:00Z',
        },
      ],
    ],
  })

  // Spy on DiscordCredentialManager.prototype methods
  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test_token',
    current_guild: 'guild_123',
    guilds: {},
  })
})

afterEach(() => {
  clientSendMessageSpy?.mockRestore()
  clientGetMessagesSpy?.mockRestore()
  clientGetMessageSpy?.mockRestore()
  clientDeleteMessageSpy?.mockRestore()
  clientTriggerTypingSpy?.mockRestore()
  clientEditMessageSpy?.mockRestore()
  clientSearchMessagesSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

test('send: returns message with id', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await sendAction('ch_456', 'Hello world', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_123')
})

test('list: returns array of messages', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await listAction('ch_456', { limit: 50, pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_123')
  expect(output).toContain('msg_124')
})

test('get: returns single message', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await getAction('ch_456', 'msg_123', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_123')
})

test('delete: returns success', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await deleteAction('ch_456', 'msg_123', { force: true, pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('deleted')
})

test('edit: returns updated message', async () => {
  // given: a message edit request
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: editing the message
  await editAction('ch_456', 'msg_125', 'Updated message', { pretty: false })

  // then: output includes updated message id
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_125')
})

test('search: returns message results', async () => {
  // given: a search query
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: searching messages
  await searchAction('Search', { guild: 'guild_123', pretty: false })

  // then: output includes search result id
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_126')
})
