import { afterEach, beforeEach, describe, expect, mock, it } from 'bun:test'

const originalConsoleLog = console.log

const mockWithKakaoClient = mock(async (_options: unknown, fn: (client: unknown) => Promise<unknown>) => {
  return fn(mockClient)
})

const mockGetMessages = mock(() =>
  Promise.resolve([{ log_id: '1', message: 'Hello', sender_id: 'user-1', created_at: 1000 }]),
)

const mockSendMessage = mock(() => Promise.resolve({ log_id: '2', message: 'Hi there', created_at: 2000 }))

const mockMarkRead = mock(() =>
  Promise.resolve({ success: true, status_code: 0, chat_id: 'chat-123', watermark: '42' }),
)

const originalExit = process.exit

const mockClient = {
  getMessages: mockGetMessages,
  sendMessage: mockSendMessage,
  markRead: mockMarkRead,
}

mock.module('./shared', () => ({
  withKakaoClient: mockWithKakaoClient,
}))

import { messageCommand } from './message'

describe('message commands', () => {
  let consoleLogSpy: ReturnType<typeof mock>

  beforeEach(() => {
    mockWithKakaoClient.mockReset()
    mockGetMessages.mockReset()
    mockSendMessage.mockReset()
    mockMarkRead.mockReset()

    mockWithKakaoClient.mockImplementation(async (_options: unknown, fn: (client: unknown) => Promise<unknown>) => {
      return fn(mockClient)
    })
    mockGetMessages.mockImplementation(() =>
      Promise.resolve([{ log_id: '1', message: 'Hello', sender_id: 'user-1', created_at: 1000 }]),
    )
    mockSendMessage.mockImplementation(() => Promise.resolve({ log_id: '2', message: 'Hi there', created_at: 2000 }))
    mockMarkRead.mockImplementation(() =>
      Promise.resolve({ success: true, status_code: 0, chat_id: 'chat-123', watermark: '42' }),
    )

    consoleLogSpy = mock((..._args: unknown[]) => {})
    console.log = consoleLogSpy
  })

  afterEach(() => {
    console.log = originalConsoleLog
    process.exit = originalExit
  })

  describe('list', () => {
    it('fetches messages for a chat room with default count', async () => {
      await messageCommand.parseAsync(['list', 'chat-123', '--count', '20'], { from: 'user' })

      expect(mockGetMessages).toHaveBeenCalledWith('chat-123', { count: 20, from: undefined })
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toHaveLength(1)
      expect(output[0].log_id).toBe('1')
      expect(output[0].message).toBe('Hello')
    })

    it('respects --count option', async () => {
      await messageCommand.parseAsync(['list', 'chat-123', '--count', '5'], { from: 'user' })

      expect(mockGetMessages).toHaveBeenCalledWith('chat-123', { count: 5, from: undefined })
    })

    it('respects --from option', async () => {
      await messageCommand.parseAsync(['list', 'chat-123', '--count', '20', '--from', '999'], { from: 'user' })

      expect(mockGetMessages).toHaveBeenCalledWith('chat-123', { count: 20, from: '999' })
    })

    it('passes account option to withKakaoClient', async () => {
      await messageCommand.parseAsync(['list', 'chat-123', '--count', '20', '--account', 'my-account'], {
        from: 'user',
      })

      expect(mockWithKakaoClient).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'my-account' }),
        expect.any(Function),
      )
    })
  })

  describe('send', () => {
    it('sends a message to a chat room', async () => {
      await messageCommand.parseAsync(['send', 'chat-123', 'Hello world'], { from: 'user' })

      expect(mockSendMessage).toHaveBeenCalledWith('chat-123', 'Hello world')
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output.log_id).toBe('2')
      expect(output.message).toBe('Hi there')
    })

    it('passes account option to withKakaoClient', async () => {
      await messageCommand.parseAsync(['send', 'chat-123', 'Hi', '--account', 'my-account'], { from: 'user' })

      expect(mockWithKakaoClient).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'my-account' }),
        expect.any(Function),
      )
    })
  })

  describe('mark-read', () => {
    it('calls markRead with chat-id and log-id, no opts for normal chat', async () => {
      await messageCommand.parseAsync(['mark-read', 'chat-123', '42'], { from: 'user' })

      expect(mockMarkRead).toHaveBeenCalledWith('chat-123', '42', undefined)
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toEqual({ success: true, status_code: 0, chat_id: 'chat-123', watermark: '42' })
    })

    it('forwards --link-id when provided (open chat)', async () => {
      await messageCommand.parseAsync(['mark-read', 'chat-123', '42', '--link-id', '77777'], { from: 'user' })

      expect(mockMarkRead).toHaveBeenCalledWith('chat-123', '42', { linkId: '77777' })
    })

    it('--pretty prints pretty-formatted JSON (consistent with list/send)', async () => {
      await messageCommand.parseAsync(['mark-read', 'chat-123', '42', '--pretty'], { from: 'user' })

      const printed = consoleLogSpy.mock.calls[0][0] as string
      expect(printed).toContain('\n')
      expect(JSON.parse(printed)).toEqual({
        success: true,
        status_code: 0,
        chat_id: 'chat-123',
        watermark: '42',
      })
    })

    it('exits non-zero when result.success is false (e.g. open chat missing --link-id)', async () => {
      const exitSpy = mock((_code?: number): never => {
        throw new Error('process.exit called')
      })
      process.exit = exitSpy as unknown as typeof process.exit
      mockMarkRead.mockImplementationOnce(() =>
        Promise.resolve({ success: false, status_code: -500, chat_id: 'chat-123', watermark: '42' }),
      )

      try {
        await messageCommand.parseAsync(['mark-read', 'chat-123', '42'], { from: 'user' })
      } catch {
        // process.exit stub throws to abort the action
      }

      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits zero on success', async () => {
      const exitSpy = mock((_code?: number): never => {
        throw new Error('process.exit called')
      })
      process.exit = exitSpy as unknown as typeof process.exit

      await messageCommand.parseAsync(['mark-read', 'chat-123', '42'], { from: 'user' })

      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('passes account option to withKakaoClient', async () => {
      await messageCommand.parseAsync(['mark-read', 'chat-123', '42', '--account', 'my-account'], { from: 'user' })

      expect(mockWithKakaoClient).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'my-account' }),
        expect.any(Function),
      )
    })
  })
})
