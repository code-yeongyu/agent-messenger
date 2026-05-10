import { afterEach, beforeEach, describe, expect, mock, it } from 'bun:test'

const originalConsoleLog = console.log

const mockWithKakaoClient = mock(async (_options: unknown, fn: (client: unknown) => Promise<unknown>) => {
  return fn(mockClient)
})

const mockGetMembers = mock(() =>
  Promise.resolve([
    {
      user_id: '42',
      nickname: 'Alice',
      profile_image_url: null,
      full_profile_image_url: null,
      original_profile_image_url: null,
      status_message: null,
      country_iso: null,
      user_type: 100,
      open_token: null,
      open_profile_link_id: null,
      open_permission: null,
    },
  ]),
)

const mockClient = {
  getMembers: mockGetMembers,
}

mock.module('./shared', () => ({
  withKakaoClient: mockWithKakaoClient,
}))

import { memberCommand } from './member'

describe('member commands', () => {
  let consoleLogSpy: ReturnType<typeof mock>

  beforeEach(() => {
    mockWithKakaoClient.mockReset()
    mockGetMembers.mockReset()

    mockWithKakaoClient.mockImplementation(async (_options: unknown, fn: (client: unknown) => Promise<unknown>) => {
      return fn(mockClient)
    })
    mockGetMembers.mockImplementation(() =>
      Promise.resolve([
        {
          user_id: '42',
          nickname: 'Alice',
          profile_image_url: null,
          full_profile_image_url: null,
          original_profile_image_url: null,
          status_message: null,
          country_iso: null,
          user_type: 100,
          open_token: null,
          open_profile_link_id: null,
          open_permission: null,
        },
      ]),
    )

    consoleLogSpy = mock((..._args: unknown[]) => {})
    console.log = consoleLogSpy
  })

  afterEach(() => {
    console.log = originalConsoleLog
  })

  describe('list', () => {
    it('lists members of a chat room', async () => {
      await memberCommand.parseAsync(['list', '9876543210'], { from: 'user' })

      expect(mockGetMembers).toHaveBeenCalledWith('9876543210')
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toHaveLength(1)
      expect(output[0].user_id).toBe('42')
      expect(output[0].nickname).toBe('Alice')
    })

    it('passes --account option to withKakaoClient', async () => {
      await memberCommand.parseAsync(['list', '9876543210', '--account', 'my-account'], { from: 'user' })

      expect(mockWithKakaoClient).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'my-account' }),
        expect.any(Function),
      )
    })

    it('outputs empty array when chat has no members', async () => {
      mockGetMembers.mockImplementation(() => Promise.resolve([]))

      await memberCommand.parseAsync(['list', '9876543210'], { from: 'user' })

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0])
      expect(output).toEqual([])
    })
  })
})
