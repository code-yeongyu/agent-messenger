import type { DiscordClient } from '@/platforms/discord/client'
import type { DiscordChannel, DiscordDMChannel } from '@/platforms/discord/types'
import type { PolicyEngine } from '@/policy/engine'
import type { Direction, PolicyTarget } from '@/policy/types'

export function discordChannelToTarget(channel: DiscordChannel | DiscordDMChannel): PolicyTarget {
  if ('recipients' in channel) {
    const userId = channel.type === 1 ? channel.recipients[0]?.id : undefined

    return {
      kind: 'channel',
      id: channel.id,
      channelType: channel.type === 3 ? 'mpim' : 'dm',
      ...(userId !== undefined && { userId }),
    }
  }

  return {
    kind: 'channel',
    id: channel.id,
    channelType: 'channel',
  }
}

export function shouldResolveChannelForPolicy(engine: PolicyEngine, direction: Direction): boolean {
  return engine.hasRule('discord', direction, 'channelTypes') || engine.hasRule('discord', direction, 'userIds')
}

export async function resolveDiscordChannelTarget(
  client: DiscordClient,
  engine: PolicyEngine,
  channelId: string,
  direction: Direction,
): Promise<PolicyTarget> {
  if (!shouldResolveChannelForPolicy(engine, direction)) {
    return { kind: 'channel', id: channelId }
  }

  // Discord GET /channels/{id} returns both guild channels and DM channels.
  // The client is typed as DiscordChannel, so discordChannelToTarget uses a runtime discriminator for DM-shaped payloads.
  const channelInfo = await client.getChannel(channelId)
  return discordChannelToTarget(channelInfo)
}
