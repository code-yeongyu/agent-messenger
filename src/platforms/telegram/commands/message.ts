import { Command } from 'commander'

import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { parseLimitOption, withTelegramClient } from './shared'

async function listAction(
  reference: string,
  options: { account?: string; pretty?: boolean; limit?: string },
): Promise<void> {
  try {
    const limit = parseLimitOption(options.limit, 20)
    const messages = await withTelegramClient(options, async (client) => client.listMessages(reference, limit))
    console.log(formatOutput(messages, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function sendAction(
  reference: string,
  text: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    const message = await withTelegramClient(options, async (client) => client.sendMessage(reference, text))
    console.log(formatOutput(message, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

function parseMessageId(messageId: string): number | null {
  const trimmedMessageId = messageId.trim()
  const parsedMessageId = Number.parseInt(trimmedMessageId, 10)
  if (!/^\d+$/.test(trimmedMessageId) || !Number.isSafeInteger(parsedMessageId) || parsedMessageId <= 0) {
    return null
  }
  return parsedMessageId
}

async function replyAction(
  reference: string,
  messageIdInput: string,
  text: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    const replyToMessageId = parseMessageId(messageIdInput)
    if (replyToMessageId === null) {
      console.log(
        formatOutput(
          { error: 'Invalid message ID. Provide the numeric message ID from "message list".' },
          options.pretty,
        ),
      )
      process.exit(1)
      return
    }

    const message = await withTelegramClient(options, async (client) =>
      client.replyToMessage(reference, replyToMessageId, text),
    )
    console.log(formatOutput(message, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function editAction(
  reference: string,
  messageId: string,
  text: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    const parsedMessageId = parseMessageId(messageId)
    if (parsedMessageId === null) {
      console.log(
        formatOutput(
          { error: 'Invalid message ID. Provide the numeric message ID from "message list".' },
          options.pretty,
        ),
      )
      process.exit(1)
      return
    }

    const message = await withTelegramClient(options, async (client) =>
      client.editMessage(reference, parsedMessageId, text),
    )
    console.log(formatOutput(message, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('Telegram message commands')
  .addCommand(
    new Command('list')
      .description('List recent messages in a chat')
      .argument('<chat>', 'Chat ID, @username, or title')
      .option('--limit <n>', 'Number of messages to fetch', '20')
      .option('--account <id>', 'Use a specific Telegram account')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('send')
      .description('Send a text message to a chat')
      .argument('<chat>', 'Chat ID, @username, or title')
      .argument('<text>', 'Message text')
      .option('--account <id>', 'Use a specific Telegram account')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction),
  )
  .addCommand(
    new Command('reply')
      .description('Reply to a message in a chat')
      .argument('<chat>', 'Chat ID, @username, or title')
      .argument('<message-id>', 'ID of the message being replied to')
      .argument('<text>', 'Reply text')
      .option('--account <id>', 'Use a specific Telegram account')
      .option('--pretty', 'Pretty print JSON output')
      .action(replyAction),
  )
  .addCommand(
    new Command('edit')
      .description('Edit a text message (your own messages only, within 48h)')
      .argument('<chat>', 'Chat ID, @username, or title')
      .argument('<message-id>', 'Message ID')
      .argument('<text>', 'New message text')
      .option('--account <id>', 'Use a specific Telegram account')
      .option('--pretty', 'Pretty print JSON output')
      .action(editAction),
  )
