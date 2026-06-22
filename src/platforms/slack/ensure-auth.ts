import { SlackClient } from './client'
import { CredentialManager } from './credential-manager'
import { type ExtractedWorkspace, TokenExtractor } from './token-extractor'

export async function ensureSlackAuth(): Promise<void> {
  const credManager = new CredentialManager()
  const workspace = await credManager.getWorkspace()

  if (workspace) {
    try {
      const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
      await client.testAuth()
      return
    } catch {
      if (await refreshCookie(workspace.token, credManager)) return
    }
  }

  try {
    const extractor = new TokenExtractor()
    const workspaces = await extractor.extract()
    const workspaceDomains = extractor.getWorkspaceDomains()

    const validWorkspaces: ExtractedWorkspace[] = []
    const resolvedTeamIds = new Set<string>()
    const refreshCache = new Map<string, RefreshResult | null>()

    for (const ws of workspaces) {
      try {
        const client = await new SlackClient().login({ token: ws.token, cookie: ws.cookie })
        const authInfo = await client.testAuth()
        if (!authInfo.team_id) throw new Error('testAuth returned empty team_id')
        ws.workspace_id = authInfo.team_id
        ws.workspace_name = authInfo.team || ws.workspace_name
        if (!resolvedTeamIds.has(ws.workspace_id)) {
          resolvedTeamIds.add(ws.workspace_id)
          await credManager.setWorkspace(ws)
          validWorkspaces.push(ws)
        }
      } catch {
        const refreshed = await tryWebTokenRefresh(ws, workspaceDomains, { resolvedTeamIds, refreshCache })
        if (refreshed && !resolvedTeamIds.has(refreshed.workspace_id)) {
          ws.token = refreshed.token
          ws.workspace_id = refreshed.workspace_id
          ws.workspace_name = refreshed.workspace_name
          resolvedTeamIds.add(ws.workspace_id)
          await credManager.setWorkspace(ws)
          validWorkspaces.push(ws)
        }
      }
    }

    const config = await credManager.load()
    if (!config.current_workspace && validWorkspaces.length > 0) {
      await credManager.setCurrentWorkspace(validWorkspaces[0].workspace_id)
    }
  } catch (error) {
    const code = typeof error === 'object' && error !== null ? (error as NodeJS.ErrnoException).code : undefined
    const message = error instanceof Error ? error.message : String(error)
    if (code === 'EBUSY' || message.includes('locking the cookie')) {
      throw error
    }
  }
}

// Bound worst-case HTTP traffic for users with very large root-state.json workspace lists.
const MAX_DOMAIN_ATTEMPTS = 16

// Slack workspace subdomains match `^[a-z][a-z0-9-]*$` per signup rules; validating here
// prevents a tampered root-state.json from steering the cookie-bearing fetch to a non-Slack
// host (e.g. a domain value containing `.`, `/`, `:`, `@`, `#`, or `?`).
const SLACK_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/

export type RefreshResult = { token: string; workspace_id: string; workspace_name: string }

export type RefreshContext = {
  resolvedTeamIds?: Set<string>
  refreshCache?: Map<string, RefreshResult | null>
}

export async function tryWebTokenRefresh(
  ws: ExtractedWorkspace,
  workspaceDomains: Record<string, string>,
  context: RefreshContext = {},
): Promise<RefreshResult | null> {
  if (!ws.cookie) return null

  // Try the domain that maps to this workspace_id first (when known), then fall back to
  // every other known domain. Slack tokens extracted from LevelDB blobs sometimes carry
  // workspace_id="unknown" because the regex window around the xoxc- bytes does not
  // contain the T... team id; in that case the cookie may still be valid for one of the
  // other workspaces the user is signed into.
  const candidates = orderCandidateDomains(ws.workspace_id, workspaceDomains)
  if (candidates.length === 0) return null

  for (const { domain } of candidates) {
    if (!SLACK_DOMAIN_REGEX.test(domain)) continue

    const cacheKey = `${ws.cookie}\u0000${domain}`
    const cached = context.refreshCache?.get(cacheKey)
    let result: RefreshResult | null
    if (cached !== undefined) {
      result = cached
    } else {
      result = await refreshAndVerify(ws.cookie, domain, ws.workspace_name)
      context.refreshCache?.set(cacheKey, result)
    }
    if (!result) continue
    if (context.resolvedTeamIds?.has(result.workspace_id)) continue
    return result
  }
  return null
}

function orderCandidateDomains(
  workspaceId: string,
  workspaceDomains: Record<string, string>,
): Array<{ workspace_id: string; domain: string }> {
  const entries = Object.entries(workspaceDomains).map(([workspace_id, domain]) => ({ workspace_id, domain }))
  const exact = entries.findIndex((e) => e.workspace_id === workspaceId)
  if (exact > 0) {
    const [match] = entries.splice(exact, 1)
    entries.unshift(match)
  }
  return entries.slice(0, MAX_DOMAIN_ATTEMPTS)
}

async function refreshAndVerify(cookie: string, domain: string, fallbackName: string): Promise<RefreshResult | null> {
  try {
    const freshToken = await refreshTokenFromWeb(domain, cookie)
    if (!freshToken) return null

    const client = await new SlackClient().login({ token: freshToken, cookie })
    const authInfo = await client.testAuth()
    if (!authInfo.team_id) return null
    return {
      token: freshToken,
      workspace_id: authInfo.team_id,
      workspace_name: authInfo.team || fallbackName,
    }
  } catch {
    return null
  }
}

const TOKEN_REGEX = /"api_token":"(xoxc-[a-zA-Z0-9-]+)"/

export async function refreshTokenFromWeb(
  domain: string,
  cookie: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(`https://${domain}.slack.com/ssb/redirect`, {
      headers: { Cookie: `d=${cookie}` },
      redirect: 'follow',
    })
    if (!response.ok) return null

    const html = await response.text()
    const match = html.match(TOKEN_REGEX)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function refreshCookie(
  token: string,
  credManager: CredentialManager,
): Promise<{ user_id: string; team_id: string; user?: string; team?: string } | null> {
  try {
    const extractor = new TokenExtractor()
    const freshCookie = await extractor.extractCookie()
    if (!freshCookie) return null

    const client = await new SlackClient().login({ token: token, cookie: freshCookie })
    const authInfo = await client.testAuth()

    const config = await credManager.load()
    for (const ws of Object.values(config.workspaces)) {
      await credManager.setWorkspace({ ...ws, cookie: freshCookie })
    }
    return authInfo
  } catch {
    return null
  }
}
