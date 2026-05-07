import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { BotOption } from './shared'
import { getClient } from './shared'

interface WhoamiResult {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
  is_bot?: boolean
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
  error?: string
}

export async function whoamiAction(options: BotOption): Promise<WhoamiResult> {
  try {
    const client = await getClient(options)
    const me = await client.getMe()
    return {
      id: me.id,
      username: me.username,
      first_name: me.first_name,
      last_name: me.last_name,
      is_bot: me.is_bot,
      can_join_groups: me.can_join_groups,
      can_read_all_group_messages: me.can_read_all_group_messages,
      supports_inline_queries: me.supports_inline_queries,
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const whoamiCommand = new Command('whoami')
  .description('Show current authenticated bot')
  .option('--bot <id>', 'Bot ID to use')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (opts: BotOption) => {
    cliOutput(await whoamiAction(opts), opts.pretty)
  })
