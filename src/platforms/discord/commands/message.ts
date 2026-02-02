import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordMessage } from '../types'

export async function sendAction(
  channelId: string,
  content: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const message = await client.sendMessage(channelId, content)

    const output = {
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: message.timestamp,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function listAction(
  channelId: string,
  options: { limit?: number; pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const limit = options.limit || 50
    const messages = await client.getMessages(channelId, limit)

    const output = messages.map((msg: DiscordMessage) => ({
      id: msg.id,
      content: msg.content,
      author: msg.author.username,
      timestamp: msg.timestamp,
      thread_id: msg.thread_id || null,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function getAction(
  channelId: string,
  messageId: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const message = await client.getMessage(channelId, messageId)

    if (!message) {
      console.log(formatOutput({ error: `Message not found: ${messageId}` }, options.pretty))
      process.exit(1)
    }

    const output = {
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: message.timestamp,
      thread_id: message.thread_id || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function deleteAction(
  channelId: string,
  messageId: string,
  options: { force?: boolean; pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    if (!options.force) {
      console.log(
        formatOutput({ warning: 'Use --force to confirm deletion', messageId }, options.pretty)
      )
      process.exit(0)
    }

    const client = new DiscordClient(config.token)
    await client.deleteMessage(channelId, messageId)

    console.log(formatOutput({ deleted: messageId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function ackAction(
  channelId: string,
  messageId: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    await client.ackMessage(channelId, messageId)

    console.log(formatOutput({ acknowledged: messageId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send message to channel')
      .argument('<channel-id>', 'Channel ID')
      .argument('<content>', 'Message content')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction)
  )
  .addCommand(
    new Command('list')
      .description('List messages from channel')
      .argument('<channel-id>', 'Channel ID')
      .option('--limit <n>', 'Number of messages to retrieve', '50')
      .option('--pretty', 'Pretty print JSON output')
      .action((channelId: string, options: any) => {
        listAction(channelId, {
          limit: parseInt(options.limit, 10),
          pretty: options.pretty,
        })
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a single message by ID')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(getAction)
  )
  .addCommand(
    new Command('delete')
      .description('Delete message')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--force', 'Skip confirmation')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteAction)
  )
  .addCommand(
    new Command('ack')
      .description('Mark message as read (acknowledge)')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(ackAction)
  )
