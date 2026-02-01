import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { createAction, sendAction } from './dm'

let clientCreateDMSpy: ReturnType<typeof spyOn>
let clientSendMessageSpy: ReturnType<typeof spyOn>
let clientTriggerTypingSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  clientCreateDMSpy = spyOn(DiscordClient.prototype, 'createDM').mockResolvedValue({
    id: 'dm_123',
    type: 1,
    recipients: [{ id: 'user_123', username: 'testuser', global_name: 'Test User' }],
  })

  clientSendMessageSpy = spyOn(DiscordClient.prototype, 'sendMessage').mockResolvedValue({
    id: 'msg_123',
    channel_id: 'dm_123',
    author: { id: 'user_123', username: 'testuser' },
    content: 'Hello DM',
    timestamp: '2025-01-29T10:00:00Z',
  })

  clientTriggerTypingSpy = spyOn(DiscordClient.prototype, 'triggerTyping').mockResolvedValue(
    undefined
  )

  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_guild: 'guild_123',
    guilds: {},
  })
})

afterEach(() => {
  clientCreateDMSpy?.mockRestore()
  clientSendMessageSpy?.mockRestore()
  clientTriggerTypingSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

test('create: returns DM channel info', async () => {
  // given: a DM create request
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: creating a DM channel
  await createAction('user_123', { pretty: false })

  // then: output includes DM channel id
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('dm_123')
})

test('send: sends a DM message', async () => {
  // given: a DM send request
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  // when: sending a DM message
  await sendAction('user_123', 'Hello DM', { pretty: false })

  // then: output includes message id
  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('msg_123')
})
