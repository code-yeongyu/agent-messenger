import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { archiveAction, createAction } from './thread'

let clientCreateThreadSpy: ReturnType<typeof spyOn>
let clientArchiveThreadSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  clientCreateThreadSpy = spyOn(DiscordClient.prototype, 'createThread').mockResolvedValue({
    id: 'thread_123',
    guild_id: 'guild_123',
    name: 'Thread One',
    type: 11,
    parent_id: 'channel_123',
  })

  clientArchiveThreadSpy = spyOn(DiscordClient.prototype, 'archiveThread').mockResolvedValue({
    id: 'thread_123',
    guild_id: 'guild_123',
    name: 'Thread One',
    type: 11,
    parent_id: 'channel_123',
  })

  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_guild: 'guild_123',
    guilds: {},
  })
})

afterEach(() => {
  clientCreateThreadSpy?.mockRestore()
  clientArchiveThreadSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

test('create: returns thread info', async () => {
  // given: a thread create request
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: creating a thread
  await createAction('channel_123', 'Thread One', { pretty: false })

  // then: output includes thread id
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('thread_123')
})

test('archive: marks thread as archived', async () => {
  // given: a thread archive request
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: archiving a thread
  await archiveAction('thread_123', { pretty: false })

  // then: output includes archived status
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('archived')
})
