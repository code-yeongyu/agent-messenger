import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'

async function listAction(options: {
  limit?: string
  cursor?: string
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
    const response = await client.getDrafts({
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
      cursor: options.cursor,
    })

    const output = {
      drafts: response.drafts.map((d) => ({
        id: d.id,
        channel_id: d.channel_id,
        text: d.message?.text ?? null,
        date_created: d.date_created,
        date_updated: d.date_updated,
        type: d.type,
      })),
      next_cursor: response.response_metadata?.next_cursor,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const draftsCommand = new Command('drafts').description('Draft message commands').addCommand(
  new Command('list')
    .description('List message drafts')
    .option('--limit <n>', 'Number of drafts to retrieve')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--pretty', 'Pretty print JSON output')
    .action((options: any) => {
      listAction({
        limit: options.limit,
        cursor: options.cursor,
        pretty: options.pretty,
      })
    })
)
