import { afterEach, beforeEach, describe, expect, spyOn, it } from 'bun:test'

import { SlackClient } from './client'
import { CredentialManager } from './credential-manager'
import { ensureSlackAuth, refreshTokenFromWeb } from './ensure-auth'
import { TokenExtractor } from './token-extractor'

let getWorkspaceSpy: ReturnType<typeof spyOn>
let extractSpy: ReturnType<typeof spyOn>
let extractCookieSpy: ReturnType<typeof spyOn>
let getWorkspaceDomainsSpy: ReturnType<typeof spyOn>
let testAuthSpy: ReturnType<typeof spyOn>
let setWorkspaceSpy: ReturnType<typeof spyOn>
let loadSpy: ReturnType<typeof spyOn>
let setCurrentWorkspaceSpy: ReturnType<typeof spyOn>
let fetchSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  getWorkspaceSpy = spyOn(CredentialManager.prototype, 'getWorkspace').mockResolvedValue(null)

  extractSpy = spyOn(TokenExtractor.prototype, 'extract').mockResolvedValue([
    {
      workspace_id: 'T123',
      workspace_name: 'test-workspace',
      token: 'xoxc-test-token',
      cookie: 'xoxd-test-cookie',
    },
  ])

  extractCookieSpy = spyOn(TokenExtractor.prototype, 'extractCookie').mockResolvedValue('xoxd-fresh-cookie')

  getWorkspaceDomainsSpy = spyOn(TokenExtractor.prototype, 'getWorkspaceDomains').mockReturnValue({})

  testAuthSpy = spyOn(SlackClient.prototype, 'testAuth').mockResolvedValue({
    user_id: 'U123',
    team_id: 'T123',
    user: 'testuser',
    team: 'Test Team',
  })

  setWorkspaceSpy = spyOn(CredentialManager.prototype, 'setWorkspace').mockResolvedValue(undefined)

  loadSpy = spyOn(CredentialManager.prototype, 'load').mockResolvedValue({
    current_workspace: null,
    workspaces: {},
  })

  setCurrentWorkspaceSpy = spyOn(CredentialManager.prototype, 'setCurrentWorkspace').mockResolvedValue(undefined)

  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
})

afterEach(() => {
  getWorkspaceSpy?.mockRestore()
  extractSpy?.mockRestore()
  extractCookieSpy?.mockRestore()
  getWorkspaceDomainsSpy?.mockRestore()
  testAuthSpy?.mockRestore()
  setWorkspaceSpy?.mockRestore()
  loadSpy?.mockRestore()
  setCurrentWorkspaceSpy?.mockRestore()
  fetchSpy?.mockRestore()
})

