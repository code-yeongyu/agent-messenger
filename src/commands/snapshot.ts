import { Command } from 'commander'
import { CredentialManager } from '../lib/credential-manager'
import { SlackClient } from '../lib/slack-client'
import type { SlackMessage } from '../types'
import { handleError } from '../utils/error-handler'
import { formatOutput } from '../utils/output'

async function snapshotAction(options: {
  channelsOnly?: boolean
  usersOnly?: boolean
  limit?: number
  pretty?: boolean
}): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(
        formatOutput(
          { error: 'No current workspace set. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new SlackClient(workspace.token, workspace.cookie)

    const auth = await client.testAuth()
    const messageLimit = options.limit || 20

    const snapshot: Record<string, any> = {
      workspace: {
        id: auth.team_id,
        name: auth.team,
      },
    }

    if (!options.usersOnly) {
      const channels = await client.listChannels()

      snapshot.channels = channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
        is_archived: ch.is_archived,
        created: ch.created,
        topic: ch.topic?.value,
        purpose: ch.purpose?.value,
      }))

      if (!options.channelsOnly) {
        const allMessages: Array<SlackMessage & { channel_id: string; channel_name: string }> = []

        for (const channel of channels) {
          const messages = await client.getMessages(channel.id, messageLimit)
          for (const msg of messages) {
            allMessages.push({
              ...msg,
              channel_id: channel.id,
              channel_name: channel.name,
            })
          }
        }

        snapshot.recent_messages = allMessages.map((msg) => ({
          channel_id: msg.channel_id,
          channel_name: msg.channel_name,
          ts: msg.ts,
          text: msg.text,
          user: msg.user,
          username: msg.username,
          thread_ts: msg.thread_ts,
        }))
      }
    }

    if (!options.channelsOnly) {
      const users = await client.listUsers()

      snapshot.users = users.map((u) => ({
        id: u.id,
        name: u.name,
        real_name: u.real_name,
        is_admin: u.is_admin,
        is_bot: u.is_bot,
        profile: u.profile,
      }))
    }

    console.log(formatOutput(snapshot, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const snapshotCommand = new Command()
  .name('snapshot')
  .description('Get comprehensive workspace state for AI agents')
  .option('--channels-only', 'Include only channels (exclude messages and users)')
  .option('--users-only', 'Include only users (exclude channels and messages)')
  .option('--limit <n>', 'Number of recent messages per channel (default: 20)', '20')
  .action(async (options) => {
    await snapshotAction({
      channelsOnly: options.channelsOnly,
      usersOnly: options.usersOnly,
      limit: parseInt(options.limit, 10),
      pretty: options.pretty,
    })
  })
