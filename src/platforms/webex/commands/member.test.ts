import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'

import { WebexClient } from '../client'
import { WebexError } from '../types'

const mockHandleError = mock((err: Error) => {
  throw err
})

mock.module('@/shared/utils/error-handler', () => ({
  handleError: mockHandleError,
}))

const mockMembers = [
  {
    id: 'mem-1',
    roomId: 'room-1',
    personId: 'person-1',
    personEmail: 'alice@example.com',
    personDisplayName: 'Alice',
    isModerator: true,
    created: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'mem-2',
    roomId: 'room-1',
    personId: 'person-2',
    personEmail: 'bob@example.com',
    personDisplayName: 'Bob',
    isModerator: false,
    created: '2024-01-02T00:00:00.000Z',
  },
]

const mockListMemberships = mock(() => Promise.resolve(mockMembers))

import { listAction } from './member'

describe('member commands', () => {
  let consoleSpy: ReturnType<typeof spyOn>
  let loginSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockListMemberships.mockReset().mockImplementation(() => Promise.resolve(mockMembers))
    mockHandleError.mockReset().mockImplementation((err: Error) => {
      throw err
    })

    loginSpy = spyOn(WebexClient.prototype, 'login').mockResolvedValue(
      Object.assign(new WebexClient(), { listMemberships: mockListMemberships }),
    )
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    loginSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  it('calls listMemberships with spaceId and outputs mapped members', async () => {
    await listAction('room-1', {})

    expect(mockListMemberships).toHaveBeenCalledWith('room-1', { max: undefined })
    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify([
        {
          id: 'mem-1',
          personId: 'person-1',
          personEmail: 'alice@example.com',
          personDisplayName: 'Alice',
          isModerator: true,
          created: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'mem-2',
          personId: 'person-2',
          personEmail: 'bob@example.com',
          personDisplayName: 'Bob',
          isModerator: false,
          created: '2024-01-02T00:00:00.000Z',
        },
      ]),
    )
  })

  it('passes limit option to listMemberships', async () => {
    await listAction('room-1', { limit: 25 })

    expect(mockListMemberships).toHaveBeenCalledWith('room-1', { max: 25 })
  })

  it('throws when not authenticated', async () => {
    loginSpy.mockImplementation(async () => {
      throw new WebexError('No Webex credentials found.', 'no_credentials')
    })

    await expect(listAction('room-1', {})).rejects.toThrow('No Webex credentials found.')

    expect(mockHandleError).toHaveBeenCalledWith(expect.any(WebexError))
  })

  it('throws on API error', async () => {
    mockListMemberships.mockImplementation(async () => {
      throw new Error('API failure')
    })

    await expect(listAction('room-1', {})).rejects.toThrow('API failure')

    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error))
  })
})
