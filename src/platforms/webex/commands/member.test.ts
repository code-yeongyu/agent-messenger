import { afterEach, beforeEach, describe, expect, spyOn, it } from 'bun:test'

import { WebexClient } from '../client'
import { WebexError } from '../types'

const restId = (type: string, ref: string) => Buffer.from(`ciscospark://us/${type}/${ref}`).toString('base64url')
const member1Id = restId('MEMBERSHIP', 'person-1:room-1')
const member2Id = restId('MEMBERSHIP', 'person-2:room-1')
const person1Id = restId('PEOPLE', 'person-1')
const person2Id = restId('PEOPLE', 'person-2')

const mockMembers = [
  {
    id: member1Id,
    ref: 'person-1:room-1',
    roomId: 'room-1',
    roomRef: 'room-1',
    personId: person1Id,
    personRef: 'person-1',
    personEmail: 'alice@example.com',
    personDisplayName: 'Alice',
    isModerator: true,
    created: '2024-01-01T00:00:00.000Z',
  },
  {
    id: member2Id,
    ref: 'person-2:room-1',
    roomId: 'room-1',
    roomRef: 'room-1',
    personId: person2Id,
    personRef: 'person-2',
    personEmail: 'bob@example.com',
    personDisplayName: 'Bob',
    isModerator: false,
    created: '2024-01-02T00:00:00.000Z',
  },
]

import { listAction } from './member'

describe('member commands', () => {
  let mockListMemberships: ReturnType<typeof spyOn>
  let mockLogin: ReturnType<typeof spyOn>
  let consoleSpy: ReturnType<typeof spyOn>
  let consoleErrorSpy: ReturnType<typeof spyOn>
  let processExitSpy: ReturnType<typeof spyOn>
  const protoSpies: ReturnType<typeof spyOn>[] = []

  function protoSpy(method: keyof WebexClient) {
    const s = spyOn(WebexClient.prototype, method as never)
    protoSpies.push(s)
    return s
  }

  beforeEach(() => {
    mockLogin = protoSpy('login').mockImplementation(async function (this: WebexClient) {
      return this
    })
    mockListMemberships = protoSpy('listMemberships').mockResolvedValue(mockMembers)

    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
    for (const s of protoSpies) s.mockRestore()
    protoSpies.length = 0
  })

  it('calls listMemberships with spaceId and outputs mapped members', async () => {
    await listAction('room-1', {})

    expect(mockListMemberships).toHaveBeenCalledWith('room-1', { max: undefined })
    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify([
        {
          id: member1Id,
          ref: 'person-1:room-1',
          personId: person1Id,
          personRef: 'person-1',
          personEmail: 'alice@example.com',
          personDisplayName: 'Alice',
          isModerator: true,
          created: '2024-01-01T00:00:00.000Z',
        },
        {
          id: member2Id,
          ref: 'person-2:room-1',
          personId: person2Id,
          personRef: 'person-2',
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

  it('exits with code 1 when not authenticated', async () => {
    mockLogin.mockRejectedValue(new WebexError('No Webex credentials found.', 'no_credentials'))

    await listAction('room-1', {})

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('exits with code 1 on API error', async () => {
    mockListMemberships.mockRejectedValue(new Error('API failure'))

    await listAction('room-1', {})

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
