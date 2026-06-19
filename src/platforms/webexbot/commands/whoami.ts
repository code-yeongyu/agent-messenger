import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { BotOption } from './shared'
import { getClient } from './shared'

interface WhoamiResult {
  id?: string
  emails?: string[]
  displayName?: string
  avatar?: string
  orgId?: string
  type?: 'person' | 'bot'
  created?: string
  error?: string
}

export async function whoamiAction(options: BotOption): Promise<WhoamiResult> {
  try {
    const client = await getClient(options)
    const info = await client.testAuth()
    return {
      id: info.id,
      emails: info.emails,
      displayName: info.displayName,
      avatar: info.avatar,
      orgId: info.orgId,
      type: info.type,
      created: info.created,
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
