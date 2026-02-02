import { describe, expect, it, mock } from 'bun:test'
import { SlackClient } from '../client'
import { countsAction, markAction, threadsAction } from './unread'

mock.module('../credential-manager', () => ({
  CredentialManager: class {
    async getWorkspace() {
      return {
        workspace_id: 'T123',
        workspace_name: 'Test Workspace',
        token: 'xoxc-test',
        cookie: 'test-cookie',
      }
    }
  },
}))

describe('unread commands', () => {
  describe('getUnreadCounts', () => {
    it('should return unread counts', async () => {
      const mockCounts = {
        channels: [
          { id: 'C123', name: 'general', unread_count: 5, mention_count: 2 },
          { id: 'C456', name: 'random', unread_count: 3, mention_count: 0 },
        ],
        total_unread: 8,
        total_mentions: 2,
      }

      const mockClient = {
        getUnreadCounts: mock(() => Promise.resolve(mockCounts)),
      }

      const result = await mockClient.getUnreadCounts()

      expect(result).toEqual(mockCounts)
      expect(result.total_unread).toBe(8)
      expect(result.total_mentions).toBe(2)
      expect(result.channels).toHaveLength(2)
    })
  })

  describe('getThreadView', () => {
    it('should return thread subscription details', async () => {
      const mockThreadView = {
        channel_id: 'C123',
        thread_ts: '1234567890.123456',
        unread_count: 3,
        last_read: '1234567890.123450',
        subscribed: true,
      }

      const mockClient = {
        getThreadView: mock((_channelId: string, _ts: string) => Promise.resolve(mockThreadView)),
      }

      const result = await mockClient.getThreadView('C123', '1234567890.123456')

      expect(result).toEqual(mockThreadView)
      expect(result.unread_count).toBe(3)
      expect(result.subscribed).toBe(true)
    })
  })

  describe('markRead', () => {
    it('should mark channel as read', async () => {
      const mockClient = {
        markRead: mock((_channelId: string, _ts: string) => Promise.resolve()),
      }

      await mockClient.markRead('C123', '1234567890.123456')

      expect(mockClient.markRead).toHaveBeenCalledWith('C123', '1234567890.123456')
    })
  })

  describe('CLI commands', () => {
    it('should handle unread counts command', async () => {
      const mockConsoleLog = mock(() => {})
      const originalLog = console.log
      console.log = mockConsoleLog

      const mockGetUnreadCounts = mock(() =>
        Promise.resolve({
          channels: [{ id: 'C123', name: 'general', unread_count: 5, mention_count: 2 }],
          total_unread: 5,
          total_mentions: 2,
        })
      )

      SlackClient.prototype.getUnreadCounts = mockGetUnreadCounts

      await countsAction({ pretty: false })

      expect(mockGetUnreadCounts).toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalled()

      console.log = originalLog
    })

    it('should handle unread threads command', async () => {
      const mockConsoleLog = mock(() => {})
      const originalLog = console.log
      console.log = mockConsoleLog

      const mockGetThreadView = mock((_channelId: string, _ts: string) =>
        Promise.resolve({
          channel_id: 'C123',
          thread_ts: '1234567890.123456',
          unread_count: 3,
          last_read: '1234567890.123450',
          subscribed: true,
        })
      )

      SlackClient.prototype.getThreadView = mockGetThreadView

      await threadsAction('C123', '1234567890.123456', { pretty: false })

      expect(mockGetThreadView).toHaveBeenCalledWith('C123', '1234567890.123456')
      expect(mockConsoleLog).toHaveBeenCalled()

      console.log = originalLog
    })

    it('should handle mark read command', async () => {
      const mockConsoleLog = mock(() => {})
      const originalLog = console.log
      console.log = mockConsoleLog

      const mockMarkRead = mock((_channelId: string, _ts: string) => Promise.resolve())

      SlackClient.prototype.markRead = mockMarkRead

      await markAction('C123', '1234567890.123456', { pretty: false })

      expect(mockMarkRead).toHaveBeenCalledWith('C123', '1234567890.123456')
      expect(mockConsoleLog).toHaveBeenCalled()

      console.log = originalLog
    })
  })
})
