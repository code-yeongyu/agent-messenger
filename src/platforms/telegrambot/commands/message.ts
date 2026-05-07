import { resolve } from 'node:path'

import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { TelegramMessage } from '../types'
import type { BotOption } from './shared'
import { getClient, parseChatId } from './shared'

interface MessageOutput {
  message_id: number
  chat_id: number
  text?: string
  from?: string
  date: number
  edit_date?: number
  reply_to?: number
}

interface MessageResult {
  message?: MessageOutput
  deleted?: number
  error?: string
}

function formatMessage(msg: TelegramMessage): MessageOutput {
  const fromName = msg.from?.username ?? msg.from?.first_name ?? msg.sender_chat?.title
  return {
    message_id: msg.message_id,
    chat_id: msg.chat.id,
    text: msg.text ?? msg.caption,
    from: fromName,
    date: msg.date,
    edit_date: msg.edit_date,
    reply_to: msg.reply_to_message?.message_id,
  }
}

export async function sendAction(
  chat: string,
  text: string,
  options: BotOption & {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
    replyTo?: string
    silent?: boolean
    threadId?: string
  },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.sendMessage(parseChatId(chat), text, {
      parse_mode: options.parseMode,
      reply_to_message_id: options.replyTo ? Number(options.replyTo) : undefined,
      disable_notification: options.silent,
      message_thread_id: options.threadId ? Number(options.threadId) : undefined,
    })
    return { message: formatMessage(message) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function updateAction(
  chat: string,
  messageId: string,
  text: string,
  options: BotOption & { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const result = await client.editMessageText({ chat_id: parseChatId(chat), message_id: Number(messageId) }, text, {
      parse_mode: options.parseMode,
    })
    if (result === true) {
      return { error: 'editMessageText returned true; expected a Message object for chat-message edits.' }
    }
    return { message: formatMessage(result) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function deleteAction(
  chat: string,
  messageId: string,
  options: BotOption & { force?: boolean },
): Promise<MessageResult> {
  if (!options.force) {
    return { error: 'Use --force to confirm deletion' }
  }
  try {
    const client = await getClient(options)
    await client.deleteMessage(parseChatId(chat), Number(messageId))
    return { deleted: Number(messageId) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function forwardAction(
  toChat: string,
  fromChat: string,
  messageId: string,
  options: BotOption & { silent?: boolean; threadId?: string },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.forwardMessage(parseChatId(toChat), parseChatId(fromChat), Number(messageId), {
      disable_notification: options.silent,
      message_thread_id: options.threadId ? Number(options.threadId) : undefined,
    })
    return { message: formatMessage(message) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function uploadAction(
  chat: string,
  filePath: string,
  options: BotOption & { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' },
): Promise<MessageResult> {
  try {
    const client = await getClient(options)
    const message = await client.sendDocument(parseChatId(chat), resolve(filePath), {
      caption: options.caption,
      parse_mode: options.parseMode,
    })
    return { message: formatMessage(message) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send a text message')
      .argument('<chat>', 'Chat ID or @username')
      .argument('<text>', 'Message text')
      .option('--parse-mode <mode>', 'Parse mode: HTML | Markdown | MarkdownV2')
      .option('--reply-to <id>', 'Reply to message ID')
      .option('--silent', 'Send silently (no notification)')
      .option('--thread-id <id>', 'Forum topic thread ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(
        async (
          chat: string,
          text: string,
          opts: BotOption & {
            parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
            replyTo?: string
            silent?: boolean
            threadId?: string
          },
        ) => {
          cliOutput(await sendAction(chat, text, opts), opts.pretty)
        },
      ),
  )
  .addCommand(
    new Command('update')
      .description("Edit a message (bot's own messages only)")
      .argument('<chat>', 'Chat ID or @username')
      .argument('<message-id>', 'Message ID')
      .argument('<text>', 'New message text')
      .option('--parse-mode <mode>', 'Parse mode: HTML | Markdown | MarkdownV2')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(
        async (
          chat: string,
          messageId: string,
          text: string,
          opts: BotOption & { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' },
        ) => {
          cliOutput(await updateAction(chat, messageId, text, opts), opts.pretty)
        },
      ),
  )
  .addCommand(
    new Command('delete')
      .description('Delete a message')
      .argument('<chat>', 'Chat ID or @username')
      .argument('<message-id>', 'Message ID')
      .option('--force', 'Confirm deletion')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (chat: string, messageId: string, opts: BotOption & { force?: boolean }) => {
        cliOutput(await deleteAction(chat, messageId, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('forward')
      .description('Forward a message from one chat to another')
      .argument('<to-chat>', 'Destination chat ID or @username')
      .argument('<from-chat>', 'Source chat ID or @username')
      .argument('<message-id>', 'Message ID to forward')
      .option('--silent', 'Forward silently')
      .option('--thread-id <id>', 'Destination forum topic thread ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(
        async (
          toChat: string,
          fromChat: string,
          messageId: string,
          opts: BotOption & { silent?: boolean; threadId?: string },
        ) => {
          cliOutput(await forwardAction(toChat, fromChat, messageId, opts), opts.pretty)
        },
      ),
  )
  .addCommand(
    new Command('upload')
      .description('Upload a document to a chat')
      .argument('<chat>', 'Chat ID or @username')
      .argument('<file-path>', 'File path')
      .option('--caption <text>', 'Caption for the document')
      .option('--parse-mode <mode>', 'Caption parse mode: HTML | Markdown | MarkdownV2')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(
        async (
          chat: string,
          filePath: string,
          opts: BotOption & { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' },
        ) => {
          cliOutput(await uploadAction(chat, filePath, opts), opts.pretty)
        },
      ),
  )
