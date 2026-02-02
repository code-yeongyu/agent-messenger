import { describe, expect, it, mock } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordDMChannel } from '../types'
import { createAction, listAction } from './dm'

mock.module('../client', () => ({
  DiscordClient: mock(() => ({
    listDMChannels: mock(() => Promise.resolve([])),
    createDM: mock(() => Promise.resolve({})),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(() => Promise.resolve({ token: 'test-token' })),
  })),
}))

describe('dm commands', () => {
  describe('listAction', () => {
    it('should list DM channels', async () => {
      const mockChannels: DiscordDMChannel[] = [
        {
          id: '123',
          type: 1,
          recipients: [
            {
              id: '456',
              username: 'testuser',
            },
          ],
        },
        {
          id: '789',
          type: 3,
          name: 'Group Chat',
          recipients: [
            {
              id: '111',
              username: 'user1',
            },
            {
              id: '222',
              username: 'user2',
            },
          ],
        },
      ]

      const mockClient = {
        listDMChannels: mock(() => Promise.resolve(mockChannels)),
      }

      const mockCredManager = {
        load: mock(() => Promise.resolve({ token: 'test-token' })),
      }

      mock.module('../client', () => ({
        DiscordClient: mock(() => mockClient),
      }))

      mock.module('../credential-manager', () => ({
        DiscordCredentialManager: mock(() => mockCredManager),
      }))

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await listAction({ pretty: false })

      console.log = originalLog

      expect(consoleSpy).toHaveBeenCalled()
      expect(mockClient.listDMChannels).toHaveBeenCalled()
    })

    it('should handle authentication error', async () => {
      const mockCredManager = {
        load: mock(() => Promise.resolve({ token: '' })),
      }

      mock.module('../credential-manager', () => ({
        DiscordCredentialManager: mock(() => mockCredManager),
      }))

      const exitSpy = mock(() => {})
      const originalExit = process.exit
      process.exit = exitSpy as any

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await listAction({ pretty: false })

      console.log = originalLog
      process.exit = originalExit

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('createAction', () => {
    it('should create a DM channel', async () => {
      const mockChannel: DiscordDMChannel = {
        id: '999',
        type: 1,
        recipients: [
          {
            id: '456',
            username: 'newuser',
          },
        ],
      }

      const mockClient = {
        createDM: mock(() => Promise.resolve(mockChannel)),
      }

      const mockCredManager = {
        load: mock(() => Promise.resolve({ token: 'test-token' })),
      }

      mock.module('../client', () => ({
        DiscordClient: mock(() => mockClient),
      }))

      mock.module('../credential-manager', () => ({
        DiscordCredentialManager: mock(() => mockCredManager),
      }))

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await createAction('456', { pretty: false })

      console.log = originalLog

      expect(consoleSpy).toHaveBeenCalled()
      expect(mockClient.createDM).toHaveBeenCalledWith('456')
    })

    it('should handle authentication error', async () => {
      const mockCredManager = {
        load: mock(() => Promise.resolve({ token: '' })),
      }

      mock.module('../credential-manager', () => ({
        DiscordCredentialManager: mock(() => mockCredManager),
      }))

      const exitSpy = mock(() => {})
      const originalExit = process.exit
      process.exit = exitSpy as any

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await createAction('456', { pretty: false })

      console.log = originalLog
      process.exit = originalExit

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
