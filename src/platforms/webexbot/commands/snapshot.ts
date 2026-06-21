import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import { toRef } from '../../webex/id-normalizer'
import type { BotOption } from './shared'
import { getClient } from './shared'

interface SnapshotResult {
  bot?: {
    id: string
    ref: string
    displayName: string
    emails: string[]
  }
  spaces?: Array<{
    id: string
    ref: string
    title: string
    type?: 'group' | 'direct'
    lastActivity?: string
  }>
  hint?: string
  error?: string
}

export async function snapshotAction(options: BotOption & { full?: boolean; max?: string }): Promise<SnapshotResult> {
  try {
    const client = await getClient(options)
    const max = options.max ? parseInt(options.max, 10) : 100

    const [me, spaces] = await Promise.all([client.testAuth(), client.listSpaces({ max })])

    const result: SnapshotResult = {
      bot: {
        id: me.id,
        ref: toRef(me.id),
        displayName: me.displayName,
        emails: me.emails,
      },
      spaces: options.full
        ? spaces.map((s) => ({
            id: s.id,
            ref: toRef(s.id),
            title: s.title,
            type: s.type,
            lastActivity: s.lastActivity,
          }))
        : spaces.map((s) => ({ id: s.id, ref: toRef(s.id), title: s.title })),
    }

    if (!options.full) {
      result.hint = "Use 'message list <space>' for messages, 'space info <space>' for details."
    }

    return result
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const snapshotCommand = new Command('snapshot')
  .description('Workspace overview for AI agents (brief by default, --full for details)')
  .option('--full', 'Include full space details')
  .option('--max <n>', 'Number of spaces to retrieve', '100')
  .option('--bot <id>', 'Use specific bot')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (opts: BotOption & { full?: boolean; max?: string }) => {
    cliOutput(await snapshotAction(opts), opts.pretty)
  })
