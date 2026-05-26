import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { withKakaoClient } from './shared'

async function listAction(
  chatId: string,
  options: { account?: string; count?: string; from?: string; pretty?: boolean },
): Promise<void> {
  try {
    const count = options.count ? Number.parseInt(options.count, 10) : 20
    const messages = await withKakaoClient(options, (client) =>
      client.getMessages(chatId, { count, from: options.from }),
    )
    console.log(formatOutput(messages, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function sendAction(
  chatId: string,
  text: string,
  options: { account?: string; pretty?: boolean },
): Promise<void> {
  try {
    const result = await withKakaoClient(options, (client) => client.sendMessage(chatId, text))
    console.log(formatOutput(result, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function replyAction(
  chatId: string,
  srcLogId: string,
  srcUserId: string,
  text: string,
  options: { account?: string; pretty?: boolean; parentText?: string; parentType?: string },
): Promise<void> {
  try {
    const result = await withKakaoClient(options, (client) =>
      client.replyToMessage(
        chatId,
        {
          srcLogId,
          srcUserId,
          srcMessage: options.parentText,
          srcType: options.parentType ? Number.parseInt(options.parentType, 10) : undefined,
        },
        text,
      ),
    )
    console.log(formatOutput(result, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

type UploadKind = 'auto' | 'photo' | 'video' | 'audio' | 'file' | 'multi'

async function uploadAction(
  chatId: string,
  filePaths: string[],
  options: { account?: string; pretty?: boolean; as?: UploadKind; mime?: string },
): Promise<void> {
  try {
    const kind: UploadKind = options.as ?? (filePaths.length > 1 ? 'multi' : 'auto')

    const result = await withKakaoClient(options, async (client) => {
      if (kind === 'multi') {
        if (filePaths.length < 2) {
          throw new Error('--as=multi requires 2 or more files')
        }
        return client.sendMultiPhoto(
          chatId,
          filePaths.map((p) => ({ data: readFileSync(resolve(p)), filename: basename(p) })),
        )
      }

      if (filePaths.length !== 1) {
        throw new Error(`--as=${kind} accepts exactly one file path`)
      }
      const path = resolve(filePaths[0]!)
      const data = readFileSync(path)
      const filename = basename(path)

      switch (kind) {
        case 'auto':
          return client.sendAttachment(chatId, data, filename, options.mime)
        case 'photo':
          return client.sendPhoto(chatId, data, filename)
        case 'video':
          return client.sendVideo(chatId, data, filename)
        case 'audio':
          return client.sendAudio(chatId, data, filename)
        case 'file':
          return client.sendFile(chatId, data, filename, options.mime ?? 'application/octet-stream')
      }
    })
    console.log(formatOutput(result, options.pretty))
    if (!result.success) {
      process.exit(1)
    }
  } catch (error) {
    handleError(error as Error)
  }
}

async function markReadAction(
  chatId: string,
  logId: string,
  options: { account?: string; linkId?: string; pretty?: boolean },
): Promise<void> {
  try {
    const result = await withKakaoClient(options, (client) =>
      client.markRead(chatId, logId, options.linkId !== undefined ? { linkId: options.linkId } : undefined),
    )
    console.log(formatOutput(result, options.pretty))
    if (!result.success) {
      process.exit(1)
    }
  } catch (error) {
    handleError(error as Error)
  }
}

export const messageCommand = new Command('message')
  .description('KakaoTalk message commands')
  .addCommand(
    new Command('list')
      .description('List messages in a chat room')
      .argument('<chat-id>', 'Chat room ID')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('-n, --count <number>', 'Number of messages to fetch', '20')
      .option('--from <log-id>', 'Fetch messages starting from this log ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('send')
      .description('Send a text message to a chat room')
      .argument('<chat-id>', 'Chat room ID')
      .argument('<text>', 'Message text')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction),
  )
  .addCommand(
    new Command('reply')
      .description('Reply to a message in a chat room (LOCO type=26 with reply attachment)')
      .argument('<chat-id>', 'Chat room ID')
      .argument('<src-log-id>', 'log_id of the parent message')
      .argument('<src-user-id>', 'user_id of the parent message author')
      .argument('<text>', 'Reply text')
      .option('--parent-text <text>', 'Original message text shown in the quote bubble')
      .option('--parent-type <code>', 'Message type code of the parent (default 1=text)')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--pretty', 'Pretty print JSON output')
      .action(replyAction),
  )
  .addCommand(
    new Command('upload')
      .description(
        'Send one or more files to a chat. MIME is sniffed from the filename (or --mime) and dispatched to the matching KakaoTalk message_type. Pass 2+ files (or --as=multi) for a multi-photo gallery.',
      )
      .argument('<chat-id>', 'Chat room ID')
      .argument('<file-paths...>', 'One or more file paths')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--as <kind>', 'Force a specific kind: auto | photo | video | audio | file | multi')
      .option('--mime <type>', 'Override MIME type (otherwise inferred from filename)')
      .option('--pretty', 'Pretty print JSON output')
      .action(uploadAction),
  )
  .addCommand(
    new Command('mark-read')
      .description('Mark messages in a chat room as read up to a given log ID')
      .argument('<chat-id>', 'Chat room ID')
      .argument('<log-id>', 'Watermark log ID (mark messages up to and including this log_id as read)')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--link-id <li>', 'Open-chat link ID (REQUIRED for open chats / 오픈채팅)')
      .option('--pretty', 'Pretty print JSON output')
      .action(markReadAction),
  )
