import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { withKakaoClient } from './shared'

async function listAction(
  chatId: string,
  options: {
    account?: string
    pretty?: boolean
  },
): Promise<void> {
  try {
    const members = await withKakaoClient(options, (client) => client.getMembers(chatId))
    console.log(formatOutput(members, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const memberCommand = new Command('member')
  .description('KakaoTalk member commands')
  .addCommand(
    new Command('list')
      .description('List members of a chat room')
      .argument('<chat-id>', 'Chat room ID')
      .option('--account <id>', 'Use a specific KakaoTalk account')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction),
  )
