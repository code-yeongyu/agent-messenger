import { afterEach, beforeEach, describe, expect, spyOn, it } from 'bun:test'

import { SlackClient } from './client'
import { CredentialManager } from './credential-manager'
import { ensureSlackAuth, refreshKnownWorkspaceDomains, refreshTokenFromWeb, tryWebTokenRefresh } from './ensure-auth'
import { TokenExtractor } from './token-extractor'

let getWorkspaceSpy: ReturnType<typeof spyOn>
let extractSpy: ReturnType<typeof spyOn>
let extractCookieSpy: ReturnType<typeof spyOn>
let getWorkspaceDomainsSpy: ReturnType<typeof spyOn>
let testAuthSpy: ReturnType<typeof spyOn>
let loginSpy: ReturnType<typeof spyOn>
let setWorkspaceSpy: ReturnType<typeof spyOn>
let loadSpy: ReturnType<typeof spyOn>
let setCurrentWorkspaceSpy: ReturnType<typeof spyOn>
let fetchSpy: ReturnType<typeof spyOn>
let activeToken: string | null = null

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

  activeToken = null
  loginSpy = spyOn(SlackClient.prototype, 'login').mockImplementation(function (
    this: SlackClient,
    credentials?: { token: string; cookie: string },
  ) {
    activeToken = credentials?.token ?? null
    return Promise.resolve(this)
  })

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
  loginSpy?.mockRestore()
  testAuthSpy?.mockRestore()
  setWorkspaceSpy?.mockRestore()
  loadSpy?.mockRestore()
  setCurrentWorkspaceSpy?.mockRestore()
  fetchSpy?.mockRestore()
})

