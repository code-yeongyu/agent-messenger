import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { WebexClient } from '../client'
import type { WebexMessage } from '../types'

function formatMessageOutput(message: WebexMessage) {
  return {
    id: message.id,
    ref: message.ref,
    roomId: message.roomId,
    roomRef: message.roomRef,
    text: message.text,
    html: message.html,
    personEmail: message.personEmail,
    created: message.created,
  }
}

async function withWebexClient<T>(run: (client: WebexClient) => Promise<T>): Promise<T> {
  const client = new WebexClient()
  try {
    await client.login()
    return await run(client)
  } finally {
    await client.dispose()
  }
}

export async function sendAction(
  spaceId: string,
  text: string,
  options: { markdown?: boolean; pretty?: boolean },
): Promise<void> {
  try {
    const message = await withWebexClient((client) => client.sendMessage(spaceId, text, { markdown: options.markdown }))

    console.log(formatOutput(formatMessageOutput(message), options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function listAction(spaceId: string, options: { limit?: number; pretty?: boolean }): Promise<void> {
  try {
    const limit = options.limit ?? 50
    const messages = await withWebexClient((client) => client.listMessages(spaceId, { max: limit }))

    const output = messages.map(formatMessageOutput)

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function getAction(messageId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const message = await withWebexClient((client) => client.getMessage(messageId))

    console.log(formatOutput(formatMessageOutput(message), options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function deleteAction(messageId: string, options: { force?: boolean; pretty?: boolean }): Promise<void> {
  try {
    if (!options.force) {
      console.log(formatOutput({ warning: 'Use --force to confirm deletion', messageId }, options.pretty))
      return process.exit(0)
    }

    await withWebexClient((client) => client.deleteMessage(messageId))

    console.log(formatOutput({ deleted: messageId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function editAction(
  messageId: string,
  spaceId: string,
  text: string,
  options: { markdown?: boolean; pretty?: boolean },
): Promise<void> {
  try {
    const message = await withWebexClient((client) =>
      client.editMessage(messageId, spaceId, text, {
        markdown: options.markdown,
      }),
    )

    console.log(formatOutput(formatMessageOutput(message), options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function dmAction(
  email: string,
  text: string,
  options: { markdown?: boolean; pretty?: boolean },
): Promise<void> {
  try {
    const message = await withWebexClient((client) =>
      client.sendDirectMessage(email, text, { markdown: options.markdown }),
    )

    console.log(formatOutput(formatMessageOutput(message), options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send message to a space')
      .argument('<space-id>', 'Space/Room ID')
      .argument('<text>', 'Message text')
      .option('--markdown', 'Send as markdown')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction),
  )
  .addCommand(
    new Command('dm')
      .description('Send a direct message by email')
      .argument('<email>', 'Recipient email address')
      .argument('<text>', 'Message text')
      .option('--markdown', 'Send as markdown')
      .option('--pretty', 'Pretty print JSON output')
      .action(dmAction),
  )
  .addCommand(
    new Command('list')
      .description('List messages from a space')
      .argument('<space-id>', 'Space/Room ID')
      .option('--limit <n>', 'Number of messages to retrieve', '50')
      .option('--pretty', 'Pretty print JSON output')
      .action((spaceId: string, options: { limit: string; pretty?: boolean }) => {
        return listAction(spaceId, {
          limit: parseInt(options.limit, 10),
          pretty: options.pretty,
        })
      }),
  )
  .addCommand(
    new Command('get')
      .description('Get a single message by ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(getAction),
  )
  .addCommand(
    new Command('delete')
      .description('Delete a message')
      .argument('<message-id>', 'Message ID')
      .option('--force', 'Skip confirmation')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteAction),
  )
  .addCommand(
    new Command('edit')
      .description('Edit a message')
      .argument('<message-id>', 'Message ID')
      .argument('<space-id>', 'Space/Room ID (required by Webex API)')
      .argument('<text>', 'New message text')
      .option('--markdown', 'Send as markdown')
      .option('--pretty', 'Pretty print JSON output')
      .action(editAction),
  )
