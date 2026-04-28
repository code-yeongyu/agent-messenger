import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveSlackChannelTarget } from '@/policy/platform-mappers/slack'
import type { PolicyTarget } from '@/policy/types'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackSavedItem } from '../types'

type LoadedPolicyEngine = Awaited<ReturnType<typeof getPolicyEngine>>

async function filterSavedItemsByReadPolicy(
  client: SlackClient,
  engine: LoadedPolicyEngine,
  items: SlackSavedItem[],
): Promise<SlackSavedItem[]> {
  const targetByChannel = new Map<string, PolicyTarget>()
  const visibleItems: SlackSavedItem[] = []

  for (const item of items) {
    const channel = item.channel.id
    if (!channel) {
      visibleItems.push(item)
      continue
    }

    let target = targetByChannel.get(channel)
    if (!target) {
      target = await resolveSlackChannelTarget(client, engine, channel, 'read')
      targetByChannel.set(channel, target)
    }

    if (!engine.isDenied('slack', 'read', target)) {
      visibleItems.push(item)
    }
  }

  return visibleItems
}

async function listAction(options: { limit?: number; cursor?: string; pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const result = await client.getSavedItems(options.cursor)
    const engine = await getPolicyEngine()

    let items = await filterSavedItemsByReadPolicy(client, engine, result.items)

    if (options.limit) {
      items = items.slice(0, options.limit)
    }

    const output = {
      items: items.map((item) => ({
        type: item.type,
        message: {
          ts: item.message.ts,
          text: item.message.text,
          user: item.message.user,
          username: item.message.username,
          thread_ts: item.message.thread_ts,
        },
        channel: item.channel,
        date_created: item.date_created,
      })),
      has_more: result.has_more,
      next_cursor: result.next_cursor,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const savedCommand = new Command('saved').description('Saved items commands').addCommand(
  new Command('list')
    .description('List saved items')
    .option('--limit <n>', 'Number of items to display')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--pretty', 'Pretty print JSON output')
    .action((options) => {
      listAction({
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        cursor: options.cursor,
        pretty: options.pretty,
      })
    }),
)
