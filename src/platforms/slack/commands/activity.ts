import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackActivityItem } from '../types'

async function listAction(options: {
  unread?: boolean
  limit?: number
  types?: string
  pretty?: boolean
}): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(
        formatOutput(
          { error: 'No current workspace set. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new SlackClient(workspace.token, workspace.cookie)
    const typesList = options.types ? options.types.split(',') : undefined
    const response = await client.getActivityFeed({
      limit: options.limit,
      unread: options.unread,
      types: typesList,
    })

    const output = {
      items: response.items.map((item: SlackActivityItem) => ({
        is_unread: item.is_unread,
        feed_ts: item.feed_ts,
        type: item.item.type,
        channel: item.item.message.channel,
        ts: item.item.message.ts,
        thread_ts: item.item.message.thread_ts,
        author_user_id: item.item.message.author_user_id,
        key: item.key,
      })),
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const activityCommand = new Command('activity')
  .description('Activity feed commands')
  .addCommand(
    new Command('list')
      .description('List activity feed (mentions, reactions, thread replies)')
      .option('--unread', 'Show only unread items')
      .option('--limit <n>', 'Number of items to retrieve', '25')
      .option(
        '--types <types>',
        'Filter by types (comma-separated: thread_reply,message_reaction,at_user,at_channel,keyword)'
      )
      .option('--pretty', 'Pretty print JSON output')
      .action((options: any) => {
        listAction({
          unread: options.unread,
          limit: options.limit ? parseInt(options.limit, 10) : undefined,
          types: options.types,
          pretty: options.pretty,
        })
      })
  )
