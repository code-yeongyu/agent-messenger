import { getTeamsAppClientId } from './app-config'
import { TeamsClient } from './client'
import { TeamsCredentialManager } from './credential-manager'
import {
  type DeviceCodeInfo,
  exchangeDeviceCode,
  exchangeForSkypeScope,
  mintConsumerSkypeToken,
  pollDeviceToken,
  requestDeviceCode,
} from './device-code'
import type { TeamsAccountType } from './types'

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
}

export async function startDeviceCode(clientIdOverride?: string): Promise<{ info: DeviceCodeInfo; clientId: string }> {
  const clientId = clientIdOverride ?? getTeamsAppClientId().clientId
  const info = await requestDeviceCode(clientId)
  return { info, clientId }
}

export async function completeDeviceCode(
  deviceCode: string,
  clientId: string,
  credManager: TeamsCredentialManager = new TeamsCredentialManager(),
): Promise<DeviceLoginResult> {
  const first = await exchangeDeviceCode(deviceCode, clientId)
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
  return finalize(first.token.refreshToken, clientId, credManager)
}

export async function loginWithDeviceCode(
  callbacks: LoginCallbacks,
  credManager: TeamsCredentialManager = new TeamsCredentialManager(),
): Promise<DeviceLoginResult> {
  const { info, clientId } = await startDeviceCode(callbacks.clientId)
  await callbacks.onCode({
    verificationUri: info.verificationUri,
    verificationUriComplete: info.verificationUriComplete,
    userCode: info.userCode,
    expiresAt: Date.now() + info.expiresIn * 1000,
  })

  const aad = await pollDeviceToken(info.deviceCode, info.interval, info.expiresIn, clientId)
  callbacks.onPending?.()
  return finalize(aad.refreshToken, clientId, credManager, callbacks.debug)
}

async function finalize(
  initialRefreshToken: string | undefined,
  clientId: string,
  credManager: TeamsCredentialManager,
  debug?: (message: string) => void,
): Promise<DeviceLoginResult> {
  if (!initialRefreshToken) {
    throw new Error(
      'Sign-in did not return a refresh token (needed to mint the Teams token). Retry `auth login`, or use `auth extract` if this persists.',
    )
  }

  debug?.('Exchanging token for skype audience...')
  const skypeScoped = await exchangeForSkypeScope(initialRefreshToken, clientId)

  debug?.('Minting skype token...')
  const minted = await mintConsumerSkypeToken(skypeScoped.accessToken)

  const accountType: TeamsAccountType = 'personal'
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

export class PendingApprovalError extends Error {
  constructor() {
    super('Authorization pending. Approve in the browser, then retry.')
    this.name = 'PendingApprovalError'
  }
}
