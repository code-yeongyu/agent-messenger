import {
  authzUrl,
  CONSUMER_TENANT_ID,
  deviceCodeSkypeScope,
  deviceCodeTeamsScope,
  deviceCodeTokenUrl,
  deviceCodeUrl,
  MICROSOFT_SERVICES_TENANT_ID,
  TEAMS_TENANTS_URL,
  WORK_TENANT_ID,
} from './app-config'
import type { TeamsAccountType, TeamsRegion } from './types'
import { TeamsError } from './types'

const DEFAULT_SKYPE_TOKEN_TTL_SEC = 21600

export interface TeamsTenant {
  tenantId: string
  tenantName?: string
  isInvitationRedeemed?: boolean
}

export interface DeviceCodeInfo {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresIn: number
  interval: number
}

export interface AadToken {
  accessToken: string
  refreshToken?: string
}

export interface MintedSkypeToken {
  skypeToken: string
  skypeTokenExpiresAt: string
  region?: TeamsRegion
}

export type DeviceTokenResult =
  | { status: 'success'; token: AadToken }
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'expired' }
  | { status: 'declined' }
  | { status: 'error'; message: string }

async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, body }
}

export async function requestDeviceCode(
  clientId: string,
  accountType: TeamsAccountType = 'personal',
): Promise<DeviceCodeInfo> {
  const { status, body } = await postForm(deviceCodeUrl(accountType), {
    client_id: clientId,
    scope: deviceCodeTeamsScope(accountType),
  })
  if (status !== 200) {
    throw new TeamsError(`Device code request failed: ${describeAadError(body, status)}`, 'device_code_failed')
  }
  const userCode = String(body.user_code ?? '')
  const verificationUri = String(body.verification_uri ?? 'https://microsoft.com/devicelogin')
  return {
    deviceCode: String(body.device_code ?? ''),
    userCode,
    verificationUri,
    verificationUriComplete: `${verificationUri}?otc=${encodeURIComponent(userCode)}`,
    expiresIn: Number(body.expires_in ?? 900),
    interval: Number(body.interval ?? 5),
  }
}

export async function exchangeDeviceCode(
  deviceCode: string,
  clientId: string,
  accountType: TeamsAccountType = 'personal',
): Promise<DeviceTokenResult> {
  const { status, body } = await postForm(deviceCodeTokenUrl(accountType), {
    client_id: clientId,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode,
  })
  if (status === 200) {
    return {
      status: 'success',
      token: { accessToken: String(body.access_token), refreshToken: body.refresh_token as string | undefined },
    }
  }
  const error = String(body.error ?? '')
  if (error === 'authorization_pending') return { status: 'pending' }
  if (error === 'slow_down') return { status: 'slow_down' }
  if (error === 'expired_token') return { status: 'expired' }
  if (error === 'authorization_declined') return { status: 'declined' }
  return { status: 'error', message: describeAadError(body, status) }
}

export async function pollDeviceToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  clientId: string,
  accountType: TeamsAccountType = 'personal',
): Promise<AadToken> {
  const deadline = Date.now() + expiresIn * 1000
  let waitMs = Math.max(interval, 1) * 1000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    const result = await exchangeDeviceCode(deviceCode, clientId, accountType)
    if (result.status === 'success') return result.token
    if (result.status === 'slow_down') {
      waitMs += 5000
      continue
    }
    if (result.status === 'pending') continue
    if (result.status === 'expired') throw new TeamsError('Device code expired before approval.', 'device_code_expired')
    if (result.status === 'declined') throw new TeamsError('Authorization was declined.', 'device_code_declined')
    throw new TeamsError(`Device authorization failed: ${result.message}`, 'device_code_failed')
  }
  throw new TeamsError('Device code expired before approval.', 'device_code_expired')
}

export async function exchangeForSkypeScope(
  refreshToken: string,
  clientId: string,
  accountType: TeamsAccountType = 'personal',
  tenantId?: string,
): Promise<AadToken> {
  const { status, body } = await postForm(deviceCodeTokenUrl(accountType, tenantId), {
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: deviceCodeSkypeScope(accountType),
  })
  if (status !== 200) {
    throw new TeamsError(`Token exchange failed: ${describeAadError(body, status)}`, 'token_exchange_failed')
  }
  return {
    accessToken: String(body.access_token),
    refreshToken: (body.refresh_token as string | undefined) ?? refreshToken,
  }
}

