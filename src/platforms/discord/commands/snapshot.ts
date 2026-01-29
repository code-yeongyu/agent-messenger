import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import type { DiscordMessage } from '../types'

export async function snapshotAction(options: {
  channelsOnly?: boolean
  usersOnly?: boolean
  limit?: number
  pretty?: boolean
}): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token || !config.current_guild) {
      console.log(
        formatOutput({ error: 'No current guild set. Run "guild switch" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token as string)
    const guildId = config.current_guild as string
    const messageLimit = options.limit || 20

    const snapshot: Record<string, any> = {}

    const guild = await client.getGuild(guildId)
    snapshot.guild = {
      id: guild.id,
      name: guild.name,
    }

    if (!options.usersOnly) {
      const channels = await client.listChannels(guildId)

      snapshot.channels = channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        topic: ch.topic,
      }))

      if (!options.channelsOnly) {
        const allMessages: Array<DiscordMessage & { channel_name: string }> = []

        for (const channel of channels) {
          const messages = await client.getMessages(channel.id, messageLimit)
          for (const msg of messages) {
            allMessages.push({
              ...msg,
              channel_name: channel.name,
            })
          }
        }

        snapshot.recent_messages = allMessages.map((msg) => ({
          channel_id: msg.channel_id,
          channel_name: msg.channel_name,
          id: msg.id,
          author: msg.author.username,
          content: msg.content,
          timestamp: msg.timestamp,
        }))
      }
    }

    if (!options.channelsOnly) {
      const users = await client.listUsers(guildId)

      snapshot.members = users.map((u) => ({
        id: u.id,
        username: u.username,
        global_name: u.global_name || null,
      }))
    }

    console.log(formatOutput(snapshot, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const snapshotCommand = new Command()
  .name('snapshot')
  .description('Get comprehensive guild state for AI agents')
  .option('--channels-only', 'Include only channels (exclude messages and members)')
  .option('--users-only', 'Include only members (exclude channels and messages)')
  .option('--limit <n>', 'Number of recent messages per channel (default: 20)', '20')
  .action(async (options) => {
    await snapshotAction({
      channelsOnly: options.channelsOnly,
      usersOnly: options.usersOnly,
      limit: parseInt(options.limit, 10),
      pretty: options.pretty,
    })
  })
