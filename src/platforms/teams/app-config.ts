import type { TeamsAccountType } from './types'

export const TEAMS_DESKTOP_CLIENT_ID = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
export const TEAMS_WEB_CLIENT_ID = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'

export const CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'
// The Microsoft Services (MSA passthrough) tenant. Consumer/MSA tokens for the
// Skype resource carry this `tid`, so it is a placeholder that still requires
// tenant discovery before the skype-token exchange.
export const MICROSOFT_SERVICES_TENANT_ID = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a'
export const WORK_TENANT_ID = 'organizations'

export const DEVICE_CODE_SCOPE_TEAMS = 'service::api.fl.teams.microsoft.com::MBI_SSL openid profile offline_access'
export const DEVICE_CODE_SCOPE_SKYPE = 'service::api.fl.spaces.skype.com::MBI_SSL openid profile offline_access'
export const WORK_DEVICE_CODE_SCOPE_TEAMS = 'https://api.spaces.skype.com/.default openid profile offline_access'
export const WORK_DEVICE_CODE_SCOPE_SKYPE = 'https://api.spaces.skype.com/.default openid profile offline_access'

export const SUBSTRATE_SEARCH_URL = 'https://substrate.office.com/searchservice/api/v2/query'
export const TEAMS_WEB_ORIGIN = 'https://teams.microsoft.com'
export const AAD_SCOPE_SUBSTRATE = 'https://substrate.office.com/.default offline_access'
export const AAD_SCOPE_GRAPH = 'https://graph.microsoft.com/.default offline_access'
export const AAD_AUDIENCE_SUBSTRATE = 'https://substrate.office.com'
export const AAD_AUDIENCE_GRAPH = 'https://graph.microsoft.com'

export const AUTHZ_CONSUMER_URL = 'https://teams.live.com/api/auth/v1.0/authz/consumer'
export const AUTHZ_WORK_URL = 'https://teams.microsoft.com/api/authsvc/v1.0/authz'

// Control-plane tenant-discovery endpoint. The region segment is not
// authoritative for this call (it lists every tenant the user belongs to
// regardless of home region), so we pin the value fossteams uses.
export const TEAMS_TENANTS_URL = 'https://teams.microsoft.com/api/mt/emea/beta/users/tenants'

export function consumerDeviceCodeUrl(): string {
  return `https://login.microsoftonline.com/${CONSUMER_TENANT_ID}/oauth2/v2.0/devicecode`
}

export function consumerTokenUrl(): string {
  return `https://login.microsoftonline.com/${CONSUMER_TENANT_ID}/oauth2/v2.0/token`
}

export function organizationsDeviceCodeUrl(): string {
  return `https://login.microsoftonline.com/${WORK_TENANT_ID}/oauth2/v2.0/devicecode`
}

export function organizationsTokenUrl(): string {
  return `https://login.microsoftonline.com/${WORK_TENANT_ID}/oauth2/v2.0/token`
}

export function tenantTokenUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
}

export function deviceCodeUrl(accountType: TeamsAccountType): string {
  return accountType === 'personal' ? consumerDeviceCodeUrl() : organizationsDeviceCodeUrl()
}

export function deviceCodeTokenUrl(accountType: TeamsAccountType, tenantId?: string): string {
  if (tenantId) return tenantTokenUrl(tenantId)
  return accountType === 'personal' ? consumerTokenUrl() : organizationsTokenUrl()
}

export function deviceCodeTeamsScope(accountType: TeamsAccountType): string {
  return accountType === 'personal' ? DEVICE_CODE_SCOPE_TEAMS : WORK_DEVICE_CODE_SCOPE_TEAMS
}

export function deviceCodeSkypeScope(accountType: TeamsAccountType): string {
  return accountType === 'personal' ? DEVICE_CODE_SCOPE_SKYPE : WORK_DEVICE_CODE_SCOPE_SKYPE
}

export function authzUrl(accountType: TeamsAccountType): string {
  return accountType === 'personal' ? AUTHZ_CONSUMER_URL : AUTHZ_WORK_URL
}

export interface TeamsAppClient {
  clientId: string
  source: 'env' | 'builtin'
}

function parseTrimmed(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function getTeamsAppClientId(accountType: TeamsAccountType = 'personal'): TeamsAppClient {
  const envClientId = parseTrimmed(process.env.AGENT_TEAMS_CLIENT_ID)
  if (envClientId) {
    return { clientId: envClientId, source: 'env' }
  }
  return { clientId: accountType === 'work' ? TEAMS_DESKTOP_CLIENT_ID : TEAMS_WEB_CLIENT_ID, source: 'builtin' }
}
