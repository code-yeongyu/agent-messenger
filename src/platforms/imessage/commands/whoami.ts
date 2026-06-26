import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { withImsgClient } from './shared'

async function whoamiAction(options: { account?: string; pretty?: boolean }): Promise<void> {
  try {
    const status = await withImsgClient(options, (client) => client.getStatus())
    console.log(formatOutput(status, options.pretty))
    process.exit(0)
  } catch (error) {
    handleError(error as Error)
  }
}

export const whoamiCommand = new Command('whoami')
  .description('Show the active iMessage account and imsg status')
  .option('--account <id>', 'Use a specific iMessage account')
  .option('--pretty', 'Pretty print JSON output')
  .action(whoamiAction)
