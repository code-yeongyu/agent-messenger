import { authzUrl, deviceCodeSkypeScope, deviceCodeTeamsScope, deviceCodeTokenUrl, deviceCodeUrl } from './app-config'
import type { TeamsAccountType, TeamsRegion } from './types'
import { TeamsError } from './types'

const DEFAULT_SKYPE_TOKEN_TTL_SEC = 21600

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
): Promise<AadToken> {
  const { status, body } = await postForm(deviceCodeTokenUrl(accountType), {
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
  return String(body.errorCode ?? body.message ?? statusObj?.text ?? `HTTP ${status}`)
}

function parseRegion(body: Record<string, unknown>): TeamsRegion | undefined {
  const regionGtms = body.regionGtms as { region?: string; middleTier?: string; mt?: string } | undefined
  const raw = regionGtms?.region ?? regionGtms?.middleTier ?? regionGtms?.mt
  if (raw === 'amer' || raw === 'emea' || raw === 'apac') return raw
  return undefined
}
