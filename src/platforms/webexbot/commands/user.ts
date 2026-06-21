import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import { toRef } from '../../webex/id-normalizer'
import type { WebexPerson } from '../../webex/types'
import type { BotOption } from './shared'
import { getClient } from './shared'

interface UserResult {
  id?: string
  ref?: string
  emails?: string[]
  displayName?: string
  nickName?: string
  firstName?: string
  lastName?: string
  avatar?: string
  orgId?: string
  orgRef?: string
  type?: 'person' | 'bot'
  created?: string
  users?: Array<{
    id: string
    ref: string
    emails: string[]
    displayName: string
    type: 'person' | 'bot'
  }>
  error?: string
}

function formatPerson(person: WebexPerson): UserResult {
  return {
    id: person.id,
    ref: toRef(person.id),
    emails: person.emails,
    displayName: person.displayName,
    nickName: person.nickName,
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
    orgId: person.orgId,
    orgRef: toRef(person.orgId),
    type: person.type,
    created: person.created,
  }
}

export async function listAction(
  options: BotOption & { email?: string; displayName?: string; max?: string },
): Promise<UserResult> {
  try {
    const client = await getClient(options)
    const max = options.max ? parseInt(options.max, 10) : undefined
    const people = await client.listPeople({ email: options.email, displayName: options.displayName, max })

    return {
      users: people.map((p) => ({
        id: p.id,
        ref: toRef(p.id),
        emails: p.emails,
        displayName: p.displayName,
        type: p.type,
      })),
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function infoAction(personId: string, options: BotOption): Promise<UserResult> {
  try {
    const client = await getClient(options)
    const person = await client.getPerson(personId)
    return formatPerson(person)
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const userCommand = new Command('user')
  .description('User commands')
  .addCommand(
    new Command('list')
      .description('Search people by email or display name')
      .option('--email <email>', 'Filter by exact email')
      .option('--display-name <name>', 'Filter by display name prefix')
      .option('--max <n>', 'Number of users to retrieve')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: BotOption & { email?: string; displayName?: string; max?: string }) => {
        cliOutput(await listAction(opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('info')
      .description('Get details for a person')
      .argument('<id>', 'Person ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (personId: string, opts: BotOption) => {
        cliOutput(await infoAction(personId, opts), opts.pretty)
      }),
  )
