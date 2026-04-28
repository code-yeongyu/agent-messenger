import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveSlackChannelTarget } from '@/policy/platform-mappers/slack'
import type { PolicyTarget } from '@/policy/types'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackActivityItem } from '../types'

type LoadedPolicyEngine = Awaited<ReturnType<typeof getPolicyEngine>>

async function filterActivityItemsByReadPolicy(
  client: SlackClient,
  engine: LoadedPolicyEngine,
  items: SlackActivityItem[],
): Promise<SlackActivityItem[]> {
  const targetByChannel = new Map<string, PolicyTarget>()
  const visibleItems: SlackActivityItem[] = []

  for (const item of items) {
    if (!item.channel) {
      visibleItems.push(item)
      continue
    }

    let target = targetByChannel.get(item.channel)
    if (!target) {
      target = await resolveSlackChannelTarget(client, engine, item.channel, 'read')
      targetByChannel.set(item.channel, target)
    }

    if (!engine.isDenied('slack', 'read', target)) {
      visibleItems.push(item)
    }
  }

  return visibleItems
}

async function listAction(options: {
  pretty?: boolean
  unread?: boolean
  limit?: string
  types?: string
}): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const ws = await credManager.getWorkspace()

    if (!ws) {
      console.log(formatOutput({ error: 'No workspace configured. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: ws.token, cookie: ws.cookie })

    const mode = options.unread ? 'priority_unreads_v1' : 'chrono_reads_and_unreads'
    const limit = options.limit ? parseInt(options.limit, 10) : 20

    const items = await client.getActivityFeed({
      types: options.types,
      mode,
      limit,
    })
    const engine = await getPolicyEngine()
    const visibleItems = await filterActivityItemsByReadPolicy(client, engine, items)

    console.log(
      formatOutput(
        {
          items: visibleItems,
          count: visibleItems.length,
        },
        options.pretty,
      ),
    )
  } catch (error) {
    handleError(error as Error)
  }
}

export const activityCommand = new Command('activity')
  .description('Activity feed commands')
  .addCommand(
    new Command('list')
      .description('List activity feed items')
      .option('--pretty', 'Pretty print JSON output')
      .option('--unread', 'Show only unread activity')
      .option('--limit <number>', 'Number of items to return (default: 20)')
      .option(
        '--types <types>',
        'Filter by activity types (comma-separated: thread_reply,message_reaction,at_user,at_channel,keyword)',
      )
      .action(listAction),
  )
