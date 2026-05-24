import { getPolicyEngine } from '@/policy/engine'
import { resolveDiscordChannelTarget } from '@/policy/platform-mappers/discord'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { assertDiscordWritable } from '../readonly-guard'
import type { DiscordMessage, DiscordSearchOptions } from '../types'

export async function sendAction(channelId: string, content: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'message send', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'write', await resolveDiscordChannelTarget(client, engine, channelId, 'write'))
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

export async function replyAction(
  channelId: string,
  messageId: string,
  content: string,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'message reply', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'write', await resolveDiscordChannelTarget(client, engine, channelId, 'write'))
    const message = await client.replyToMessage(channelId, messageId, content)

    const output = {
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: message.timestamp,
      reply_to: messageId,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function listAction(channelId: string, options: { limit?: number; pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'read', await resolveDiscordChannelTarget(client, engine, channelId, 'read'))
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

export async function getAction(channelId: string, messageId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'read', await resolveDiscordChannelTarget(client, engine, channelId, 'read'))
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
  options: { force?: boolean; pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    if (!options.force) {
      console.log(formatOutput({ warning: 'Use --force to confirm deletion', messageId }, options.pretty))
      process.exit(0)
    }

    assertDiscordWritable(config, 'message delete', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'write', await resolveDiscordChannelTarget(client, engine, channelId, 'write'))
    await client.deleteMessage(channelId, messageId)

    console.log(formatOutput({ deleted: messageId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function ackAction(channelId: string, messageId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'message ack', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'read', await resolveDiscordChannelTarget(client, engine, channelId, 'read'))
    await client.ackMessage(channelId, messageId)

    console.log(formatOutput({ acknowledged: messageId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function searchAction(
  query: string,
  options: {
    channel?: string
    author?: string
    has?: string
    sort?: string
    sortDir?: string
    limit?: number
    offset?: number
    pretty?: boolean
  },
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    if (!config.current_server) {
      console.log(formatOutput({ error: 'No server selected. Run "server switch <server-id>" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new DiscordClient().login({ token: config.token })

    const searchOptions: DiscordSearchOptions = {}
    if (options.channel) searchOptions.channelId = options.channel
    if (options.author) searchOptions.authorId = options.author
    if (options.has) {
      searchOptions.has = options.has as DiscordSearchOptions['has']
    }
    if (options.sort) {
      searchOptions.sortBy = options.sort as DiscordSearchOptions['sortBy']
    }
    if (options.sortDir) {
      searchOptions.sortOrder = options.sortDir as DiscordSearchOptions['sortOrder']
    }
    if (options.limit !== undefined) searchOptions.limit = options.limit
    if (options.offset !== undefined) searchOptions.offset = options.offset

    const { results } = await client.searchMessages(config.current_server, query, searchOptions)
    const engine = await getPolicyEngine()
    const visibleResults = engine.filterTargets('discord', 'read', results, (result) => ({
      kind: 'channel',
      id: result.channel_id,
    }))

    const output = {
      total_results: visibleResults.length,
      results: visibleResults.map((msg) => ({
        id: msg.id,
        content: msg.content,
        author_id: msg.author.id,
        author_username: msg.author.username,
        channel_id: msg.channel_id,
        timestamp: msg.timestamp,
      })),
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}
