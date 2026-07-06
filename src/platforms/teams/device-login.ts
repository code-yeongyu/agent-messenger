import { getTeamsAppClientId } from './app-config'
import { TeamsClient } from './client'
import { TeamsCredentialManager } from './credential-manager'
import {
  type AadToken,
  type DeviceCodeInfo,
  decodeJwtTid,
  exchangeDeviceCode,
  exchangeForSkypeScope,
  isConsumerTenant,
  mintSkypeToken,
  pollDeviceToken,
  requestDeviceCode,
  resolveWorkTenantId,
} from './device-code'
import { type TeamsAccountType, TeamsError } from './types'

const PERSONAL_ACCOUNT_HINT =
  'This looks like a personal Microsoft account. Run `agent-teams auth login --account-type personal` to sign in.'

export interface DeviceCodePrompt {
  verificationUri: string
  verificationUriComplete: string
  userCode: string
  expiresAt: number
}

export interface DeviceLoginResult {
  accountType: TeamsAccountType
  userName: string
  teams: Array<{ id: string; name: string }>
  current: string | null
}

interface LoginCallbacks {
  onCode: (prompt: DeviceCodePrompt) => void | Promise<void>
  onPending?: () => void
  debug?: (message: string) => void
  clientId?: string
  accountType?: TeamsAccountType
}

export async function startDeviceCode(
  clientIdOverride?: string,
  accountType: TeamsAccountType = 'personal',
): Promise<{ info: DeviceCodeInfo; clientId: string }> {
  const clientId = clientIdOverride ?? getTeamsAppClientId(accountType).clientId
  const info = await requestDeviceCode(clientId, accountType)
  return { info, clientId }
}

export async function completeDeviceCode(
  deviceCode: string,
  clientId: string,
  credManager: TeamsCredentialManager = new TeamsCredentialManager(),
  accountType: TeamsAccountType = 'personal',
): Promise<DeviceLoginResult> {
  const first = await exchangeDeviceCode(deviceCode, clientId, accountType)
  if (first.status === 'pending' || first.status === 'slow_down') {
    throw new PendingApprovalError()
  }
  if (first.status !== 'success') {
    throw new Error(
      first.status === 'expired'
        ? 'Device code expired.'
        : first.status === 'declined'
          ? 'Authorization declined.'
          : `Login failed: ${first.message}`,
    )
  }
  return finalize(first.token, clientId, accountType, credManager)
}

export async function loginWithDeviceCode(
  callbacks: LoginCallbacks,
  credManager: TeamsCredentialManager = new TeamsCredentialManager(),
): Promise<DeviceLoginResult> {
  const accountType = callbacks.accountType ?? 'personal'
  const { info, clientId } = await startDeviceCode(callbacks.clientId, accountType)
  await callbacks.onCode({
    verificationUri: info.verificationUri,
    verificationUriComplete: info.verificationUriComplete,
    userCode: info.userCode,
    expiresAt: Date.now() + info.expiresIn * 1000,
  })

  const aad = await pollDeviceToken(info.deviceCode, info.interval, info.expiresIn, clientId, accountType)

  // A work login can resolve to a personal (MSA) account, whose token carries a
  // consumer tenant. Such accounts have no org tenant and can't be finished on
  // the work flow, so stop with an actionable hint rather than fail obscurely.
  if (accountType === 'work' && isPersonalAccount(aad)) {
    throw new TeamsError(PERSONAL_ACCOUNT_HINT, 'teams_personal_account_on_work_login')
  }

  callbacks.onPending?.()
  return finalize(aad, clientId, accountType, credManager, callbacks.debug)
}

function isPersonalAccount(aad: AadToken): boolean {
  const tid = decodeJwtTid(aad.accessToken)
  return tid !== undefined && isConsumerTenant(tid)
}

async function finalize(
  initialAad: AadToken,
  clientId: string,
  accountType: TeamsAccountType,
  credManager: TeamsCredentialManager,
  debug?: (message: string) => void,
): Promise<DeviceLoginResult> {
  if (!initialAad.refreshToken) {
    throw new Error(
      'Sign-in did not return a refresh token (needed to mint the Teams token). Retry `auth login`, or use `auth extract` if this persists.',
    )
  }

  let tenantId: string | undefined
  if (accountType === 'work') {
    debug?.('Resolving Teams tenant...')
    tenantId = await resolveWorkTenantId(initialAad.accessToken)
  }

  debug?.('Exchanging token for skype audience...')
  const skypeScoped = await exchangeForSkypeScope(initialAad.refreshToken, clientId, accountType, tenantId)

  debug?.('Minting skype token...')
  const minted = await mintSkypeToken(skypeScoped.accessToken, accountType)

  const client = await new TeamsClient().login({ token: minted.skypeToken, accountType })
  const authInfo = await client.testAuth()
  const teams = await client.listTeams()

  const teamMap: Record<string, { team_id: string; team_name: string }> = {}
  for (const team of teams) {
    teamMap[team.id] = { team_id: team.id, team_name: team.name }
  }
  const currentTeam = teams[0]?.id ?? null

  await credManager.setDeviceCodeAccount({
    accountType,
    token: minted.skypeToken,
    tokenExpiresAt: minted.skypeTokenExpiresAt,
    aadRefreshToken: skypeScoped.refreshToken,
    aadClientId: clientId,
    aadTenantId: tenantId,
    region: minted.region ?? (accountType === 'work' ? client.getRegion() : undefined),
    userName: authInfo.displayName,
    teams: teamMap,
    currentTeam,
    authMethod: 'device-code',
  })

  return {
    accountType,
    userName: authInfo.displayName,
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    current: currentTeam,
  }
}

export async function refreshDeviceCodeAccount(
  accountType: TeamsAccountType,
  credManager: TeamsCredentialManager = new TeamsCredentialManager(),
  debug?: (message: string) => void,
): Promise<boolean> {
  const config = await credManager.loadConfig()
  const account = config?.accounts[accountType]
  if (!account || account.auth_method !== 'device-code' || !account.aad_refresh_token) {
    return false
  }
  const clientId = account.aad_client_id ?? getTeamsAppClientId(accountType).clientId

  try {
    debug?.('Silently refreshing skype token...')
    const tenantId = accountType === 'work' ? account.aad_tenant_id : undefined
    const skypeScoped = await exchangeForSkypeScope(account.aad_refresh_token, clientId, accountType, tenantId)
    const minted = await mintSkypeToken(skypeScoped.accessToken, accountType)

    await credManager.setDeviceCodeAccount({
      accountType,
      token: minted.skypeToken,
      tokenExpiresAt: minted.skypeTokenExpiresAt,
      aadRefreshToken: skypeScoped.refreshToken,
      aadClientId: clientId,
      aadTenantId: tenantId,
      region: minted.region ?? account.region,
      userName: account.user_name,
      teams: account.teams,
      currentTeam: account.current_team,
      authMethod: 'device-code',
      makeCurrent: false,
    })
    return true
  } catch (error) {
    debug?.(`Silent refresh failed: ${(error as Error).message}`)
    return false
  }
}

export class PendingApprovalError extends Error {
  constructor() {
    super('Authorization pending. Approve in the browser, then retry.')
    this.name = 'PendingApprovalError'
  }
}