// Work logins go through the `organizations` authority, so the token's `tid` is
// a placeholder, not a real tenant GUID. The skype authz endpoint then rejects
// it with `GuestUserNotRedeemed`. Resolving the concrete tenant lets the
// skype-scope exchange target the tenant-specific authority and succeed.
export async function resolveWorkTenantId(accessToken: string): Promise<string> {
  const claimTid = decodeJwtTid(accessToken)
  if (claimTid && !isPlaceholderTenant(claimTid)) return claimTid

  const tenants = await fetchTenants(accessToken)
  const redeemed = tenants.find((tenant) => tenant.isInvitationRedeemed !== false) ?? tenants[0]
  if (!redeemed) {
    throw new TeamsError('No Microsoft Teams tenant is associated with this account.', 'teams_tenant_missing')
  }
  if (redeemed.isInvitationRedeemed === false) {
    throw new TeamsError(
      'This Microsoft Teams guest invitation has not been accepted yet. Accept the invite in Teams, then run `agent-teams auth login` again.',
      'teams_invitation_not_redeemed',
    )
  }
  return redeemed.tenantId
}

async function fetchTenants(accessToken: string): Promise<TeamsTenant[]> {
  const res = await fetch(TEAMS_TENANTS_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    throw new TeamsError(`Tenant discovery failed: HTTP ${res.status}`, 'tenant_discovery_failed')
  }
  const body = (await res.json().catch(() => [])) as unknown
  const rows = Array.isArray(body) ? body : []
  return rows
    .map((row): TeamsTenant | null => {
      if (typeof row !== 'object' || row === null) return null
      const record = row as Record<string, unknown>
      const tenantId = record.tenantId
      if (typeof tenantId !== 'string' || !tenantId) return null
      return {
        tenantId,
        tenantName: typeof record.tenantName === 'string' ? record.tenantName : undefined,
        isInvitationRedeemed:
          typeof record.isInvitationRedeemed === 'boolean' ? record.isInvitationRedeemed : undefined,
      }
    })
    .filter((tenant): tenant is TeamsTenant => tenant !== null)
}

function decodeJwtTid(token: string): string | undefined {
  const payload = token.split('.')[1]
  if (!payload) return undefined
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { tid?: unknown }
    return typeof claims.tid === 'string' ? claims.tid : undefined
  } catch {
    return undefined
  }
}

function isPlaceholderTenant(tenantId: string): boolean {
  return tenantId === WORK_TENANT_ID || tenantId === CONSUMER_TENANT_ID || tenantId === MICROSOFT_SERVICES_TENANT_ID
}

export async function mintSkypeToken(
  spacesAccessToken: string,
  accountType: TeamsAccountType = 'personal',
): Promise<MintedSkypeToken> {
  const res = await fetch(authzUrl(accountType), {
    method: 'POST',
    headers: { Authorization: `Bearer ${spacesAccessToken}`, Accept: 'application/json; ver=1.0' },
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new TeamsError(`Failed to mint skype token: ${describeAuthzError(body, res.status)}`, 'skype_token_failed')
  }
  const nested = body.skypeToken as { skypetoken?: string; skypeTokenExpiresIn?: number } | undefined
  const flat = body.tokens as { skypeToken?: string; expiresIn?: number } | undefined
  const skypeToken = nested?.skypetoken ?? flat?.skypeToken
  if (!skypeToken) {
    throw new TeamsError('Consumer authz response did not contain a skype token.', 'skype_token_missing')
  }
  const ttlSec = nested?.skypeTokenExpiresIn ?? flat?.expiresIn ?? DEFAULT_SKYPE_TOKEN_TTL_SEC
  return {
    skypeToken,
    skypeTokenExpiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
    region: parseRegion(body),
  }
}

export async function mintConsumerSkypeToken(spacesAccessToken: string): Promise<MintedSkypeToken> {
  return mintSkypeToken(spacesAccessToken, 'personal')
}

function describeAadError(body: Record<string, unknown>, status: number): string {
  const desc = body.error_description ?? body.error
  return typeof desc === 'string' ? desc.split('\n')[0] : `HTTP ${status}`
}

function describeAuthzError(body: Record<string, unknown>, status: number): string {
  const statusObj = body.status as { text?: string } | undefined
  const code = String(body.errorCode ?? body.message ?? statusObj?.text ?? `HTTP ${status}`)
  if (code === 'GuestUserNotRedeemed') {
    return `${code} (the account has no redeemed Teams tenant — if this is a personal account, run \`agent-teams auth login --account-type personal\`; if you are a guest, accept the Teams invite first)`
  }
  return code
}

function parseRegion(body: Record<string, unknown>): TeamsRegion | undefined {
  const regionGtms = body.regionGtms as { region?: string; middleTier?: string; mt?: string } | undefined
  const raw = regionGtms?.region ?? regionGtms?.middleTier ?? regionGtms?.mt
  if (raw === 'amer' || raw === 'emea' || raw === 'apac') return raw
  return undefined
}
