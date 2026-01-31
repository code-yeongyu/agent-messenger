import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordMention } from '../types'

async function listAction(options: {
  limit?: number
  guild?: string
  pretty?: boolean
}): Promise<void> {
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
    const mentions = await client.getMentions({
      limit: options.limit,
      guildId: options.guild,
    })

    const output = mentions.map((mention: DiscordMention) => ({
      id: mention.id,
      channel_id: mention.channel_id,
      guild_id: mention.guild_id || null,
      author: {
        id: mention.author.id,
        username: mention.author.username,
        global_name: mention.author.global_name,
      },
      content: mention.content,
      timestamp: mention.timestamp,
      mention_everyone: mention.mention_everyone,
      mentions: mention.mentions.map((user) => ({
        id: user.id,
        username: user.username,
      })),
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const mentionCommand = new Command('mention').description('Mention commands').addCommand(
  new Command('list')
    .description('List recent mentions')
    .option('--limit <n>', 'Number of mentions to retrieve', '50')
    .option('--guild <id>', 'Filter by guild ID')
    .option('--pretty', 'Pretty print JSON output')
    .action((options: any) => {
      listAction({
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        guild: options.guild,
        pretty: options.pretty,
      })
    })
)
