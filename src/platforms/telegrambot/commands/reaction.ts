import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import type { BotReactionType } from '../client'
import type { BotOption } from './shared'
import { getClient, parseChatId } from './shared'

interface ReactionResult {
  success?: boolean
  chat_id?: number | string
  message_id?: number
  emoji?: string
  error?: string
}

export async function setAction(
  chat: string,
  messageId: string,
  emoji: string,
  options: BotOption & { big?: boolean },
): Promise<ReactionResult> {
  try {
    const client = await getClient(options)
    const reaction: BotReactionType[] = [{ type: 'emoji', emoji }]
    await client.setMessageReaction(parseChatId(chat), Number(messageId), reaction, {
      is_big: options.big,
    })
    return { success: true, chat_id: parseChatId(chat), message_id: Number(messageId), emoji }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function clearAction(chat: string, messageId: string, options: BotOption): Promise<ReactionResult> {
  try {
    const client = await getClient(options)
    await client.setMessageReaction(parseChatId(chat), Number(messageId), [])
    return { success: true, chat_id: parseChatId(chat), message_id: Number(messageId) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const reactionCommand = new Command('reaction')
  .description('Reaction commands')
  .addCommand(
    new Command('set')
      .description('Set a reaction on a message (replaces existing)')
      .argument('<chat>', 'Chat ID or @username')
      .argument('<message-id>', 'Message ID')
      .argument('<emoji>', 'Emoji (e.g. 👍)')
      .option('--big', 'Show big animation for the reaction')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (chat: string, messageId: string, emoji: string, opts: BotOption & { big?: boolean }) => {
        cliOutput(await setAction(chat, messageId, emoji, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('clear')
      .description('Clear all reactions from a message')
      .argument('<chat>', 'Chat ID or @username')
      .argument('<message-id>', 'Message ID')
      .option('--bot <id>', 'Use specific bot')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (chat: string, messageId: string, opts: BotOption) => {
        cliOutput(await clearAction(chat, messageId, opts), opts.pretty)
      }),
  )
