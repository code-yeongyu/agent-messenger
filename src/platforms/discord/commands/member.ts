import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

async function searchAction(
  guildId: string,
  query: string,
  options: { limit?: string; pretty?: boolean }
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
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const members = await client.searchMembers(guildId, query, limit)

    const output = {
      members: members.map((m) => ({
        user_id: m.user.id,
        username: m.user.username,
        global_name: m.user.global_name,
        nick: m.nick,
        joined_at: m.joined_at,
        roles: m.roles,
      })),
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const memberCommand = new Command('member')
  .description('Guild member commands')
  .addCommand(
    new Command('search')
      .description('Search members in a guild')
      .argument('<guild_id>', 'Guild ID')
      .argument('<query>', 'Search query')
      .option('--limit <n>', 'Maximum number of results', '10')
      .option('--pretty', 'Pretty print JSON output')
      .action(searchAction)
  )