function authResponseByToken(map: Record<string, { team_id: string; team?: string } | Error>) {
  testAuthSpy.mockImplementation(() => {
    const token = activeToken ?? '<no-token>'
    const result = map[token]
    if (!result) throw new Error('invalid_auth')
    if (result instanceof Error) throw result
    return Promise.resolve({ user_id: 'U1', user: 'user', team: result.team, team_id: result.team_id })
  })
}

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
    // given — workspace_id 'unknown' (extractor couldn't resolve team id); cookie is valid
    // for the second candidate domain in root-state.json
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

    authResponseByToken({
      'xoxc-fresh-b': { team_id: 'T_OTHER_B', team: 'Other B' },
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

  it('enumerates all known domains to recover every authenticatable workspace', async () => {
    // given — one stale extracted token, but the cookie is valid for two workspaces
    extractSpy.mockResolvedValue([
      { workspace_id: 'T_TARGET', workspace_name: 'target', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T_TARGET: 'target-domain',
      T_OTHER: 'other-domain',
    })

    fetchSpy.mockImplementation((url: string) => {
      if (url.startsWith('https://target-domain.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-target"</html>', { status: 200 }))
      }
      if (url.startsWith('https://other-domain.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-other"</html>', { status: 200 }))
      }
      return Promise.resolve(new Response('', { status: 500 }))
    })

    authResponseByToken({
      'xoxc-fresh-target': { team_id: 'T_TARGET', team: 'Target' },
      'xoxc-fresh-other': { team_id: 'T_OTHER', team: 'Other' },
    })

    // when
    await ensureSlackAuth()

    // then — both workspaces are recovered from the single cookie, each saved once
    const savedIds = setWorkspaceSpy.mock.calls.map((c) => (c[0] as { workspace_id: string }).workspace_id)
    expect(savedIds.sort()).toEqual(['T_OTHER', 'T_TARGET'])
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

  it('skips domains with non-subdomain characters', async () => {
    // given — a tampered root-state.json with a domain that contains a dot/slash/colon
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T_EVIL: 'attacker.com#',
      T_GOOD: 'good',
    })

    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh"</html>', { status: 200 }))
    authResponseByToken({ 'xoxc-fresh': { team_id: 'T_GOOD', team: 'Good' } })

    // when
    await ensureSlackAuth()

    // then — the bad domain is never fetched; the good domain succeeds
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('attacker.com'), expect.anything())
    expect(fetchSpy).toHaveBeenCalledWith('https://good.slack.com/ssb/redirect', expect.anything())
    expect(setWorkspaceSpy).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'T_GOOD' }))
  })

  it('rejects refresh result when testAuth returns empty team_id', async () => {
    // given — the fresh token verifies but Slack returns no team_id
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ T_A: 'a' })
    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh"</html>', { status: 200 }))
    testAuthSpy.mockResolvedValue({ user_id: 'U1', team_id: '', user: 'user', team: undefined })

    // when
    await ensureSlackAuth()

    // then — nothing is saved despite successful refresh+login
    expect(setWorkspaceSpy).not.toHaveBeenCalled()
  })

  it('does not resolve multiple unknown workspaces to the same team', async () => {
    // given — two unknown tokens share a cookie that validates against the first candidate domain.
    // Naive iteration would resolve both to T_A; the resolved-team-id tracker must prevent the
    // second unknown from claiming an already-saved team.
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale-1', cookie: 'xoxd-valid' },
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale-2', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ T_A: 'a', T_B: 'b' })

    fetchSpy.mockImplementation((url: string) => {
      if (url.startsWith('https://a.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-a"</html>', { status: 200 }))
      }
      if (url.startsWith('https://b.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-b"</html>', { status: 200 }))
      }
      return Promise.resolve(new Response('', { status: 500 }))
    })
    authResponseByToken({
      'xoxc-fresh-a': { team_id: 'T_A', team: 'A' },
      'xoxc-fresh-b': { team_id: 'T_B', team: 'B' },
    })

    // when
    await ensureSlackAuth()

    // then — T_A and T_B each saved exactly once
    const savedIds = setWorkspaceSpy.mock.calls.map((c) => (c[0] as { workspace_id: string }).workspace_id)
    expect(savedIds.sort()).toEqual(['T_A', 'T_B'])
  })

  it('caches refresh attempts per (cookie, domain) within one extraction', async () => {
    // given — two unknown tokens with the same cookie; both will iterate the same domains
    extractSpy.mockResolvedValue([
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale-1', cookie: 'xoxd-valid' },
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale-2', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ T_A: 'a', T_B: 'b' })

    fetchSpy.mockResolvedValue(new Response('', { status: 500 }))
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await ensureSlackAuth()

    // then — each domain fetched at most once across both workspaces (2 total, not 4)
    const refreshCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('/ssb/redirect'))
    expect(refreshCalls.length).toBe(2)
  })

  it('caps single-candidate fallback at MAX_DOMAIN_ATTEMPTS', async () => {
    // given — 20 candidate domains; the per-token fallback only probes the first 16
    const manyDomains: Record<string, string> = {}
    for (let i = 0; i < 20; i++) manyDomains[`T_${i}`] = `dom${i}`
    fetchSpy.mockResolvedValue(new Response('', { status: 500 }))
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await tryWebTokenRefresh(
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-stale', cookie: 'xoxd-valid' },
      manyDomains,
    )

    // then — exactly 16 refresh attempts
    const refreshCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('/ssb/redirect'))
    expect(refreshCalls.length).toBe(16)
  })

  it('enumerates ALL known domains without the MAX_DOMAIN_ATTEMPTS cap', async () => {
    // given — 20 candidate domains; enumeration must probe every one
    const manyDomains: Record<string, string> = {}
    for (let i = 0; i < 20; i++) manyDomains[`T_${i}`] = `dom${i}`
    fetchSpy.mockResolvedValue(new Response('', { status: 500 }))
    testAuthSpy.mockRejectedValue(new Error('invalid_auth'))

    // when
    await refreshKnownWorkspaceDomains('xoxd-valid', manyDomains)

    // then — all 20 domains attempted
    const refreshCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('/ssb/redirect'))
    expect(refreshCalls.length).toBe(20)
  })

  it('dedupes by verified team_id even when no context is supplied', async () => {
    // given — two domains whose cookie verifies to the same team_id, called without a context set
    getWorkspaceDomainsSpy.mockReturnValue({})
    fetchSpy.mockImplementation((url: string) => {
      if (url.startsWith('https://primary.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-primary"</html>', { status: 200 }))
      }
      if (url.startsWith('https://alias.slack.com/')) {
        return Promise.resolve(new Response('<html>"api_token":"xoxc-fresh-alias"</html>', { status: 200 }))
      }
      return Promise.resolve(new Response('', { status: 500 }))
    })
    authResponseByToken({
      'xoxc-fresh-primary': { team_id: 'T_SAME', team: 'Same' },
      'xoxc-fresh-alias': { team_id: 'T_SAME', team: 'Same' },
    })

    // when
    const results = await refreshKnownWorkspaceDomains('xoxd-valid', { T_A: 'primary', T_B: 'alias' })

    // then — the duplicate team is returned only once
    expect(results.map((r) => r.workspace_id)).toEqual(['T_SAME'])
  })

  it('recovers all workspaces from one cookie when only one token is extracted', async () => {
    // given — extractor yields one token deduped into two entries (one with a team id, one unknown),
    // both sharing a single cookie that is valid for five workspaces
    extractSpy.mockResolvedValue([
      { workspace_id: 'T1', workspace_name: 'unknown', token: 'xoxc-shared', cookie: 'xoxd-valid' },
      { workspace_id: 'unknown', workspace_name: 'unknown', token: 'xoxc-shared', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({
      T1: 'one',
      T2: 'two',
      T3: 'three',
      T4: 'four',
      T5: 'five',
    })

    const domainToToken: Record<string, string> = {
      one: 'xoxc-fresh-1',
      two: 'xoxc-fresh-2',
      three: 'xoxc-fresh-3',
      four: 'xoxc-fresh-4',
      five: 'xoxc-fresh-5',
    }
    fetchSpy.mockImplementation((url: string) => {
      const domain = String(url).match(/https:\/\/([^.]+)\.slack\.com/)?.[1] ?? ''
      const token = domainToToken[domain]
      return Promise.resolve(
        token
          ? new Response(`<html>"api_token":"${token}"</html>`, { status: 200 })
          : new Response('', { status: 500 }),
      )
    })
    authResponseByToken({
      'xoxc-shared': new Error('invalid_auth'),
      'xoxc-fresh-1': { team_id: 'T1', team: 'one' },
      'xoxc-fresh-2': { team_id: 'T2', team: 'two' },
      'xoxc-fresh-3': { team_id: 'T3', team: 'three' },
      'xoxc-fresh-4': { team_id: 'T4', team: 'four' },
      'xoxc-fresh-5': { team_id: 'T5', team: 'five' },
    })

    // when
    await ensureSlackAuth()

    // then — all five teams recovered, each saved exactly once
    const savedIds = setWorkspaceSpy.mock.calls.map((c) => (c[0] as { workspace_id: string }).workspace_id)
    expect(savedIds.sort()).toEqual(['T1', 'T2', 'T3', 'T4', 'T5'])
  })

  it('keeps a valid extracted token without overwriting it via enumeration', async () => {
    // given — a single extracted token that authenticates directly
    extractSpy.mockResolvedValue([
      { workspace_id: 'T1', workspace_name: 'ws1', token: 'xoxc-good', cookie: 'xoxd-valid' },
    ])
    getWorkspaceDomainsSpy.mockReturnValue({ T1: 'one' })
    authResponseByToken({
      'xoxc-good': { team_id: 'T1', team: 'ws1' },
      'xoxc-fresh-1': { team_id: 'T1', team: 'ws1' },
    })
    fetchSpy.mockResolvedValue(new Response('<html>"api_token":"xoxc-fresh-1"</html>', { status: 200 }))

    // when
    await ensureSlackAuth()

    // then — saved once with the original valid token, not the web-refreshed one
    expect(setWorkspaceSpy).toHaveBeenCalledTimes(1)
    expect(setWorkspaceSpy).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: 'T1', token: 'xoxc-good' }))
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
