import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import { toRef } from '../../webex/id-normalizer'
import type { BotOption } from './shared'
import { getClient } from './shared'

interface MemberResult {
  members?: Array<{
    id: string
    ref: string
    personId: string
    personRef: string
    personEmail: string
    personDisplayName: string
    isModerator: boolean
    created: string
  }>
  error?: string
}

export async function listAction(space: string, options: BotOption & { max?: string }): Promise<MemberResult> {
  try {
    const client = await getClient(options)
    const max = options.max ? parseInt(options.max, 10) : 100
    const members = await client.listMemberships(space, { max })

    return {
      members: members.map((m) => ({
        id: m.id,
        ref: toRef(m.id),
        personId: m.personId,
        personRef: toRef(m.personId),
        personEmail: m.personEmail,
        personDisplayName: m.personDisplayName,
        isModerator: m.isModerator,
        created: m.created,
      })),
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const memberCommand = new Command('member').description('Member commands').addCommand(
  new Command('list')
    .description('List members of a space')
    .argument('<space>', 'Space ID')
    .option('--max <n>', 'Number of members to retrieve', '100')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(async (space: string, opts: BotOption & { max?: string }) => {
      cliOutput(await listAction(space, opts), opts.pretty)
    }),
)
