import { Command } from 'commander'
import { CredentialManager } from '../lib/credential-manager'
import { SlackClient } from '../lib/slack-client'
import type { SlackMessage } from '../types'
import { handleError } from '../utils/error-handler'
import { formatOutput } from '../utils/output'

let messageRefCounter = 0
const messageRefs: Map<string, string> = new Map()

function assignMessageRef(ts: string): string {
  messageRefCounter++
  const ref = `@m${messageRefCounter}`
  messageRefs.set(ref, ts)
  return ref
}

function resolveMessageRef(ref: string): string | null {
  if (ref.startsWith('@m')) {
    return messageRefs.get(ref) || null
  }
  return null
}

async function sendAction(
  channel: string,
  text: string,
  options: { thread?: string; pretty?: boolean }
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
    const message = await client.sendMessage(channel, text, options.thread)

    const ref = assignMessageRef(message.ts)
    const output = {
      ref,
      ts: message.ts,
      text: message.text,
      type: message.type,
      user: message.user,
      thread_ts: message.thread_ts,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function listAction(
  channel: string,
  options: { limit?: number; thread?: string; pretty?: boolean }
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
    const limit = options.limit || 20
    const messages = await client.getMessages(channel, limit)

    messageRefCounter = 0
    messageRefs.clear()

    const output = messages.map((msg: SlackMessage) => {
      const ref = assignMessageRef(msg.ts)
      return {
        ref,
        ts: msg.ts,
        text: msg.text,
        type: msg.type,
        user: msg.user,
        username: msg.username,
        thread_ts: msg.thread_ts,
        reply_count: msg.reply_count,
        edited: msg.edited,
      }
    })

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function updateAction(
  channel: string,
  ts: string,
  text: string,
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

    const resolvedTs = ts.startsWith('@m') ? resolveMessageRef(ts) : ts
    if (!resolvedTs) {
      console.log(formatOutput({ error: `Invalid message ref: ${ts}` }, options.pretty))
      process.exit(1)
    }

    const client = new SlackClient(workspace.token, workspace.cookie)
    const message = await client.updateMessage(channel, resolvedTs, text)

    const ref = assignMessageRef(message.ts)
    const output = {
      ref,
      ts: message.ts,
      text: message.text,
      type: message.type,
      user: message.user,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function deleteAction(
  channel: string,
  ts: string,
  options: { force?: boolean; pretty?: boolean }
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

    const resolvedTs = ts.startsWith('@m') ? resolveMessageRef(ts) : ts
    if (!resolvedTs) {
      console.log(formatOutput({ error: `Invalid message ref: ${ts}` }, options.pretty))
      process.exit(1)
    }

    if (!options.force) {
      console.log(
        formatOutput({ warning: 'Use --force to confirm deletion', ts: resolvedTs }, options.pretty)
      )
      process.exit(0)
    }

    const client = new SlackClient(workspace.token, workspace.cookie)
    await client.deleteMessage(channel, resolvedTs)

    console.log(formatOutput({ deleted: resolvedTs }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function searchAction(
  query: string,
  options: { sort?: string; sortDir?: string; limit?: number; pretty?: boolean }
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
    const results = await client.searchMessages(query, {
      sort: options.sort as 'score' | 'timestamp',
      sortDir: options.sortDir as 'asc' | 'desc',
      count: options.limit || 20,
    })

    messageRefCounter = 0
    messageRefs.clear()

    const output = results.map((result) => {
      const ref = assignMessageRef(result.ts)
      return {
        ref,
        ts: result.ts,
        text: result.text,
        user: result.user,
        username: result.username,
        channel_id: result.channel.id,
        channel_name: result.channel.name,
        permalink: result.permalink,
      }
    })

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send message to channel')
      .argument('<channel>', 'Channel ID or name')
      .argument('<text>', 'Message text')
      .option('--thread <ts>', 'Thread timestamp for replies')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction)
  )
  .addCommand(
    new Command('list')
      .description('List messages from channel')
      .argument('<channel>', 'Channel ID or name')
      .option('--limit <n>', 'Number of messages to retrieve', '20')
      .option('--thread <ts>', 'Filter by thread timestamp')
      .option('--pretty', 'Pretty print JSON output')
      .action((channel: string, options: any) => {
        listAction(channel, {
          limit: parseInt(options.limit, 10),
          thread: options.thread,
          pretty: options.pretty,
        })
      })
  )
  .addCommand(
    new Command('update')
      .description('Update message text')
      .argument('<channel>', 'Channel ID or name')
      .argument('<ts>', 'Message timestamp or ref (@m1)')
      .argument('<text>', 'New message text')
      .option('--pretty', 'Pretty print JSON output')
      .action(updateAction)
  )
  .addCommand(
    new Command('delete')
      .description('Delete message')
      .argument('<channel>', 'Channel ID or name')
      .argument('<ts>', 'Message timestamp or ref (@m1)')
      .option('--force', 'Skip confirmation')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteAction)
  )
  .addCommand(
    new Command('search')
      .description('Search messages across workspace')
      .argument('<query>', 'Search query')
      .option('--sort <type>', 'Sort by: score, timestamp (default: timestamp)')
      .option('--sort-dir <dir>', 'Sort direction: asc, desc (default: desc)')
      .option('--limit <n>', 'Number of results', '20')
      .option('--pretty', 'Pretty print JSON output')
      .action((query: string, options: any) => {
        searchAction(query, {
          sort: options.sort,
          sortDir: options.sortDir,
          limit: parseInt(options.limit, 10),
          pretty: options.pretty,
        })
      })
  )
