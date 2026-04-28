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

async function replyAction(
  reference: string,
  messageIdInput: string,
  text: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    const replyToMessageId = Number(messageIdInput)
    if (!Number.isSafeInteger(replyToMessageId)) {
      console.log(formatOutput({ error: `Invalid message id: ${messageIdInput}` }, options.pretty))
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
