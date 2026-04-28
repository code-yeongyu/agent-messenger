import { Command } from 'commander'

import { loadPolicy } from '@/policy/loader'
import { PolicyConfigSchema } from '@/policy/types'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

type ShowOptions = {
  pretty?: boolean
}

export async function runShow(options: ShowOptions): Promise<void> {
  try {
    const policy = await loadPolicy()
    const normalizedPolicy = PolicyConfigSchema.parse(policy)
    console.log(formatOutput(normalizedPolicy, options.pretty))
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const showCommand = new Command('show')
  .description('Show normalized access control policy')
  .option('--pretty', 'Pretty print JSON output')
  .action(runShow)
