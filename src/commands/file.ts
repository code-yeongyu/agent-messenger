import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Command } from 'commander'
import { CredentialManager } from '../lib/credential-manager'
import { SlackClient } from '../lib/slack-client'
import { handleError } from '../utils/error-handler'
import { formatOutput } from '../utils/output'

async function uploadAction(
  channel: string,
  path: string,
  options: { filename?: string; pretty?: boolean }
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

    const filePath = resolve(path)
    const fileBuffer = readFileSync(filePath)
    const filename = options.filename || filePath.split('/').pop() || 'file'

    const file = await client.uploadFile([channel], fileBuffer, filename)

    const output = {
      ref: '@f1',
      id: file.id,
      name: file.name,
      title: file.title,
      mimetype: file.mimetype,
      size: file.size,
      url_private: file.url_private,
      created: file.created,
      user: file.user,
      channels: file.channels,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function listAction(options: { channel?: string; pretty?: boolean }): Promise<void> {
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
    const files = await client.listFiles(options.channel)

    const output = files.map((file, idx) => ({
      ref: `@f${idx + 1}`,
      id: file.id,
      name: file.name,
      title: file.title,
      mimetype: file.mimetype,
      size: file.size,
      url_private: file.url_private,
      created: file.created,
      user: file.user,
      channels: file.channels,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function infoAction(file: string, options: { pretty?: boolean }): Promise<void> {
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

    let fileId = file
    if (file.startsWith('@f')) {
      const files = await client.listFiles()
      const refNum = parseInt(file.slice(2), 10)
      if (refNum > 0 && refNum <= files.length) {
        fileId = files[refNum - 1].id
      } else {
        console.log(formatOutput({ error: `Invalid file ref: ${file}` }, options.pretty))
        process.exit(1)
      }
    }

    const files = await client.listFiles()
    const fileData = files.find((f) => f.id === fileId)

    if (!fileData) {
      console.log(formatOutput({ error: `File not found: ${fileId}` }, options.pretty))
      process.exit(1)
    }

    const output = {
      ref: '@f1',
      id: fileData.id,
      name: fileData.name,
      title: fileData.title,
      mimetype: fileData.mimetype,
      size: fileData.size,
      url_private: fileData.url_private,
      created: fileData.created,
      user: fileData.user,
      channels: fileData.channels,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const fileCommand = new Command('file')
  .description('file commands')
  .addCommand(
    new Command('upload')
      .description('upload file to channel')
      .argument('<channel>', 'channel ID')
      .argument('<path>', 'file path')
      .option('--filename <name>', 'override filename')
      .action(uploadAction)
  )
  .addCommand(
    new Command('list')
      .description('list files in workspace')
      .option('--channel <id>', 'filter by channel')
      .action(listAction)
  )
  .addCommand(
    new Command('info')
      .description('show file details')
      .argument('<file>', 'file ID or ref (@f1)')
      .action(infoAction)
  )
