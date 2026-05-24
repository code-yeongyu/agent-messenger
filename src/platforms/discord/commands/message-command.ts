import { Command } from 'commander'

import { ackAction, deleteAction, getAction, listAction, replyAction, searchAction, sendAction } from './message'

type ListOptions = {
  readonly limit: string
  readonly pretty?: boolean
}

type SearchOptions = {
  readonly channel?: string
  readonly author?: string
  readonly has?: string
  readonly sort?: string
  readonly sortDir?: string
  readonly limit: string
  readonly offset: string
  readonly pretty?: boolean
}

export const messageCommand = new Command('message')
  .description('Message commands')
  .addCommand(
    new Command('send')
      .description('Send message to channel')
      .argument('<channel-id>', 'Channel ID')
      .argument('<content>', 'Message content')
      .option('--pretty', 'Pretty print JSON output')
      .action(sendAction),
  )
  .addCommand(
    new Command('reply')
      .description('Reply to a message in a channel')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'ID of the message being replied to')
      .argument('<content>', 'Reply content')
      .option('--pretty', 'Pretty print JSON output')
      .action(replyAction),
  )
  .addCommand(
    new Command('list')
      .description('List messages from channel')
      .argument('<channel-id>', 'Channel ID')
      .option('--limit <n>', 'Number of messages to retrieve', '50')
      .option('--pretty', 'Pretty print JSON output')
      .action((channelId: string, options: ListOptions) => {
        listAction(channelId, {
          limit: parseInt(options.limit, 10),
          pretty: options.pretty,
        })
      }),
  )
  .addCommand(
    new Command('get')
      .description('Get a single message by ID')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(getAction),
  )
  .addCommand(
    new Command('delete')
      .description('Delete message')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--force', 'Skip confirmation')
      .option('--pretty', 'Pretty print JSON output')
      .action(deleteAction),
  )
  .addCommand(
    new Command('ack')
      .description('Mark message as read (acknowledge)')
      .argument('<channel-id>', 'Channel ID')
      .argument('<message-id>', 'Message ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(ackAction),
  )
  .addCommand(
    new Command('search')
      .description('Search messages in current server')
      .argument('<query>', 'Search query')
      .option('--channel <id>', 'Filter by channel ID')
      .option('--author <id>', 'Filter by author ID')
      .option('--has <type>', 'Filter by attachment type: file, image, video, embed, link, sticker')
      .option('--sort <type>', 'Sort by: timestamp, relevance (default: timestamp)')
      .option('--sort-dir <dir>', 'Sort direction: asc, desc (default: desc)')
      .option('--limit <n>', 'Number of results (max 25)', '25')
      .option('--offset <n>', 'Offset for pagination', '0')
      .option('--pretty', 'Pretty print JSON output')
      .action((query: string, options: SearchOptions) => {
        searchAction(query, {
          channel: options.channel,
          author: options.author,
          has: options.has,
          sort: options.sort,
          sortDir: options.sortDir,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
          pretty: options.pretty,
        })
      }),
  )
