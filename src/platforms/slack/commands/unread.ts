import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackChannelUnread, SlackUnreadThread } from '../types'

async function countsAction(options: { pretty?: boolean }): Promise<void> {
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
    const counts = await client.getUnreadCounts()

    const output = {
      channels: counts.channels.map((ch: SlackChannelUnread) => ({
        id: ch.id,
        mention_count: ch.mention_count,
        has_unreads: ch.has_unreads,
        last_read: ch.last_read,
        latest: ch.latest,
      })),
      ims: counts.ims.map((im: SlackChannelUnread) => ({
        id: im.id,
        mention_count: im.mention_count,
        has_unreads: im.has_unreads,
        last_read: im.last_read,
        latest: im.latest,
      })),
      mpims: counts.mpims.map((mpim: SlackChannelUnread) => ({
        id: mpim.id,
        mention_count: mpim.mention_count,
        has_unreads: mpim.has_unreads,
        last_read: mpim.last_read,
        latest: mpim.latest,
      })),
      threads: {
        has_unreads: counts.threads.has_unreads,
        mention_count: counts.threads.mention_count,
      },
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function threadsAction(options: { limit?: number; pretty?: boolean }): Promise<void> {
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
    const limit = options.limit || 25
    const response = await client.getUnreadThreads(limit)

    const output = {
      total_unread_replies: response.total_unread_replies,
      new_threads_count: response.new_threads_count,
      threads: response.threads.map((thread: SlackUnreadThread) => ({
        root_msg: {
          ts: thread.root_msg.ts,
          text: thread.root_msg.text,
          user: thread.root_msg.user,
          channel: thread.root_msg.channel,
          thread_ts: thread.root_msg.thread_ts,
          reply_count: thread.root_msg.reply_count,
          latest_reply: thread.root_msg.latest_reply,
          last_read: thread.root_msg.last_read,
        },
        unread_replies: thread.unread_replies.map((reply) => ({
          ts: reply.ts,
          text: reply.text,
          user: reply.user,
          thread_ts: reply.thread_ts,
        })),
      })),
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function markAction(
  channel: string,
  ts: string,
  options: { pretty?: boolean }
): Promise<void> {
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
    await client.markAsRead(channel, ts)

    console.log(formatOutput({ marked_as_read: { channel, ts } }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const unreadCommand = new Command('unread')
  .description('Unread message commands')
  .addCommand(
    new Command('counts')
      .description('Get unread counts for all channels, IMs, and threads')
      .option('--pretty', 'Pretty print JSON output')
      .action(countsAction)
  )
  .addCommand(
    new Command('threads')
      .description('Get unread threads with their replies')
      .option('--limit <n>', 'Number of threads to retrieve', '25')
      .option('--pretty', 'Pretty print JSON output')
      .action((options: any) => {
        threadsAction({
          limit: parseInt(options.limit, 10),
          pretty: options.pretty,
        })
      })
  )
  .addCommand(
    new Command('mark')
      .description('Mark channel or thread as read')
      .argument('<channel>', 'Channel ID')
      .argument('<ts>', 'Message timestamp')
      .option('--pretty', 'Pretty print JSON output')
      .action(markAction)
  )
