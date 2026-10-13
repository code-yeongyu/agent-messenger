import { statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveTeamsChannelTarget } from '@/policy/platform-mappers/teams'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { TeamsClient } from '../client'
import { TeamsCredentialManager } from '../credential-manager'
import type { TeamsFile } from '../types'
import { TeamsAuthCapabilityError } from '../types'

export async function uploadAction(
  teamId: string,
  channelId: string,
  path: string,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new TeamsCredentialManager()
    const cred = await credManager.getTokenWithExpiry()

    if (!cred) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new TeamsClient().login({
      token: cred.token,
      tokenExpiresAt: cred.tokenExpiresAt,
      accountType: cred.accountType,
      region: cred.region,
    })
    const engine = await getPolicyEngine()
    engine.assertAllowed('teams', 'write', await resolveTeamsChannelTarget(client, engine, channelId, 'write', teamId))
    const filePath = resolve(path)
    const file = await client.uploadFile(teamId, channelId, filePath)

    const output = {
      id: file.id,
      name: file.name,
      size: file.size,
      url: file.url,
      content_type: file.contentType || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function listAction(teamId: string, channelId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new TeamsCredentialManager()
    const cred = await credManager.getTokenWithExpiry()

    if (!cred) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new TeamsClient().login({
      token: cred.token,
      tokenExpiresAt: cred.tokenExpiresAt,
      accountType: cred.accountType,
      region: cred.region,
    })
    const engine = await getPolicyEngine()
    const target = await resolveTeamsChannelTarget(client, engine, channelId, 'read', teamId)
    if (engine.isDenied('teams', 'read', target)) {
      console.log(formatOutput([], options.pretty))
      return
    }
    const files = await client.listFiles(teamId, channelId)

    const output = files.map((file: TeamsFile) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      url: file.url,
      content_type: file.contentType || null,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function infoAction(
  teamId: string,
  channelId: string,
  fileId: string,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new TeamsCredentialManager()
    const cred = await credManager.getTokenWithExpiry()

    if (!cred) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new TeamsClient().login({
      token: cred.token,
      tokenExpiresAt: cred.tokenExpiresAt,
      accountType: cred.accountType,
      region: cred.region,
    })
    const engine = await getPolicyEngine()
    engine.assertAllowed('teams', 'read', await resolveTeamsChannelTarget(client, engine, channelId, 'read', teamId))
    const files = await client.listFiles(teamId, channelId)
    const fileData = files.find((f) => f.id === fileId)

    if (!fileData) {
      console.log(formatOutput({ error: `File not found: ${fileId}` }, options.pretty))
      process.exit(1)
    }

    const output = {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      url: fileData.url,
      content_type: fileData.contentType || null,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function downloadAction(
  teamId: string,
  channelId: string,
  fileId: string,
  outputPath: string | undefined,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new TeamsCredentialManager()
    const cred = await credManager.getTokenWithExpiry()

    if (!cred) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new TeamsClient().login({
      token: cred.token,
      tokenExpiresAt: cred.tokenExpiresAt,
      accountType: cred.accountType,
      region: cred.region,
    })
    const { buffer, file } = await client.downloadFile(teamId, channelId, fileId)

    const destPath = resolveDownloadPath(file.name, outputPath)
    writeFileSync(destPath, buffer)

    console.log(
      formatOutput(
        {
          id: file.id,
          name: file.name,
          size: file.size,
          content_type: file.contentType || null,
          path: destPath,
        },
        options.pretty,
      ),
    )
  } catch (error) {
    if (error instanceof TeamsAuthCapabilityError) {
      console.error(error.message)
      process.exit(1)
    }
    handleError(error as Error)
  }
}

export async function downloadContentAction(
  url: string,
  outputPath: string | undefined,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new TeamsCredentialManager()
    const cred = await credManager.getTokenWithExpiry()

    if (!cred) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new TeamsClient().login({
      token: cred.token,
      tokenExpiresAt: cred.tokenExpiresAt,
      accountType: cred.accountType,
      region: cred.region,
    })
    const { data, filename, contentType } = await client.downloadContent(url)

    const destPath = resolveDownloadPath(filename, outputPath)
    writeFileSync(destPath, data)

    console.log(
      formatOutput(
        {
          name: filename,
          size: data.byteLength,
          content_type: contentType,
          path: destPath,
        },
        options.pretty,
      ),
    )
  } catch (error) {
    if (error instanceof TeamsAuthCapabilityError) {
      console.error(error.message)
      process.exit(1)
    }
    handleError(error as Error)
  }
}

function resolveDownloadPath(name: string, outputPath: string | undefined): string {
  const safeName = basename(name.replace(/\\/g, '/'))
  const destPath = outputPath ? resolve(outputPath) : resolve(safeName)
  try {
    return statSync(destPath).isDirectory() ? join(destPath, safeName) : destPath
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    return destPath
  }
}

export async function downloadFromCli(target: string, args: string[], options: { pretty?: boolean }): Promise<void> {
  const isUrl = /^https?:\/\//i.test(target)
  if (isUrl && args.length <= 1) {
    return downloadContentAction(target, args[0], options)
  }
  const [channelId, fileId, outputPath] = args
  if (isUrl || !channelId || !fileId || args.length > 3) {
    console.log(
      formatOutput(
        {
          error:
            'Usage: file download <team-id> <channel-id> <file-id> [output-path] | file download <url> [output-path]',
        },
        options.pretty,
      ),
    )
    process.exit(1)
  }
  return downloadAction(target, channelId, fileId, outputPath, options)
}

export const fileCommand = new Command('file')
  .description('File commands')
  .addCommand(
    new Command('upload')
      .description('Upload file to channel')
      .argument('<team-id>', 'Team ID')
      .argument('<channel-id>', 'Channel ID')
      .argument('<path>', 'File path')
      .option('--pretty', 'Pretty print JSON output')
      .action(uploadAction),
  )
  .addCommand(
    new Command('list')
      .description('List files in channel')
      .argument('<team-id>', 'Team ID')
      .argument('<channel-id>', 'Channel ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('info')
      .description('Show file details')
      .argument('<team-id>', 'Team ID')
      .argument('<channel-id>', 'Channel ID')
      .argument('<file-id>', 'File ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(infoAction),
  )
  .addCommand(
    new Command('download')
      .description('Download a channel file, or a content URL from a message `files` entry')
      .usage('<team-id> <channel-id> <file-id> [output-path] | <url> [output-path] [options]')
      .argument('<team-id|url>', 'Team ID, or a content URL from a message `files` entry')
      .argument('[args...]', '<channel-id> <file-id> [output-path] after a team ID; [output-path] after a URL')
      .option('--pretty', 'Pretty print JSON output')
      .action(downloadFromCli),
  )
