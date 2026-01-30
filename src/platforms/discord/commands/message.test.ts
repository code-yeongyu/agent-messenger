import { beforeEach, expect, mock, test } from 'bun:test'
import { deleteAction, getAction, listAction, sendAction } from './message'

mock.module('../client', () => ({
  DiscordClient: mock(() => ({
    sendMessage: mock(async () => ({
      id: 'msg_123',
      channel_id: 'ch_456',
      author: { id: 'user_789', username: 'testuser' },
      content: 'Hello world',
      timestamp: '2025-01-29T10:00:00Z',
    })),
    getMessages: mock(async () => [
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
    ]),
    getMessage: mock(async () => ({
      id: 'msg_123',
      channel_id: 'ch_456',
      author: { id: 'user_789', username: 'testuser' },
      content: 'Hello world',
      timestamp: '2025-01-29T10:00:00Z',
    })),
    deleteMessage: mock(async () => undefined),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(async () => ({
      token: 'test_token',
      current_guild: 'guild_123',
      guilds: {},
    })),
  })),
}))

mock.module('../../../shared/utils/output', () => ({
  formatOutput: (data: any, pretty?: boolean) => JSON.stringify(data, null, pretty ? 2 : 0),
}))

mock.module('../../../shared/utils/error-handler', () => ({
  handleError: (error: Error) => {
    console.error(error.message)
  },
}))

beforeEach(() => {
  mock.restore()
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
