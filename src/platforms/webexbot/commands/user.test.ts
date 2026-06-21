import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const restId = (type: string, ref: string) => Buffer.from(`ciscospark://us/${type}/${ref}`).toString('base64url')
const personId = restId('PEOPLE', 'p1')
const orgId = restId('ORGANIZATION', 'o1')

const mockListPeople = mock(() =>
  Promise.resolve([
    {
      id: personId,
      emails: ['alice@example.com'],
      displayName: 'Alice',
      orgId,
      type: 'person' as const,
      created: '',
    },
  ]),
)

const mockGetPerson = mock(() =>
  Promise.resolve({
    id: personId,
    emails: ['alice@example.com'],
    displayName: 'Alice',
    orgId,
    type: 'person' as const,
    created: '2024-01-01T00:00:00Z',
  }),
)

mock.module('../client', () => ({
  WebexBotClient: class MockWebexBotClient {
    async login(): Promise<this> {
      return this
    }
    listPeople = mockListPeople
    getPerson = mockGetPerson
  },
}))

import { WebexBotCredentialManager } from '../credential-manager'
import { infoAction, listAction } from './user'

describe('webexbot user commands', () => {
  let tempDir: string
  let manager: WebexBotCredentialManager

  beforeEach(async () => {
    tempDir = join(tmpdir(), `webexbot-user-test-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    manager = new WebexBotCredentialManager(tempDir)
    await manager.setCredentials({ token: 'token123', bot_id: 'bot1', bot_name: 'Bot' })
    mockListPeople.mockClear()
    mockGetPerson.mockClear()
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
  })

  it('lists people by email', async () => {
    const result = await listAction({ _credManager: manager, email: 'alice@example.com' })

    expect(result.users).toHaveLength(1)
    expect(result.users?.[0].displayName).toBe('Alice')
    expect(result.users?.[0].ref).toBe('p1')
    expect(mockListPeople).toHaveBeenCalled()
  })

  it('gets a person by id', async () => {
    const result = await infoAction('p1', { _credManager: manager })

    expect(result.id).toBe(personId)
    expect(result.ref).toBe('p1')
    expect(result.displayName).toBe('Alice')
  })
})
