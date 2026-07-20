import { afterEach, beforeEach, expect, spyOn, it } from 'bun:test'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { DiscordChannelType } from '../types'
import { snapshotAction, snapshotCommand } from './snapshot'

let listChannelsSpy: ReturnType<typeof spyOn>
let getMessagesSpy: ReturnType<typeof spyOn>
let getServerSpy: ReturnType<typeof spyOn>
let listUsersSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

const mixedChannels = [
  { id: 'text', guild_id: 'g1', name: 'general', type: DiscordChannelType.GUILD_TEXT },
  { id: 'announce', guild_id: 'g1', name: 'news', type: DiscordChannelType.GUILD_ANNOUNCEMENT },
  { id: 'voice', guild_id: 'g1', name: 'lounge', type: DiscordChannelType.GUILD_VOICE },
  { id: 'forum', guild_id: 'g1', name: 'help', type: DiscordChannelType.GUILD_FORUM },
  { id: 'directory', guild_id: 'g1', name: 'hub', type: DiscordChannelType.GUILD_DIRECTORY },
  { id: 'category', guild_id: 'g1', name: 'Section', type: DiscordChannelType.GUILD_CATEGORY },
  { id: 'thread', guild_id: 'g1', name: 'a-thread', type: DiscordChannelType.PUBLIC_THREAD },
]

function parseSnapshot(consoleSpy: ReturnType<typeof spyOn>): Record<string, any> {
  const lastCall = consoleSpy.mock.calls.at(-1)
  return JSON.parse(lastCall![0] as string)
}

beforeEach(() => {
  listChannelsSpy = spyOn(DiscordClient.prototype, 'listChannels').mockResolvedValue(mixedChannels)
  getMessagesSpy = spyOn(DiscordClient.prototype, 'getMessages').mockResolvedValue([])
  getServerSpy = spyOn(DiscordClient.prototype, 'getServer').mockResolvedValue({ id: 'g1', name: 'Guild One' })
  listUsersSpy = spyOn(DiscordClient.prototype, 'listUsers').mockResolvedValue([])
  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_server: 'g1',
    servers: { g1: { server_id: 'g1', server_name: 'Guild One' } },
  })
})

afterEach(() => {
  listChannelsSpy?.mockRestore()
  getMessagesSpy?.mockRestore()
  getServerSpy?.mockRestore()
  listUsersSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

it('snapshot brief: lists listable channels and excludes categories and threads', async () => {
  // given: a server with mixed channel types
  const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})

  // when: running a brief snapshot
  await snapshotAction({ pretty: false })
  const snapshot = parseSnapshot(consoleSpy)
  consoleSpy.mockRestore()

  // then: only listable channels appear, no messages are fetched
  const names = snapshot.channels.map((ch: { name: string }) => ch.name)
  expect(names).toEqual(['general', 'news', 'lounge', 'help', 'hub'])
  expect(getMessagesSpy).not.toHaveBeenCalled()
})

it('snapshot full: fetches messages only from message-readable channels', async () => {
  // given: a server with mixed channel types
  const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})

  // when: running a full snapshot
  await snapshotAction({ full: true, pretty: false })
  const snapshot = parseSnapshot(consoleSpy)
  consoleSpy.mockRestore()

  // then: listing includes containers but getMessages is called only for readable IDs
  const listedNames = snapshot.channels.map((ch: { name: string }) => ch.name)
  expect(listedNames).toEqual(['general', 'news', 'lounge', 'help', 'hub'])

  const fetchedIds = getMessagesSpy.mock.calls.map((call) => call[0])
  expect(fetchedIds.sort()).toEqual(['announce', 'text', 'voice'])
  expect(fetchedIds).not.toContain('forum')
  expect(fetchedIds).not.toContain('directory')
})

it('snapshot: command is defined', () => {
  expect(snapshotCommand).toBeDefined()
  expect(snapshotCommand.name()).toBe('snapshot')
})

it('snapshot: command has correct description', () => {
  expect(snapshotCommand.description()).toContain('server overview')
})

it('snapshot: command has --channels-only option', () => {
  const options = snapshotCommand.options
  const channelsOnlyOption = options.find((opt) => opt.long === '--channels-only')
  expect(channelsOnlyOption).toBeDefined()
})

it('snapshot: command has --users-only option', () => {
  const options = snapshotCommand.options
  const usersOnlyOption = options.find((opt) => opt.long === '--users-only')
  expect(usersOnlyOption).toBeDefined()
})

it('snapshot: command has --limit option', () => {
  const options = snapshotCommand.options
  const limitOption = options.find((opt) => opt.long === '--limit')
  expect(limitOption).toBeDefined()
})
