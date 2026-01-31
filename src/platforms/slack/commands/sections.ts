import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'

async function listAction(options: { pretty?: boolean }): Promise<void> {
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
    const response = await client.getChannelSections()

    const output = {
      channel_sections: response.channel_sections.map((s) => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        is_expanded: s.is_expanded,
        position: s.position,
        channels: s.channels,
      })),
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const sectionsCommand = new Command('sections')
  .description('Channel sections (sidebar folders) commands')
  .addCommand(
    new Command('list')
      .description('List channel sections')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction)
  )
