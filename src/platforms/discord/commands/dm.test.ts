import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordDMChannel } from '../types'
import { createAction, listAction } from './dm'

class ProcessExit extends Error {
  constructor(readonly code?: string | number | null) {
    super(`process.exit(${code})`)
  }
}

let clientListDMChannelsSpy: ReturnType<typeof spyOn>
let clientCreateDMSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>

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

beforeEach(() => {
  clientListDMChannelsSpy = spyOn(DiscordClient.prototype, 'listDMChannels').mockResolvedValue(mockChannels)

  clientCreateDMSpy = spyOn(DiscordClient.prototype, 'createDM').mockResolvedValue({
    id: '999',
    type: 1,
    recipients: [
      {
        id: '456',
        username: 'newuser',
      },
    ],
  })

  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_server: null,
    servers: {},
  })
})

afterEach(() => {
  clientListDMChannelsSpy?.mockRestore()
  clientCreateDMSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
})

describe('dm commands', () => {
  describe('listAction', () => {
    it('lists DM channels', async () => {
      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await listAction({ pretty: false })

      console.log = originalLog

      expect(consoleSpy).toHaveBeenCalled()
      expect(clientListDMChannelsSpy).toHaveBeenCalled()
    })

    it('handles authentication error', async () => {
      credManagerLoadSpy.mockResolvedValue({
        token: '',
        current_server: null,
        servers: {},
      })

      const exitSpy = spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
        throw new ProcessExit(code)
      })

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      try {
        await expect(listAction({ pretty: false })).rejects.toThrow(ProcessExit)
      } finally {
        console.log = originalLog
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('createAction', () => {
    it('creates a DM channel', async () => {
      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      await createAction('456', { pretty: false })

      console.log = originalLog

      expect(consoleSpy).toHaveBeenCalled()
      expect(clientCreateDMSpy).toHaveBeenCalledWith('456')
    })

    it('handles authentication error', async () => {
      credManagerLoadSpy.mockResolvedValue({
        token: '',
        current_server: null,
        servers: {},
      })

      const exitSpy = spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
        throw new ProcessExit(code)
      })

      const consoleSpy = mock(() => {})
      const originalLog = console.log
      console.log = consoleSpy

      try {
        await expect(createAction('456', { pretty: false })).rejects.toThrow(ProcessExit)
      } finally {
        console.log = originalLog
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
