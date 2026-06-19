import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { WebexMessage } from '../../webex/types'
import type { BotOption } from './shared'
import { getClient } from './shared'

interface MessageResult {
  id?: string
  roomId?: string
  text?: string
  markdown?: string
  html?: string
  personEmail?: string
  created?: string
  messages?: Array<{
    id: string
    roomId: string
    text?: string
    personEmail: string
    created: string
  }>
  deleted?: string
  error?: string
}

function formatMessage(message: WebexMessage): MessageResult {
  return {
    id: message.id,
    roomId: message.roomId,
    text: message.text,
    markdown: message.markdown,
    html: message.html,
    personEmail: message.personEmail,
    created: message.created,
  }
}

export async function sendAction(
  space: string,
  text: string,
  options: BotOption & { markdown?: boolean },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.sendMessage(space, text, { markdown: options.markdown })

    return formatMessage(message)
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function dmAction(
  email: string,
  text: string,
  options: BotOption & { markdown?: boolean },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.sendDirectMessage(email, text, { markdown: options.markdown })

    return formatMessage(message)
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function listAction(space: string, options: BotOption & { max?: string }): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const max = options.max ? parseInt(options.max, 10) : 50
    const messages = await client.listMessages(space, { max })

    return {
      messages: messages.map((msg) => ({
        id: msg.id,
        roomId: msg.roomId,
        text: msg.text,
        personEmail: msg.personEmail,
        created: msg.created,
      })),
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function getAction(messageId: string, options: BotOption): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.getMessage(messageId)

    return formatMessage(message)
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function deleteAction(messageId: string, options: BotOption): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    await client.deleteMessage(messageId)

    return { deleted: messageId }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function editAction(
  messageId: string,
  space: string,
  text: string,
  options: BotOption & { markdown?: boolean },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.editMessage(messageId, space, text, { markdown: options.markdown })

    return formatMessage(message)
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send a message to a space')
      .argument('<space>', 'Space/Room ID')
      .argument('<text>', 'Message text')
      .option('--markdown', 'Send as markdown')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (space: string, text: string, opts: BotOption & { markdown?: boolean }) => {
        cliOutput(await sendAction(space, text, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('dm')
      .description('Send a direct message by recipient email')
      .argument('<email>', 'Recipient email address')
      .argument('<text>', 'Message text')
      .option('--markdown', 'Send as markdown')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (email: string, text: string, opts: BotOption & { markdown?: boolean }) => {
        cliOutput(await dmAction(email, text, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('list')
      .description('List messages in a space')
      .argument('<space>', 'Space/Room ID')
      .option('--max <n>', 'Number of messages to fetch', '50')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (space: string, opts: BotOption & { max?: string }) => {
        cliOutput(await listAction(space, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('get')
      .description('Get a single message')
      .argument('<id>', 'Message ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (messageId: string, opts: BotOption) => {
        cliOutput(await getAction(messageId, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('delete')
      .description('Delete a message')
      .argument('<id>', 'Message ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (messageId: string, opts: BotOption) => {
        cliOutput(await deleteAction(messageId, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('edit')
      .description('Edit a message')
      .argument('<id>', 'Message ID')
      .argument('<space>', 'Space/Room ID')
      .argument('<text>', 'New message text')
      .option('--markdown', 'Send as markdown')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (messageId: string, space: string, text: string, opts: BotOption & { markdown?: boolean }) => {
        cliOutput(await editAction(messageId, space, text, opts), opts.pretty)
      }),
  )
