import { expect, mock, test } from 'bun:test'
import { addAction, listAction, removeAction } from './reaction'

// Mock modules
mock.module('../client', () => ({
  DiscordClient: mock(() => ({
    addReaction: mock(async () => {}),
    removeReaction: mock(async () => {}),
    getMessage: mock(async () => ({
      id: 'msg123',
      channel_id: 'ch123',
      author: { id: 'user123', username: 'testuser' },
      content: 'test message',
      timestamp: '2024-01-01T00:00:00Z',
      reactions: [
        {
          emoji: { name: 'thumbsup', id: undefined },
          count: 2,
        },
        {
          emoji: { name: 'heart', id: undefined },
          count: 1,
        },
      ],
    })),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(async () => ({
      token: 'test-token',
    })),
  })),
}))

test('add: sends correct PUT request with emoji', async () => {
  const consoleSpy = mock((_msg: string) => {})
  const originalLog = console.log
  console.log = consoleSpy

  try {
    await addAction('ch123', 'msg123', 'thumbsup', { pretty: false })
    expect(consoleSpy).toHaveBeenCalled()
    const output = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(output.success).toBe(true)
    expect(output.channel_id).toBe('ch123')
    expect(output.message_id).toBe('msg123')
    expect(output.emoji).toBe('thumbsup')
  } finally {
    console.log = originalLog
  }
})

test('remove: sends correct DELETE request with emoji', async () => {
  const consoleSpy = mock((_msg: string) => {})
  const originalLog = console.log
  console.log = consoleSpy

  try {
    await removeAction('ch123', 'msg123', 'thumbsup', { pretty: false })
    expect(consoleSpy).toHaveBeenCalled()
    const output = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(output.success).toBe(true)
    expect(output.channel_id).toBe('ch123')
    expect(output.message_id).toBe('msg123')
    expect(output.emoji).toBe('thumbsup')
  } finally {
    console.log = originalLog
  }
})

test('list: extracts reactions from message', async () => {
  const consoleSpy = mock((_msg: string) => {})
  const originalLog = console.log
  console.log = consoleSpy

  try {
    await listAction('ch123', 'msg123', { pretty: false })
    expect(consoleSpy).toHaveBeenCalled()
    const output = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(output.channel_id).toBe('ch123')
    expect(output.message_id).toBe('msg123')
    expect(Array.isArray(output.reactions)).toBe(true)
    expect(output.reactions.length).toBe(2)
    expect(output.reactions[0].emoji.name).toBe('thumbsup')
    expect(output.reactions[0].count).toBe(2)
  } finally {
    console.log = originalLog
  }
})

test('add: handles missing token gracefully', async () => {
  const credManagerMock = mock(() => ({
    load: mock(async () => ({
      token: null,
    })),
  }))

  mock.module('../credential-manager', () => ({
    DiscordCredentialManager: credManagerMock,
  }))

  const consoleSpy = mock((_msg: string) => {})
  const originalLog = console.log
  const originalExit = process.exit
  let _exitCode = 0
  process.exit = mock((code: number) => {
    _exitCode = code
  }) as any

  console.log = consoleSpy

  try {
    await addAction('ch123', 'msg123', 'thumbsup', { pretty: false })
    expect(consoleSpy).toHaveBeenCalled()
    const output = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(output.error).toBeDefined()
  } finally {
    console.log = originalLog
    process.exit = originalExit
  }
})
