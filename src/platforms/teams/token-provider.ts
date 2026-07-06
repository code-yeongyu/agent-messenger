import {
  AAD_AUDIENCE_GRAPH,
  AAD_AUDIENCE_SUBSTRATE,
  AAD_SCOPE_GRAPH,
  AAD_SCOPE_SUBSTRATE,
  consumerTokenUrl,
  getTeamsAppClientId,
  organizationsTokenUrl,
  TEAMS_WEB_ORIGIN,
} from './app-config'
import { TeamsCredentialManager } from './credential-manager'
import type { TeamsAccount, TeamsAccountType } from './types'
import { TeamsAuthCapabilityError, TeamsError } from './types'

export type TokenAudience = 'skype' | 'substrate' | 'graph'

type BearerAudience = Exclude<TokenAudience, 'skype'>

interface CachedToken {
  accessToken: string
  expiresAt: number
  aud: string
  tenantId?: string
  userId?: string
}

type CacheKey = TokenAudience | `${TeamsAccountType}:${BearerAudience}`

interface CurrentAccountContext {
  accountType: TeamsAccountType
  account: TeamsAccount
}

interface BearerAudienceConfig {
  scope: string
  aud: string
}

interface JwtClaims {
  aud?: string
  tid?: string
  oid?: string
  exp?: number
  [key: string]: unknown
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000
const DEFAULT_ACCESS_TOKEN_TTL_SEC = 3600

const BEARER_AUDIENCES: Record<BearerAudience, BearerAudienceConfig> = {
  substrate: { scope: AAD_SCOPE_SUBSTRATE, aud: AAD_AUDIENCE_SUBSTRATE },
  graph: { scope: AAD_SCOPE_GRAPH, aud: AAD_AUDIENCE_GRAPH },
}

export class TeamsTokenProvider {
  private cache: Map<CacheKey, CachedToken> = new Map()
  private tenantId?: string
  private userId?: string
  private boundAccountType?: TeamsAccountType
  private lastAccountType?: TeamsAccountType

  constructor(private credManager: TeamsCredentialManager = new TeamsCredentialManager()) {}

  bindAccount(accountType: TeamsAccountType): this {
    this.boundAccountType = accountType
    return this
  }

  async getSkypeToken(): Promise<string> {
    const cached = this.getCached('skype')
    if (cached) return cached.accessToken

    const cred = await this.credManager.getTokenWithExpiry()
    if (!cred?.token) {
      throw new TeamsError(
        'No Teams credentials found. Run `agent-teams auth login` or `agent-teams auth extract`.',
        'no_credentials',
      )
    }

    const expiresAt = cred.tokenExpiresAt ? new Date(cred.tokenExpiresAt).getTime() : Number.POSITIVE_INFINITY
    if (expiresAt <= Date.now()) {
      throw new TeamsError('Token has expired. Run "auth login" or "auth extract" to refresh.', 'token_expired')
    }

    this.cache.set('skype', { accessToken: cred.token, expiresAt, aud: 'skype' })
    return cred.token
  }

  async getSubstrateToken(): Promise<string> {
    return this.getBearerToken('substrate')
  }

  async getGraphToken(): Promise<string> {
    return this.getBearerToken('graph')
  }

  async getTenantId(): Promise<string> {
    await this.ensureIdentity()
    if (!this.tenantId) {
      throw new TeamsError(
        'Microsoft token did not include a tenant id needed for Teams search.',
        'aad_identity_missing',
      )
    }
    return this.tenantId
  }

  async getUserId(): Promise<string> {
    await this.ensureIdentity()
    if (!this.userId) {
      throw new TeamsError('Microsoft token did not include a user id needed for Teams search.', 'aad_identity_missing')
    }
    return this.userId
  }

  private getCached(key: CacheKey): CachedToken | undefined {
    const cached = this.cache.get(key)
    if (!cached) return undefined
    return cached.expiresAt - Date.now() > REFRESH_BUFFER_MS ? cached : undefined
  }

