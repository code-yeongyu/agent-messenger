import type { PolicyEngine } from '@/policy/engine'
import type { ChannelType, Direction, PolicyTarget } from '@/policy/types'
import type { SlackClient } from '@/platforms/slack/client'
import type { SlackChannel, SlackDM } from '@/platforms/slack/types'

const CHANNEL_TYPES = ['dm', 'mpim', 'private', 'public', 'channel'] satisfies ChannelType[]

export function slackChannelToTarget(channel: SlackChannel | SlackDM): PolicyTarget {
  if ('user' in channel) {
    return {
      kind: 'channel',
      id: channel.id,
      channelType: channel.is_mpim ? 'mpim' : 'dm',
      userId: channel.user,
    }
  }

  return {
    kind: 'channel',
    id: channel.id,
    channelType: channel.is_private ? 'private' : 'public',
  }
}

export function shouldResolveChannelForPolicy(engine: PolicyEngine, direction: Direction): boolean {
  return CHANNEL_TYPES.some((channelType) =>
    engine.isDenied('slack', direction, { kind: 'channel', id: '', channelType }),
  )
}

export async function resolveSlackChannelTarget(
  client: SlackClient,
  engine: PolicyEngine,
  channelId: string,
  direction: Direction,
): Promise<PolicyTarget> {
  if (channelId.startsWith('D')) {
    return { kind: 'channel', id: channelId, channelType: 'dm' }
  }

  if (!shouldResolveChannelForPolicy(engine, direction)) {
    return { kind: 'channel', id: channelId }
  }

  const channelInfo = await client.getChannel(channelId)
  return slackChannelToTarget(channelInfo)
}
