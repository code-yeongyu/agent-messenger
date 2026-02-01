import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordMessage } from '../types'

export async function sendAction(
  channelId: string,
  content: string,
  options: { reply?: string; pretty?: boolean }
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
    await client.triggerTyping(channelId)
    const message = await client.sendMessage(channelId, content, {
      replyTo: options.reply,
    })

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

export async function editAction(
  channelId: string,
  messageId: string,
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
    const message = await client.editMessage(channelId, messageId, content)

    const output = {
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: message.timestamp,
      edited_timestamp: message.edited_timestamp || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function searchAction(
  query: string,
  options: {
    guild?: string
    author?: string
    channel?: string
    limit?: number
    offset?: number
    pretty?: boolean
  }
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

    const guildId = options.guild || config.current_guild
    if (!guildId) {
      console.log(
        formatOutput(
          { error: 'No guild specified. Use --guild or set current guild.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const result = await client.searchMessages(guildId, {
      content: query,
      authorId: options.author,
      channelId: options.channel,
      limit: options.limit,
      offset: options.offset,
    })

    const output = {
      total_results: result.total_results,
      messages: result.messages.map((group: DiscordMessage[]) =>
        group.map((msg) => ({
          id: msg.id,
          channel_id: msg.channel_id,
          content: msg.content,
          author: msg.author.username,
          timestamp: msg.timestamp,
          thread_id: msg.thread_id || null,
          embeds: msg.embeds ?? [],
        }))
      ),
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
      embeds: msg.embeds ?? [],
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
      embeds: message.embeds ?? [],
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

async function ackAction(
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
      .option('--reply <message-id>', 'Reply to a message (creates thread)')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction)
  )
  .addCommand(
    new Command('edit')
      .description('Edit message content')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .argument('<content>', 'New message content')
      .option('--pretty', 'Pretty print JSON output')
      .action(editAction)
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
      .description('Mark message as read')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(ackAction)
  )
  .addCommand(
    new Command('search')
      .description('Search messages in a guild')
      .argument('<query>', 'Search query')
      .option('--guild <guild-id>', 'Guild ID (defaults to current guild)')
      .option('--author <user-id>', 'Filter by author user ID')
      .option('--channel <channel-id>', 'Filter by channel ID')
      .option('--limit <n>', 'Maximum number of results')
      .option('--offset <n>', 'Pagination offset')
      .option('--pretty', 'Pretty print JSON output')
      .action((query: string, options: any) => {
        searchAction(query, {
          guild: options.guild,
          author: options.author,
          channel: options.channel,
          limit: options.limit ? parseInt(options.limit, 10) : undefined,
          offset: options.offset ? parseInt(options.offset, 10) : undefined,
          pretty: options.pretty,
        })
      })
  )