describe('ensureSlackAuth', () => {
  it('skips extraction when stored credentials are valid', async () => {
    // given
    getWorkspaceSpy.mockResolvedValue({
      workspace_id: 'T123',
      workspace_name: 'existing',
      token: 'xoxc-existing',
      cookie: 'xoxd-existing',
    })

    // when
    await ensureSlackAuth()

    // then
    expect(testAuthSpy).toHaveBeenCalled()
    expect(extractSpy).not.toHaveBeenCalled()
  })

  it('refreshes cookie when stored credentials are stale', async () => {
    // given
    getWorkspaceSpy.mockResolvedValue({
      workspace_id: 'T123',
      workspace_name: 'existing',
      token: 'xoxc-existing',
      cookie: 'xoxd-old-cookie',
    })
    let callCount = 0
    testAuthSpy.mockImplementation(() => {
      callCount++
      if (callCount === 1) throw new Error('invalid_auth')
      return Promise.resolve({ user_id: 'U1', team_id: 'T123', user: 'user', team: 'Team' })
    })
    loadSpy.mockResolvedValue({
      current_workspace: 'T123',
      workspaces: {
        T123: { workspace_id: 'T123', workspace_name: 'existing', token: 'xoxc-existing', cookie: 'xoxd-old-cookie' },
      },
    })

    // when
    await ensureSlackAuth()

    // then — cookie refreshed, no full extraction
    expect(extractCookieSpy).toHaveBeenCalled()
    expect(extractSpy).not.toHaveBeenCalled()
    expect(setWorkspaceSpy).toHaveBeenCalledWith(expect.objectContaining({ cookie: 'xoxd-fresh-cookie' }))
  })

  it('falls through to full extraction when cookie refresh fails', async () => {
    // given
    getWorkspaceSpy.mockResolvedValue({
      workspace_id: 'T123',
      workspace_name: 'existing',
      token: 'xoxc-existing',
      cookie: 'xoxd-old-cookie',
    })
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))
    extractCookieSpy.mockResolvedValue('')

    // when
    await ensureSlackAuth()

    // then — falls through to full extraction
    expect(extractSpy).toHaveBeenCalled()
  })

  it('extracts and saves credentials when none exist', async () => {
    // when
    await ensureSlackAuth()

    // then
    expect(extractSpy).toHaveBeenCalled()
    expect(testAuthSpy).toHaveBeenCalled()
    expect(setWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'T123',
        token: 'xoxc-test-token',
        cookie: 'xoxd-test-cookie',
        workspace_name: 'Test Team',
      }),
    )
  })

  it('sets first workspace as current when none set', async () => {
    // when
    await ensureSlackAuth()

    // then
    expect(setCurrentWorkspaceSpy).toHaveBeenCalledWith('T123')
  })

  it('does not override existing current workspace', async () => {
    // given
    loadSpy.mockResolvedValue({
      current_workspace: 'T999',
      workspaces: { T999: { workspace_id: 'T999', workspace_name: 'other', token: 't', cookie: 'c' } },
    })

    // when
    await ensureSlackAuth()

    // then
    expect(setCurrentWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('handles multiple workspaces', async () => {
    // given
    extractSpy.mockResolvedValue([
      { workspace_id: 'T1', workspace_name: 'ws1', token: 'xoxc-1', cookie: 'xoxd-1' },
      { workspace_id: 'T2', workspace_name: 'ws2', token: 'xoxc-2', cookie: 'xoxd-2' },
    ])
    let authCallCount = 0
    testAuthSpy.mockImplementation(() => {
      authCallCount++
      return Promise.resolve(
        authCallCount === 1
          ? { user_id: 'U1', team_id: 'T1', user: 'user1', team: 'ws1' }
          : { user_id: 'U2', team_id: 'T2', user: 'user2', team: 'ws2' },
      )
    })

    // when
    await ensureSlackAuth()

    // then
    expect(setWorkspaceSpy).toHaveBeenCalledTimes(2)
    expect(setCurrentWorkspaceSpy).toHaveBeenCalledWith('T1')
  })

  it('skips invalid workspaces during validation', async () => {
    // given
    extractSpy.mockResolvedValue([
      { workspace_id: 'T-bad', workspace_name: 'bad', token: 'xoxc-bad', cookie: 'xoxd-bad' },
      { workspace_id: 'T-good', workspace_name: 'good', token: 'xoxc-good', cookie: 'xoxd-good' },
    ])
    let callCount = 0
    testAuthSpy.mockImplementation(() => {
      callCount++
      if (callCount === 1) throw new Error('invalid_auth')
      return Promise.resolve({ user_id: 'U1', team_id: 'T-good', user: 'user', team: 'Good Team' })
    })

    // when
    await ensureSlackAuth()

    // then - only the valid workspace is saved
    expect(setWorkspaceSpy).toHaveBeenCalledTimes(1)
    expect(setWorkspaceSpy).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'T-good' }))
    expect(setCurrentWorkspaceSpy).toHaveBeenCalledWith('T-good')
  })

  it('silently handles extraction failure', async () => {
    // given
    extractSpy.mockRejectedValue(new Error('Slack directory not found'))

    // when/then
    await ensureSlackAuth()

    // then
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('propagates cookie lock error when Slack app is running', async () => {
    // given
    const error = new Error(
      'Failed to read Slack cookies. The Slack app is currently running and locking the cookie database. ' +
        'Quit the Slack app completely and try again.',
    )
    ;(error as NodeJS.ErrnoException).code = 'EBUSY'
    extractSpy.mockRejectedValue(error)

    // when — then
    await expect(ensureSlackAuth()).rejects.toThrow('locking the cookie')
  })

  it('does not save when no workspaces extracted', async () => {
    // given
    extractSpy.mockResolvedValue([])

    // when
    await ensureSlackAuth()

    // then
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
    expect(setCurrentWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('refreshes token from web when local token is invalid', async () => {
    // given — local token is stale, but cookie is valid and domain is known
    extractSpy.mockResolvedValue([
      { workspace_id: 'T-stale', workspace_name: 'stale-ws', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ 'T-stale': 'myworkspace' })

    let testAuthCallCount = 0
    testAuthSpy.mockImplementation(() => {
      testAuthCallCount++
      if (testAuthCallCount === 1) throw new Error('invalid_auth')
      return Promise.resolve({ user_id: 'U1', team_id: 'T-stale', user: 'user', team: 'Fresh Team' })
    })

    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh-from-web"</html>', { status: 200 }))

    // when
    await ensureSlackAuth()

    // then — web-refreshed token is saved
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://myworkspace.slack.com/ssb/redirect',
      expect.objectContaining({ headers: { Cookie: 'd=xoxd-valid' } }),
    )
    expect(setWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: 'T-stale', token: 'xoxc-fresh-from-web', workspace_name: 'Fresh Team' }),
    )
  })

  it('skips web refresh when domain map is empty', async () => {
    // given — domain mapping is empty
    extractSpy.mockResolvedValue([
      { workspace_id: 'T-stale', workspace_name: 'stale-ws', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({})
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await ensureSlackAuth()

    // then — no fetch attempt, workspace not saved
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('ssb/redirect'), expect.anything())
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('falls back to other known domains when workspace_id has no domain mapping', async () => {
    // given — token has workspace_id 'unknown' (extractor couldn't resolve team id),
    // but cookie is valid for the second domain in root-state.json
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T_OTHER_A: 'other-a',
      T_OTHER_B: 'other-b',
    })

    fetchSpy.mockImplementation((url: string) => {
      if (url.startsWith('https://other-a.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-a"</html>', { status: 200 }))
      }
      if (url.startsWith('https://other-b.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-b"</html>', { status: 200 }))
      }
      return Promise.resolve(new Response('', { status: 500 }))
    })

    // The first testAuth call is from the loop's main path with the stale local token (fails),
    // the second is the first domain candidate (fails), the third is the second candidate (succeeds).
    let authCalls = 0
    testAuthSpy.mockImplementation(() => {
      authCalls++
      if (authCalls < 3) throw new Error('invalid_auth')
      return Promise.resolve({ user_id: 'U1', team_id: 'T_OTHER_B', user: 'user', team: 'Other B' })
    })

    // when
    await ensureSlackAuth()

    // then — both candidate domains were tried; the workspace saves with the resolved team_id
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://other-a.slack.com/ssb/redirect',
      expect.objectContaining({ headers: { Cookie: 'd=xoxd-valid' } }),
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://other-b.slack.com/ssb/redirect',
      expect.objectContaining({ headers: { Cookie: 'd=xoxd-valid' } }),
    )
    expect(setWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: 'T_OTHER_B', token: 'xoxc-fresh-b', workspace_name: 'Other B' }),
    )
  })

  it('stops trying domains once a refresh+verify succeeds', async () => {
    // given — first candidate domain succeeds; later domains must not be attempted
    extractSpy.mockResolvedValue([
      { workspace_id: 'T_TARGET', workspace_name: 'target', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T_TARGET: 'target-domain',
      T_OTHER: 'other-domain',
    })

    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh"</html>', { status: 200 }))

    let authCalls = 0
    testAuthSpy.mockImplementation(() => {
      authCalls++
      if (authCalls === 1) throw new Error('invalid_auth')
      return Promise.resolve({ user_id: 'U1', team_id: 'T_TARGET', user: 'user', team: 'Target' })
    })

    // when
    await ensureSlackAuth()

    // then — the exact-match domain is tried, fallback domain is not
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://target-domain.slack.com/ssb/redirect',
      expect.objectContaining({ headers: { Cookie: 'd=xoxd-valid' } }),
    )
    expect(fetchSpy).not.toHaveBeenCalledWith(
      'https://other-domain.slack.com/ssb/redirect',
      expect.anything(),
    )
  })

  it('returns failure when no known domain validates the cookie', async () => {
    // given — none of the domains in the map produce a valid token+cookie pair
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T_A: 'a',
      T_B: 'b',
    })

    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh"</html>', { status: 200 }))
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await ensureSlackAuth()

    // then — every candidate is tried, none save
    expect(fetchSpy).toHaveBeenCalledWith('https://a.slack.com/ssb/redirect', expect.anything())
    expect(fetchSpy).toHaveBeenCalledWith('https://b.slack.com/ssb/redirect', expect.anything())
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('skips web refresh when workspace has no cookie', async () => {
    // given — cookie is empty
    extractSpy.mockResolvedValue([
      { workspace_id: 'T-stale', workspace_name: 'stale-ws', token: 'xoxc-stale', cookie: '' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ 'T-stale': 'myworkspace' })
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await ensureSlackAuth()

    // then — no fetch attempt
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('ssb/redirect'), expect.anything())
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('updates workspace_name from auth response', async () => {
    // given
    extractSpy.mockResolvedValue([
      { workspace_id: 'T1', workspace_name: 'old-name', token: 'xoxc-1', cookie: 'xoxd-1' },
    ])
    testAuthSpy.mockResolvedValue({
      user_id: 'U1',
      team_id: 'T1',
      user: 'user',
      team: 'New Team Name',
    })

    // when
    await ensureSlackAuth()

    // then
    expect(setWorkspaceSpy).toHaveBeenCalledWith(expect.objectContaining({ workspace_name: 'New Team Name' }))
  })

  it('resolves unknown workspace_id from testAuth before saving', async () => {
    // given — extractor returns unknown workspace_id
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-1', cookie: 'xoxd-1' },
    ])
    testAuthSpy.mockResolvedValue({
      user_id: 'U1',
      team_id: 'T-REAL',
      user: 'user',
      team: 'Real Team',
    })

    // when
    await ensureSlackAuth()

    // then — saved with resolved team_id, not "unknown"
    expect(setWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: 'T-REAL', workspace_name: 'Real Team' }),
    )
  })
})

