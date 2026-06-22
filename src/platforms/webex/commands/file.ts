import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { WebexClient } from '../client'

async function withWebexClient<T>(run: (client: WebexClient) => Promise<T>): Promise<T> {
  const client = new WebexClient()
  try {
    await client.login()
    return await run(client)
  } finally {
    await client.dispose()
  }
}

export async function uploadAction(
  space: string,
  path: string,
  options: { text?: string; markdown?: boolean; parent?: string; pretty?: boolean },
): Promise<void> {
  try {
    const filePath = resolve(path)
    const content = await readFile(filePath)
    const message = await withWebexClient((client) =>
      client.uploadFile(
        space,
        { content: new Blob([content]), filename: basename(filePath) },
        { text: options.text, markdown: options.markdown, parentId: options.parent },
      ),
    )

    const output = {
      id: message.id,
      ref: message.ref,
      roomId: message.roomId,
      roomRef: message.roomRef,
      files: message.files,
      created: message.created,
    }
    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function downloadAction(
  content: string,
  output: string | undefined,
  options: { pretty?: boolean },
): Promise<void> {
  try {
    const { data, filename, contentType } = await withWebexClient((client) => client.downloadContent(content))
    const outputPath = output ? resolve(output) : resolve(process.cwd(), basename(filename))
    await writeFile(outputPath, Buffer.from(data))

    console.log(formatOutput({ downloaded: outputPath, filename, contentType, size: data.byteLength }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const fileCommand = new Command('file')
  .description('File commands')
  .addCommand(
    new Command('upload')
      .description('Upload a local file to a space')
      .argument('<space>', 'Space/Room ID')
      .argument('<path>', 'Local file path')
      .option('--text <text>', 'Optional message to send with the file')
      .option('--markdown', 'Treat --text as markdown')
      .option('--parent <id>', 'Reply within a thread (parent message ID)')
      .option('--pretty', 'Pretty print JSON output')
      .action(uploadAction),
  )
  .addCommand(
    new Command('download')
      .description('Download a file attachment by content URL or ID')
      .argument('<content>', 'File content URL (from message.files) or content ID')
      .argument('[output]', 'Output path (defaults to original filename)')
      .option('--pretty', 'Pretty print JSON output')
      .action(downloadAction),
  )
