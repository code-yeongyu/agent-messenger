import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { BotOption } from './shared'
import { getClient } from './shared'

interface SpaceResult {
  id?: string
  title?: string
  type?: 'group' | 'direct'
  isLocked?: boolean
  teamId?: string | null
  lastActivity?: string
  created?: string
  creatorId?: string
  spaces?: Array<{
    id: string
    title: string
    type: 'group' | 'direct'
    lastActivity: string
    created: string
  }>
  error?: string
}

export async function listAction(options: BotOption & { max?: string; type?: string }): Promise<SpaceResult> {
  try {
    const client = await getClient(options)
    const max = options.max ? parseInt(options.max, 10) : 50
    const spaces = await client.listSpaces({ type: options.type, max })

    return {
      spaces: spaces.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        lastActivity: s.lastActivity,
        created: s.created,
      })),
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function infoAction(spaceId: string, options: BotOption): Promise<SpaceResult> {
  try {
    const client = await getClient(options)
    const space = await client.getSpace(spaceId)
    return {
      id: space.id,
      title: space.title,
      type: space.type,
      isLocked: space.isLocked,
      teamId: space.teamId || null,
      lastActivity: space.lastActivity,
      created: space.created,
      creatorId: space.creatorId,
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const spaceCommand = new Command('space')
  .description('Space commands')
  .addCommand(
    new Command('list')
      .description('List spaces')
      .option('--max <n>', 'Number of spaces to retrieve', '50')
      .option('--type <type>', 'Filter by type (group or direct)')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: BotOption & { max?: string; type?: string }) => {
        cliOutput(await listAction(opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('info')
      .description('Get space details')
      .argument('<id>', 'Space ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (spaceId: string, opts: BotOption) => {
        cliOutput(await infoAction(spaceId, opts), opts.pretty)
      }),
  )
