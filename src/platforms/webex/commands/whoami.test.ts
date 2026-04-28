import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'

import { WebexError } from '../types'

mock.module('@/shared/utils/error-handler', () => ({
  handleError: (_err: Error) => {
    process.exit(1)
  },
}))

const mockUser = {
  id: 'person-123',
  emails: ['test@example.com'],
  displayName: 'Test User',
  nickName: 'Testy',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  orgId: 'org-123',
  type: 'person' as const,
  created: '2024-01-01T00:00:00.000Z',
}

const mockTestAuth = mock(() => Promise.resolve(mockUser))
const mockLogin = mock(() => Promise.resolve({ testAuth: mockTestAuth }))

mock.module('../client', () => ({
  WebexClient: class {
    login = mockLogin
  },
}))

import { whoamiCommand } from './whoami'

describe('whoami command', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>
  let processExitSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockTestAuth.mockReset().mockImplementation(() => Promise.resolve(mockUser))
    mockLogin.mockReset().mockImplementation(() => Promise.resolve({ testAuth: mockTestAuth }))
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  it('whoami command is defined with correct name and description', () => {
    expect(whoamiCommand).toBeDefined()
    expect(whoamiCommand.name()).toBe('whoami')
    expect(whoamiCommand.description()).toBe('Show current authenticated user')
  })

  it('whoami command has --pretty option', () => {
    const options = whoamiCommand.options
    const hasPretty = options.some((opt: { long?: string }) => opt.long === '--pretty')
    expect(hasPretty).toBe(true)
  })

  it('whoami calls testAuth and outputs user fields', async () => {
    await whoamiCommand.parseAsync([], { from: 'user' })

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: 'person-123',
        emails: ['test@example.com'],
        displayName: 'Test User',
        nickName: 'Testy',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        orgId: 'org-123',
        type: 'person',
      }),
    )
  })

  it('whoami outputs pretty-printed JSON when --pretty flag is passed', async () => {
    await whoamiCommand.parseAsync(['--pretty'], { from: 'user' })

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          id: 'person-123',
          emails: ['test@example.com'],
          displayName: 'Test User',
          nickName: 'Testy',
          firstName: 'Test',
          lastName: 'User',
          avatar: 'https://example.com/avatar.jpg',
          orgId: 'org-123',
          type: 'person',
        },
        null,
        2,
      ),
    )
  })

  it('whoami exits with code 1 when not authenticated', async () => {
    mockLogin.mockImplementation(async () => {
      throw new WebexError('No Webex credentials found.', 'no_credentials')
    })

    await whoamiCommand.parseAsync([], { from: 'user' })

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
