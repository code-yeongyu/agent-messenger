import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

export async function createAction(
  channelId: string,
  name: string,
  options: { autoArchive?: string; rateLimit?: string; pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const thread = await client.createThread(channelId, name, {
      autoArchiveDuration: options.autoArchive ? parseInt(options.autoArchive, 10) : undefined,
      rateLimitPerUser: options.rateLimit ? parseInt(options.rateLimit, 10) : undefined,
    })

    const output = {
      id: thread.id,
      name: thread.name,
      type: thread.type,
      guild_id: thread.guild_id,
      parent_id: thread.parent_id || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function archiveAction(
  threadId: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const thread = await client.archiveThread(threadId, true)

    const output = {
      id: thread.id,
      archived: true,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const threadCommand = new Command('thread')
  .description('Thread commands')
  .addCommand(
    new Command('create')
      .description('Create a thread in a channel')
      .argument('<channel-id>', 'Channel ID')
      .argument('<name>', 'Thread name')
      .option('--auto-archive <minutes>', 'Auto archive duration in minutes')
      .option('--rate-limit <seconds>', 'Slowmode in seconds')
      .option('--pretty', 'Pretty print JSON output')
      .action(createAction)
  )
  .addCommand(
    new Command('archive')
      .description('Archive a thread')
      .argument('<thread-id>', 'Thread ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(archiveAction)
  )
