import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { getClient } from './shared';
async function sendAction(channel, text, options) {
    try {
        const client = await getClient(options);
        const result = await client.postMessage(channel, text, {
            thread_ts: options.thread,
        });
        console.log(formatOutput({
            ts: result.ts,
            channel,
            text: result.text,
            thread_ts: result.thread_ts,
        }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function listAction(channel, options) {
    try {
        const client = await getClient(options);
        const limit = options.limit ? parseInt(options.limit, 10) : 20;
        const messages = await client.getConversationHistory(channel, { limit });
        console.log(formatOutput(messages, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function getAction(channel, ts, options) {
    try {
        const client = await getClient(options);
        const message = await client.getMessage(channel, ts);
        if (!message) {
            console.log(formatOutput({ error: 'Message not found' }, options.pretty));
            process.exit(1);
        }
        console.log(formatOutput(message, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function updateAction(channel, ts, text, options) {
    try {
        const client = await getClient(options);
        const message = await client.updateMessage(channel, ts, text);
        console.log(formatOutput({
            ts: message.ts,
            text: message.text,
            type: message.type,
            user: message.user,
        }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function deleteAction(channel, ts, options) {
    try {
        if (!options.force) {
            console.log(formatOutput({ warning: 'Use --force to confirm deletion', ts }, options.pretty));
            process.exit(1);
        }
        const client = await getClient(options);
        await client.deleteMessage(channel, ts);
        console.log(formatOutput({ deleted: ts }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function repliesAction(channel, threadTs, options) {
    try {
        const client = await getClient(options);
        const limit = options.limit ? parseInt(options.limit, 10) : 100;
        const messages = await client.getThreadReplies(channel, threadTs, { limit });
        console.log(formatOutput(messages, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const messageCommand = new Command('message')
    .description('Message commands')
    .addCommand(new Command('send')
    .description('Send a message to a channel')
    .argument('<channel>', 'Channel ID')
    .argument('<text>', 'Message text')
    .option('--thread <ts>', 'Thread timestamp for replies')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(sendAction))
    .addCommand(new Command('list')
    .description('List messages in a channel')
    .argument('<channel>', 'Channel ID')
    .option('--limit <n>', 'Number of messages to fetch', '20')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(listAction))
    .addCommand(new Command('get')
    .description('Get a single message')
    .argument('<channel>', 'Channel ID')
    .argument('<ts>', 'Message timestamp')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(getAction))
    .addCommand(new Command('update')
    .description('Update a message')
    .argument('<channel>', 'Channel ID')
    .argument('<ts>', 'Message timestamp')
    .argument('<text>', 'New message text')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(updateAction))
    .addCommand(new Command('delete')
    .description('Delete a message')
    .argument('<channel>', 'Channel ID')
    .argument('<ts>', 'Message timestamp')
    .option('--force', 'Skip confirmation')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(deleteAction))
    .addCommand(new Command('replies')
    .description('Get thread replies')
    .argument('<channel>', 'Channel ID')
    .argument('<thread_ts>', 'Thread timestamp')
    .option('--limit <n>', 'Number of replies to fetch', '100')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(repliesAction));
//# sourceMappingURL=message.js.map