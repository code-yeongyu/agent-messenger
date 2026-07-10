import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { withKakaoClient } from './shared'

async function listAction(options: {
  account?: string
  all?: boolean
  search?: string
  resolveTitles?: boolean
  pretty?: boolean
}): Promise<void> {
  try {
    const chats = await withKakaoClient(options, (client) =>
      client.getChats({ all: options.all, search: options.search, resolveTitles: options.resolveTitles }),
    )
    console.log(formatOutput(chats, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function leaveAction(
  chatId: string,
  options: {
    account?: string
    pretty?: boolean
  },
): Promise<void> {
  try {
    const result = await withKakaoClient(options, (client) => client.leaveChat(chatId))
    console.log(formatOutput(result, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const chatCommand = new Command('chat')
  .description('KakaoTalk chat commands')
  .addCommand(
    new Command('list')
      .description('List chat rooms')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--all', 'Fetch all chats (paginate beyond login snapshot)')
      .option('--search <name>', 'Search for a chat by display name')
      .option('--resolve-titles', 'Fetch user-set room titles via CHATINFO (slower; one extra LOCO call per chat)')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
  .addCommand(
    new Command('leave')
      .description('Leave a chat room')
      .argument('<chat-id>', 'Chat room ID')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--pretty', 'Pretty print JSON output')
      .action(leaveAction),
  )
