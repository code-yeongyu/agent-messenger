export const TEAMS_DESKTOP_CLIENT_ID = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
export const TEAMS_WEB_CLIENT_ID = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'

export const CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'

export const DEVICE_CODE_SCOPE_TEAMS = 'service::api.fl.teams.microsoft.com::MBI_SSL openid profile offline_access'
export const DEVICE_CODE_SCOPE_SKYPE = 'service::api.fl.spaces.skype.com::MBI_SSL openid profile offline_access'

export const AUTHZ_CONSUMER_URL = 'https://teams.live.com/api/auth/v1.0/authz/consumer'
export const AUTHZ_WORK_URL = 'https://teams.microsoft.com/api/authsvc/v1.0/authz'

export function consumerDeviceCodeUrl(): string {
  return `https://login.microsoftonline.com/${CONSUMER_TENANT_ID}/oauth2/v2.0/devicecode`
}

export function consumerTokenUrl(): string {
  return `https://login.microsoftonline.com/${CONSUMER_TENANT_ID}/oauth2/v2.0/token`
}

export interface TeamsAppClient {
  clientId: string
  source: 'env' | 'builtin'
}

function parseTrimmed(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function getTeamsAppClientId(): TeamsAppClient {
  const envClientId = parseTrimmed(process.env.AGENT_TEAMS_CLIENT_ID)
  if (envClientId) {
    return { clientId: envClientId, source: 'env' }
  }
  return { clientId: TEAMS_WEB_CLIENT_ID, source: 'builtin' }
}
