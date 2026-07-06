import { statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { Command } from 'commander'

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

    const safeName = basename(file.name.replace(/\\/g, '/'))
    let destPath = outputPath ? resolve(outputPath) : resolve(safeName)
    let isDirectory = false
    try {
      isDirectory = statSync(destPath).isDirectory()
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        throw error
      }
    }

    if (isDirectory) {
      destPath = join(destPath, safeName)
    }

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
      .description('Download file from channel')
      .argument('<team-id>', 'Team ID')
      .argument('<channel-id>', 'Channel ID')
      .argument('<file-id>', 'File ID')
      .argument('[output-path]', 'Output file or directory path')
      .option('--pretty', 'Pretty print JSON output')
      .action(downloadAction),
  )
