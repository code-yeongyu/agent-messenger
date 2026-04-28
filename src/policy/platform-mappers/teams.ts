import type { PolicyEngine } from '@/policy/engine'
import type { Direction, PolicyTarget } from '@/policy/types'
import type { TeamsClient } from '@/platforms/teams/client'
import type { TeamsChannel } from '@/platforms/teams/types'

// Teams currently models only TeamsChannel. Every Teams channel therefore normalizes to
// channelType: 'channel'; Teams DMs are out of scope for access-control v1.
export function teamsChannelToTarget(channel: TeamsChannel): PolicyTarget {
  return {
    kind: 'channel',
    id: channel.id,
    channelType: 'channel',
  }
}

export function shouldResolveChannelForPolicy(engine: PolicyEngine, direction: Direction): boolean {
  return engine.hasRule('teams', direction, 'channelTypes') || engine.hasRule('teams', direction, 'userIds')
}

export async function resolveTeamsChannelTarget(
  client: TeamsClient,
  engine: PolicyEngine,
  channelId: string,
  direction: Direction,
  teamId?: string,
): Promise<PolicyTarget> {
  if (!shouldResolveChannelForPolicy(engine, direction)) {
    return { kind: 'channel', id: channelId }
  }

  if (teamId === undefined) {
    throw new Error('Teams channel policy resolution requires teamId')
  }

  const channel = await client.getChannel(teamId, channelId)
  return teamsChannelToTarget(channel)
}