  private async getBearerToken(audience: BearerAudience): Promise<string> {
    const current = await this.getCurrentAccount()
    this.resetIdentityIfAccountChanged(current.accountType)
    const cacheKey: CacheKey = `${current.accountType}:${audience}`
    const cached = this.getCached(cacheKey)
    if (cached) {
      // a cache hit after an account switch reset our identity, so restore the
      // tenant/user claims captured when this token was minted
      this.tenantId = cached.tenantId ?? this.tenantId
      this.userId = cached.userId ?? this.userId
      return cached.accessToken
    }

    if (!current.account.aad_refresh_token) {
      throw new TeamsAuthCapabilityError()
    }

    const clientId = current.account.aad_client_id ?? getTeamsAppClientId(current.accountType).clientId
    const config = BEARER_AUDIENCES[audience]
    const token = await this.refreshBearerToken({
      accountType: current.accountType,
      clientId,
      refreshToken: current.account.aad_refresh_token,
      audience,
      config,
    })

    this.cache.set(cacheKey, token)
    return token.accessToken
  }

  private async refreshBearerToken(params: {
    accountType: TeamsAccountType
    clientId: string
    refreshToken: string
    audience: BearerAudience
    config: BearerAudienceConfig
  }): Promise<CachedToken> {
    const response = await fetch(tokenUrlForAccount(params.accountType), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: TEAMS_WEB_ORIGIN,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: params.clientId,
        refresh_token: params.refreshToken,
        scope: params.config.scope,
      }),
    })

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      throw new TeamsError(
        `Microsoft token refresh failed: ${describeAadError(body, response.status)}`,
        'aad_refresh_failed',
      )
    }

    const accessToken = stringField(body, 'access_token')
    if (!accessToken) {
      throw new TeamsError('Microsoft token refresh response did not include an access token.', 'aad_access_missing')
    }

    const claims = decodeJwt(accessToken)
    if (claims.aud !== params.config.aud) {
      throw new TeamsError(
        `Microsoft token audience mismatch: expected ${params.config.aud}, got ${claims.aud ?? 'missing'}.`,
        'aad_audience_mismatch',
      )
    }

    this.tenantId = claims.tid ?? this.tenantId
    this.userId = claims.oid ?? this.userId

    const rotatedRefreshToken = stringField(body, 'refresh_token')
    if (rotatedRefreshToken) {
      await this.credManager.updateAadRefreshToken(params.accountType, rotatedRefreshToken, params.clientId)
    }

    const expiresIn = numberField(body, 'expires_in') ?? DEFAULT_ACCESS_TOKEN_TTL_SEC
    return {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      aud: params.config.aud,
      tenantId: claims.tid,
      userId: claims.oid,
    }
  }

  private async getCurrentAccount(): Promise<CurrentAccountContext> {
    const config = await this.credManager.loadConfig()
    if (!config) {
      throw new TeamsError(
        'No Teams credentials found. Run `agent-teams auth login` or `agent-teams auth extract`.',
        'no_credentials',
      )
    }
    const accountKey = this.boundAccountType ?? TeamsCredentialManager.accountOverride ?? config.current_account
    if (accountKey !== 'work' && accountKey !== 'personal') {
      throw new TeamsError(
        'No active Teams account selected. Run `agent-teams auth switch-account`.',
        'no_current_account',
      )
    }
    const account = config.accounts[accountKey]
    if (!account) {
      throw new TeamsError(
        'No active Teams account selected. Run `agent-teams auth switch-account`.',
        'no_current_account',
      )
    }
    return { accountType: accountKey, account }
  }

  private resetIdentityIfAccountChanged(accountType: TeamsAccountType): void {
    if (this.lastAccountType === accountType) return
    this.tenantId = undefined
    this.userId = undefined
    this.lastAccountType = accountType
  }

  private async ensureIdentity(): Promise<void> {
    if (this.tenantId && this.userId) return
    await this.getSubstrateToken()
  }
}

function tokenUrlForAccount(accountType: TeamsAccountType): string {
  return accountType === 'personal' ? consumerTokenUrl() : organizationsTokenUrl()
}

function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1]
  if (!payload) {
    throw new TeamsError('Microsoft token response was not a JWT.', 'aad_token_invalid')
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
  return {
    ...decoded,
    aud: typeof decoded.aud === 'string' ? decoded.aud : undefined,
    tid: typeof decoded.tid === 'string' ? decoded.tid : undefined,
    oid: typeof decoded.oid === 'string' ? decoded.oid : undefined,
    exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
  }
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

function describeAadError(body: Record<string, unknown>, status: number): string {
  const desc = body.error_description ?? body.error
  return typeof desc === 'string' ? desc.split('\n')[0] : `HTTP ${status}`
}
