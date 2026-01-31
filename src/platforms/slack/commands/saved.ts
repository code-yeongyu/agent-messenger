import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackSavedItem } from '../types'

async function listAction(options: { limit?: number; pretty?: boolean }): Promise<void> {
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
    const response = await client.getSavedItems({
      limit: options.limit,
    })

    const output = {
      saved_items: response.saved_items.map((item: SlackSavedItem) => ({
        item_id: item.item_id,
        item_type: item.item_type,
        ts: item.ts,
        state: item.state,
        date_created: item.date_created,
        is_archived: item.is_archived,
      })),
      counts: response.counts,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const savedCommand = new Command('saved').description('Saved items commands').addCommand(
  new Command('list')
    .description('List saved items (Later)')
    .option('--limit <n>', 'Number of items to retrieve', '25')
    .option('--pretty', 'Pretty print JSON output')
    .action((options: any) => {
      listAction({
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        pretty: options.pretty,
      })
    })
)
