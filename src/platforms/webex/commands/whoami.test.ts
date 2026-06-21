import { afterEach, beforeEach, expect, spyOn, it } from 'bun:test'

import { WebexClient } from '../client'
import { toRestId } from '../id-normalizer'
import { WebexError } from '../types'
import { whoamiCommand } from './whoami'

const orgId = Buffer.from('ciscospark://us/ORGANIZATION/org-123').toString('base64url')
const personId = toRestId('person-123', 'PEOPLE')

const mockUser = {
  id: personId,
  ref: 'person-123',
  emails: ['test@example.com'],
  displayName: 'Test User',
  nickName: 'Testy',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  orgId,
  orgRef: 'org-123',
  type: 'person' as const,
  created: '2024-01-01T00:00:00.000Z',
}

let loginSpy: ReturnType<typeof spyOn>
let testAuthSpy: ReturnType<typeof spyOn>
let consoleLogSpy: ReturnType<typeof spyOn>
let stderrWriteSpy: ReturnType<typeof spyOn>
let processExitSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  loginSpy = spyOn(WebexClient.prototype, 'login').mockImplementation(async function (this: WebexClient) {
    return this
  })
  testAuthSpy = spyOn(WebexClient.prototype, 'testAuth').mockResolvedValue(mockUser)
  consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
  stderrWriteSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
  processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)
})

afterEach(() => {
  loginSpy.mockRestore()
  testAuthSpy.mockRestore()
  consoleLogSpy.mockRestore()
  stderrWriteSpy.mockRestore()
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
      id: personId,
      ref: 'person-123',
      emails: ['test@example.com'],
      displayName: 'Test User',
      nickName: 'Testy',
      firstName: 'Test',
      lastName: 'User',
      avatar: 'https://example.com/avatar.jpg',
      orgId,
      orgRef: 'org-123',
      type: 'person',
    }),
  )
})

it('whoami outputs pretty-printed JSON when --pretty flag is passed', async () => {
  await whoamiCommand.parseAsync(['--pretty'], { from: 'user' })

  expect(consoleLogSpy).toHaveBeenCalledWith(
    JSON.stringify(
      {
        id: personId,
        ref: 'person-123',
        emails: ['test@example.com'],
        displayName: 'Test User',
        nickName: 'Testy',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        orgId,
        orgRef: 'org-123',
        type: 'person',
      },
      null,
      2,
    ),
  )
})

it('whoami exits with code 1 when not authenticated', async () => {
  loginSpy.mockRejectedValue(new WebexError('No Webex credentials found.', 'no_credentials'))

  await whoamiCommand.parseAsync([], { from: 'user' })

  expect(testAuthSpy).not.toHaveBeenCalled()
  expect(processExitSpy).toHaveBeenCalledWith(1)
})
