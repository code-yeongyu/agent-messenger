import { resolve } from 'node:path'

import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveDiscordChannelTarget } from '@/policy/platform-mappers/discord'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { assertDiscordWritable } from '../readonly-guard'
import type { DiscordFile } from '../types'

export async function uploadAction(
  channelId: string,
  path: string,
  options: { filename?: string; pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    assertDiscordWritable(config, 'file upload', credManager)
    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    engine.assertAllowed('discord', 'write', await resolveDiscordChannelTarget(client, engine, channelId, 'write'))

    const filePath = resolve(path)
    const file = await client.uploadFile(channelId, filePath)

    const output = {
      id: file.id,
      filename: file.filename,
      size: file.size,
      url: file.url,
      content_type: file.content_type || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function listAction(channelId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new DiscordClient().login({ token: config.token })
    const engine = await getPolicyEngine()
    const channelTarget = await resolveDiscordChannelTarget(client, engine, channelId, 'read')
    if (engine.isDenied('discord', 'read', channelTarget)) {
      console.log(formatOutput([], options.pretty))
      return
    }
    const files = await client.listFiles(channelId)

    const output = files.map((file: DiscordFile) => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      url: file.url,
      content_type: file.content_type || null,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function infoAction(channelId: string, fileId: string, options: { pretty?: boolean }): Promise<void> {
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
    const files = await client.listFiles(channelId)
    const fileData = files.find((f) => f.id === fileId)

    if (!fileData) {
      console.log(formatOutput({ error: `File not found: ${fileId}` }, options.pretty))
      process.exit(1)
    }

    const output = {
      id: fileData.id,
      filename: fileData.filename,
      size: fileData.size,
      url: fileData.url,
      content_type: fileData.content_type || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const fileCommand = new Command('file')
  .description('File commands')
  .addCommand(
    new Command('upload')
      .description('Upload file to channel')
      .argument('<channel-id>', 'Channel ID')
      .argument('<path>', 'file path')
      .option('--filename <name>', 'override filename')
      .option('--pretty', 'Pretty print JSON output')
      .action(uploadAction),
  )
  .addCommand(
    new Command('list')
      .description('List files in channel')
      .argument('<channel-id>', 'Channel ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('info')
      .description('Show file details')
      .argument('<channel-id>', 'Channel ID')
      .argument('<file-id>', 'File ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(infoAction),
  )