describe('refreshTokenFromWeb', () => {
  it('extracts token from ssb/redirect HTML response', async () => {
    // given
    fetchSpy.mockResolvedValue(
      new Response(
        '<html><script>var boot_data = {"api_token":"xoxc-111-222-333-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"};</script></html>',
        { status: 200 },
      ),
    )

    // when
    const token = await refreshTokenFromWeb('myworkspace', 'xoxd-test-cookie')

    // then
    expect(token).toBe('xoxc-111-222-333-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
    expect(fetchSpy).toHaveBeenCalledWith('https://myworkspace.slack.com/ssb/redirect', {
      headers: { Cookie: 'd=xoxd-test-cookie' },
      redirect: 'follow',
    })
  })

  it('returns null when response has no token', async () => {
    // given
    fetchSpy.mockResolvedValue(new Response('<html>no token here</html>', { status: 200 }))

    // when
    const token = await refreshTokenFromWeb('myworkspace', 'xoxd-test-cookie')

    // then
    expect(token).toBeNull()
  })

  it('returns null on HTTP error', async () => {
    // given
    fetchSpy.mockResolvedValue(new Response('', { status: 403 }))

    // when
    const token = await refreshTokenFromWeb('myworkspace', 'xoxd-test-cookie')

    // then
    expect(token).toBeNull()
  })

  it('returns null on network error', async () => {
    // given
    fetchSpy.mockRejectedValue(new Error('network timeout'))

    // when
    const token = await refreshTokenFromWeb('myworkspace', 'xoxd-test-cookie')

    // then
    expect(token).toBeNull()
  })
})
