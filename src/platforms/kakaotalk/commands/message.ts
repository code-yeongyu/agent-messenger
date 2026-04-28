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
