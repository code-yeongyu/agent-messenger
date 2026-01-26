import { Command } from 'commander'
import { CredentialManager } from '../lib/credential-manager'
import { RefManager } from '../lib/ref-manager'
import { SlackClient } from '../lib/slack-client'
import { handleError } from '../utils/error-handler'
import { formatOutput } from '../utils/output'

const refManager = new RefManager()

async function addAction(
  channel: string,
  ts: string,
  emoji: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const ws = await credManager.getWorkspace()

    if (!ws) {
      console.log(
        formatOutput(
          { error: 'No workspace configured. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new SlackClient(ws.token, ws.cookie)

    let resolvedChannel = channel
    let resolvedTs = ts

    const channelResolved = refManager.resolveRef(channel)
    if (channelResolved && channelResolved.type === 'channel') {
      resolvedChannel = channelResolved.id
    }

    const messageResolved = refManager.resolveRef(ts)
    if (messageResolved && messageResolved.type === 'message') {
      resolvedTs = messageResolved.id
    }

    await client.addReaction(resolvedChannel, resolvedTs, emoji)

    console.log(
      formatOutput(
        {
          success: true,
          channel: resolvedChannel,
          ts: resolvedTs,
          emoji,
        },
        options.pretty
      )
    )
  } catch (error) {
    handleError(error as Error)
  }
}

async function removeAction(
  channel: string,
  ts: string,
  emoji: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const ws = await credManager.getWorkspace()

    if (!ws) {
      console.log(
        formatOutput(
          { error: 'No workspace configured. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new SlackClient(ws.token, ws.cookie)

    let resolvedChannel = channel
    let resolvedTs = ts

    const channelResolved = refManager.resolveRef(channel)
    if (channelResolved && channelResolved.type === 'channel') {
      resolvedChannel = channelResolved.id
    }

    const messageResolved = refManager.resolveRef(ts)
    if (messageResolved && messageResolved.type === 'message') {
      resolvedTs = messageResolved.id
    }

    await client.removeReaction(resolvedChannel, resolvedTs, emoji)

    console.log(
      formatOutput(
        {
          success: true,
          channel: resolvedChannel,
          ts: resolvedTs,
          emoji,
        },
        options.pretty
      )
    )
  } catch (error) {
    handleError(error as Error)
  }
}

async function listAction(
  channel: string,
  ts: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const ws = await credManager.getWorkspace()

    if (!ws) {
      console.log(
        formatOutput(
          { error: 'No workspace configured. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const client = new SlackClient(ws.token, ws.cookie)

    let resolvedChannel = channel
    let resolvedTs = ts

    const channelResolved = refManager.resolveRef(channel)
    if (channelResolved && channelResolved.type === 'channel') {
      resolvedChannel = channelResolved.id
    }

    const messageResolved = refManager.resolveRef(ts)
    if (messageResolved && messageResolved.type === 'message') {
      resolvedTs = messageResolved.id
    }

    const messages = await client.getMessages(resolvedChannel, 1)
    const message = messages.find((m) => m.ts === resolvedTs)

    if (!message) {
      console.log(
        formatOutput(
          {
            error: 'Message not found',
            channel: resolvedChannel,
            ts: resolvedTs,
          },
          options.pretty
        )
      )
      process.exit(1)
    }

    const reactions = (message as any).reactions || []

    console.log(
      formatOutput(
        {
          channel: resolvedChannel,
          ts: resolvedTs,
          reactions,
        },
        options.pretty
      )
    )
  } catch (error) {
    handleError(error as Error)
  }
}

export const reactionCommand = new Command('reaction')
  .description('Reaction commands')
  .addCommand(
    new Command('add')
      .description('Add emoji reaction to message')
      .argument('<channel>', 'Channel ID or ref (@c1)')
      .argument('<ts>', 'Message timestamp or ref (@m1)')
      .argument('<emoji>', 'Emoji name (without colons)')
      .option('--pretty', 'Pretty print JSON output')
      .action(addAction)
  )
  .addCommand(
    new Command('remove')
      .description('Remove emoji reaction from message')
      .argument('<channel>', 'Channel ID or ref (@c1)')
      .argument('<ts>', 'Message timestamp or ref (@m1)')
      .argument('<emoji>', 'Emoji name (without colons)')
      .option('--pretty', 'Pretty print JSON output')
      .action(removeAction)
  )
  .addCommand(
    new Command('list')
      .description('List reactions on a message')
      .argument('<channel>', 'Channel ID or ref (@c1)')
      .argument('<ts>', 'Message timestamp or ref (@m1)')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction)
  )
