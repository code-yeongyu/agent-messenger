import type { PolicyEngine } from '@/policy/engine'
import type { ChannelType, Direction, PolicyTarget } from '@/policy/types'
import type { SlackClient } from '@/platforms/slack/client'
import type { SlackChannel, SlackDM, SlackSearchResult } from '@/platforms/slack/types'

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

export function slackSearchResultToTarget(result: SlackSearchResult): PolicyTarget {
  const channelType = getSlackSearchResultChannelType(result)

  return {
    kind: 'channel',
    id: result.channel.id,
    ...(channelType !== undefined && { channelType }),
  }
}

function getSlackSearchResultChannelType(result: SlackSearchResult): ChannelType | undefined {
  if (result.channel.is_im === true) {
    return 'dm'
  }

  if (result.channel.is_mpim === true) {
    return 'mpim'
  }

  if (result.channel.is_private === true) {
    return 'private'
  }

  if (result.channel.is_channel === true) {
    return 'public'
  }

  return undefined
}

export function shouldResolveChannelForPolicy(engine: PolicyEngine, direction: Direction): boolean {
  return engine.hasRule('slack', direction, 'channelTypes') || engine.hasRule('slack', direction, 'userIds')
}

export async function resolveSlackChannelTarget(
  client: SlackClient,
  engine: PolicyEngine,
  channelId: string,
  direction: Direction,
): Promise<PolicyTarget> {
  // D-prefix shortcut only safe when no userId rules apply — otherwise we'd miss DM-to-denied-user blocks.
  if (channelId.startsWith('D') && !engine.hasRule('slack', direction, 'userIds')) {
    return { kind: 'channel', id: channelId, channelType: 'dm' }
  }

  if (!shouldResolveChannelForPolicy(engine, direction)) {
    return { kind: 'channel', id: channelId }
  }

  const channelInfo = await client.getChannel(channelId)
  return slackChannelToTarget(channelInfo)
}
