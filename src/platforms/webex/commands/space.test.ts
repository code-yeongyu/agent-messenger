import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'

import * as errorHandler from '@/shared/utils/error-handler'

import { WebexClient } from '../client'
import { WebexError } from '../types'

const mockSpaces = [
  {
    id: 'space-1',
    title: 'General',
    type: 'group' as const,
    isLocked: false,
    lastActivity: '2024-01-02T00:00:00.000Z',
    created: '2024-01-01T00:00:00.000Z',
    creatorId: 'person-1',
  },
  {
    id: 'space-2',
    title: 'Direct with Alice',
    type: 'direct' as const,
    isLocked: false,
    lastActivity: '2024-01-03T00:00:00.000Z',
    created: '2024-01-01T00:00:00.000Z',
    creatorId: 'person-2',
  },
]

const mockSpace = {
  id: 'space-1',
  title: 'General',
  type: 'group' as const,
  isLocked: false,
  teamId: 'team-abc',
  lastActivity: '2024-01-02T00:00:00.000Z',
  created: '2024-01-01T00:00:00.000Z',
  creatorId: 'person-1',
}

const mockListSpaces = mock(() => Promise.resolve(mockSpaces))
const mockGetSpace = mock(() => Promise.resolve(mockSpace))

import { infoAction, listAction } from './space'

let consoleLogSpy: ReturnType<typeof spyOn>
let loginSpy: ReturnType<typeof spyOn>
let handleErrorSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  mockListSpaces.mockReset().mockImplementation(() => Promise.resolve(mockSpaces))
  mockGetSpace.mockReset().mockImplementation(() => Promise.resolve(mockSpace))
  handleErrorSpy = spyOn(errorHandler, 'handleError').mockImplementation((err: Error) => {
    throw err
  })

  loginSpy = spyOn(WebexClient.prototype, 'login').mockResolvedValue(
    Object.assign(new WebexClient(), { listSpaces: mockListSpaces, getSpace: mockGetSpace }),
  )
  consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  loginSpy.mockRestore()
  handleErrorSpy.mockRestore()
  consoleLogSpy.mockRestore()
})

describe('listAction', () => {
  it('calls listSpaces and outputs mapped array', async () => {
    await listAction({})

    expect(mockListSpaces).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify([
        {
          id: 'space-1',
          title: 'General',
          type: 'group',
          lastActivity: '2024-01-02T00:00:00.000Z',
          created: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'space-2',
          title: 'Direct with Alice',
          type: 'direct',
          lastActivity: '2024-01-03T00:00:00.000Z',
          created: '2024-01-01T00:00:00.000Z',
        },
      ]),
    )
  })

  it('passes type and limit options to listSpaces', async () => {
    await listAction({ type: 'group', limit: 10 })

    expect(mockListSpaces).toHaveBeenCalledWith({ type: 'group', max: 10 })
  })

  it('passes undefined type and limit when not provided', async () => {
    await listAction({})

    expect(mockListSpaces).toHaveBeenCalledWith({ type: undefined, max: undefined })
  })

  it('outputs pretty-printed JSON when pretty is true', async () => {
    await listAction({ pretty: true })

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        [
          {
            id: 'space-1',
            title: 'General',
            type: 'group',
            lastActivity: '2024-01-02T00:00:00.000Z',
            created: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'space-2',
            title: 'Direct with Alice',
            type: 'direct',
            lastActivity: '2024-01-03T00:00:00.000Z',
            created: '2024-01-01T00:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )
  })

  it('throws when not authenticated', async () => {
    loginSpy.mockImplementation(async () => {
      throw new WebexError('No Webex credentials found.', 'no_credentials')
    })

    await expect(listAction({})).rejects.toThrow('No Webex credentials found.')

    expect(mockListSpaces).not.toHaveBeenCalled()
    expect(handleErrorSpy).toHaveBeenCalledWith(expect.any(WebexError))
  })
})

describe('infoAction', () => {
  it('calls getSpace with spaceId and outputs space details', async () => {
    await infoAction('space-1', {})

    expect(mockGetSpace).toHaveBeenCalledWith('space-1')
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: 'space-1',
        title: 'General',
        type: 'group',
        isLocked: false,
        teamId: 'team-abc',
        lastActivity: '2024-01-02T00:00:00.000Z',
        created: '2024-01-01T00:00:00.000Z',
        creatorId: 'person-1',
      }),
    )
  })

  it('outputs null for teamId when not present', async () => {
    mockGetSpace.mockImplementation(() => Promise.resolve({ ...mockSpace, teamId: undefined }))

    await infoAction('space-1', {})

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string) as {
      teamId: null
    }
    expect(output.teamId).toBeNull()
  })

  it('outputs pretty-printed JSON when pretty is true', async () => {
    await infoAction('space-1', { pretty: true })

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          id: 'space-1',
          title: 'General',
          type: 'group',
          isLocked: false,
          teamId: 'team-abc',
          lastActivity: '2024-01-02T00:00:00.000Z',
          created: '2024-01-01T00:00:00.000Z',
          creatorId: 'person-1',
        },
        null,
        2,
      ),
    )
  })

  it('throws when not authenticated', async () => {
    loginSpy.mockImplementation(async () => {
      throw new WebexError('No Webex credentials found.', 'no_credentials')
    })

    await expect(infoAction('space-1', {})).rejects.toThrow('No Webex credentials found.')

    expect(mockGetSpace).not.toHaveBeenCalled()
    expect(handleErrorSpy).toHaveBeenCalledWith(expect.any(WebexError))
  })
})
