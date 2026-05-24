import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveDiscordChannelTarget } from '@/policy/platform-mappers/discord'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { assertDiscordWritable } from '../readonly-guard'

export async function createAction(
  channelId: string,
  name: string,
  options: { autoArchiveDuration?: string; pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'thread create', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'write', await resolveDiscordChannelTarget(client, engine, channelId, 'write'))
    const threadOptions: { auto_archive_duration?: number } = {}

    if (options.autoArchiveDuration) {
      threadOptions.auto_archive_duration = parseInt(options.autoArchiveDuration, 10)
    }

    const thread = await client.createThread(channelId, name, threadOptions)

    const output = {
      id: thread.id,
      name: thread.name,
      type: thread.type,
      parent_id: thread.parent_id,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function archiveAction(threadId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'thread archive', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    const existingThread = await client.getChannel(threadId)
    const parentChannelId = existingThread.parent_id || existingThread.id
    engine.assertAllowed(
      'discord',
      'write',
      await resolveDiscordChannelTarget(client, engine, parentChannelId, 'write'),
    )
    const thread = await client.archiveThread(threadId)

    const output = {
      id: thread.id,
      name: thread.name,
      archived: thread.thread_metadata?.archived || false,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const threadCommand = new Command('thread')
  .description('Thread commands')
  .addCommand(
    new Command('create')
      .description('Create a thread')
      .argument('<channel-id>', 'Channel ID')
      .argument('<name>', 'Thread name')
      .option('--auto-archive-duration <minutes>', 'Auto archive duration in minutes')
      .option('--pretty', 'Pretty print JSON output')
      .action(createAction),
  )
  .addCommand(
    new Command('archive')
      .description('Archive a thread')
      .argument('<thread-id>', 'Thread ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(archiveAction),
  )
