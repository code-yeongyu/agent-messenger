import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveSlackChannelTarget } from '@/policy/platform-mappers/slack'
import type { PolicyTarget } from '@/policy/types'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackFile } from '../types'

type LoadedPolicyEngine = Awaited<ReturnType<typeof getPolicyEngine>>

async function assertFileChannelsAllowed(
  client: SlackClient,
  engine: LoadedPolicyEngine,
  file: SlackFile,
  direction: 'read' | 'write',
): Promise<void> {
  for (const channel of file.channels ?? []) {
    engine.assertAllowed('slack', direction, await resolveSlackChannelTarget(client, engine, channel, direction))
  }
}

async function filterFilesByReadPolicy(
  client: SlackClient,
  engine: LoadedPolicyEngine,
  files: SlackFile[],
): Promise<SlackFile[]> {
  const targetByChannel = new Map<string, PolicyTarget>()
  const visibleFiles: SlackFile[] = []

  for (const file of files) {
    const channels = file.channels ?? []
    if (channels.length === 0) {
      visibleFiles.push(file)
      continue
    }

    let isVisible = false
    for (const channel of channels) {
      let target = targetByChannel.get(channel)
      if (!target) {
        target = await resolveSlackChannelTarget(client, engine, channel, 'read')
        targetByChannel.set(channel, target)
      }

      if (!engine.isDenied('slack', 'read', target)) {
        isVisible = true
        break
      }
    }

    if (isVisible) {
      visibleFiles.push(file)
    }
  }

  return visibleFiles
}

function toFileOutput(file: SlackFile) {
  return {
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
}

async function uploadAction(
  channel: string,
  paths: string[],
  options: { filename?: string; thread?: string; comment?: string; title?: string; pretty?: boolean },
): Promise<void> {
  try {
    if (options.filename && paths.length > 1) {
      console.log(formatOutput({ error: '--filename can only be used with a single file' }, options.pretty))
      process.exit(1)
      return
    }

    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    channel = await client.resolveChannel(channel)
    const engine = await getPolicyEngine()
    engine.assertAllowed('slack', 'write', await resolveSlackChannelTarget(client, engine, channel, 'write'))

    if (paths.length === 1) {
      const filePath = resolve(paths[0])
      const fileBuffer = readFileSync(filePath)
      const filename = options.filename || basename(filePath) || 'file'

      const file = await client.uploadFile([channel], fileBuffer, filename, {
        thread_ts: options.thread,
        title: options.title,
        initial_comment: options.comment,
      })

      console.log(formatOutput(toFileOutput(file), options.pretty))
      return
    }

    const uploads = paths.map((path) => {
      const filePath = resolve(path)
      return {
        file: readFileSync(filePath),
        filename: basename(filePath) || 'file',
      }
    })

    const files = await client.uploadFiles(uploads, {
      channel,
      threadTs: options.thread,
      comment: options.comment,
      title: options.title,
    })

    console.log(formatOutput(files.map(toFileOutput), options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function listAction(options: { channel?: string; pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const channel = options.channel ? await client.resolveChannel(options.channel) : undefined
    const engine = await getPolicyEngine()
    if (channel !== undefined) {
      engine.assertAllowed('slack', 'read', await resolveSlackChannelTarget(client, engine, channel, 'read'))
    }
    const files = await client.listFiles(channel)
    const visibleFiles = channel === undefined ? await filterFilesByReadPolicy(client, engine, files) : files

    const output = visibleFiles.map(toFileOutput)

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function infoAction(fileId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const fileData = await client.getFileInfo(fileId)
    const engine = await getPolicyEngine()
    await assertFileChannelsAllowed(client, engine, fileData, 'read')

    const output = toFileOutput(fileData)

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function downloadAction(
  fileId: string,
  outputPath: string | undefined,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const fileData = await client.getFileInfo(fileId)
    const engine = await getPolicyEngine()
    await assertFileChannelsAllowed(client, engine, fileData, 'read')
    const { buffer, file } = await client.downloadFile(fileId)

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
          mimetype: file.mimetype,
          size: file.size,
          path: destPath,
        },
        options.pretty,
      ),
    )
  } catch (error) {
    handleError(error as Error)
  }
}

async function deleteFileAction(fileId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const fileData = await client.getFileInfo(fileId)
    const engine = await getPolicyEngine()
    await assertFileChannelsAllowed(client, engine, fileData, 'write')
    await client.deleteFile(fileId)

    console.log(formatOutput({ success: true, file_id: fileId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const fileCommand = new Command('file')
  .description('File commands')
  .addCommand(
    new Command('upload')
      .description('Upload files to channel (several files are grouped into one message)')
      .argument('<channel>', 'channel ID or name')
      .argument('<paths...>', 'file paths')
      .option('--filename <name>', 'override filename (single file only)')
      .option('--thread <ts>', 'post the files as a reply in this thread')
      .option('--comment <text>', 'message text attached to the files')
      .option('--title <title>', 'title applied to every file')
      .option('--pretty', 'Pretty print JSON output')
      .action(uploadAction),
  )
  .addCommand(
    new Command('list')
      .description('List files in workspace')
      .option('--channel <id>', 'filter by channel')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('info')
      .description('Show file details')
      .argument('<file>', 'file ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(infoAction),
  )
  .addCommand(
    new Command('download')
      .description('Download file')
      .argument('<file>', 'file ID')
      .argument('[output-path]', 'output file path')
      .option('--pretty', 'Pretty print JSON output')
      .action(downloadAction),
  )
  .addCommand(
    new Command('delete')
      .description('Delete a file')
      .argument('<file>', 'file ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteFileAction),
  )
