import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { TeamsClient } from '../client';
import { TeamsCredentialManager } from '../credential-manager';
export async function sendAction(teamId, channelId, content, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const message = await client.sendMessage(teamId, channelId, content);
        const output = {
            id: message.id,
            content: message.content,
            author: message.author.displayName,
            timestamp: message.timestamp,
        };
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function listAction(teamId, channelId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const limit = options.limit || 50;
        const messages = await client.getMessages(teamId, channelId, limit);
        const output = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            author: msg.author.displayName,
            timestamp: msg.timestamp,
        }));
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function getAction(teamId, channelId, messageId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const message = await client.getMessage(teamId, channelId, messageId);
        if (!message) {
            console.log(formatOutput({ error: `Message not found: ${messageId}` }, options.pretty));
            process.exit(1);
        }
        const output = {
            id: message.id,
            content: message.content,
            author: message.author.displayName,
            timestamp: message.timestamp,
        };
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function deleteAction(teamId, channelId, messageId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        if (!options.force) {
            console.log(formatOutput({ warning: 'Use --force to confirm deletion', messageId }, options.pretty));
            process.exit(0);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        await client.deleteMessage(teamId, channelId, messageId);
        console.log(formatOutput({ deleted: messageId }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const messageCommand = new Command('message')
    .description('Message commands')
    .addCommand(new Command('send')
    .description('Send message to channel')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .argument('<content>', 'Message content')
    .option('--pretty', 'Pretty print JSON output')
    .action(sendAction))
    .addCommand(new Command('list')
    .description('List messages from channel')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .option('--limit <n>', 'Number of messages to retrieve', '50')
    .option('--pretty', 'Pretty print JSON output')
    .action((teamId, channelId, options) => {
    return listAction(teamId, channelId, {
        limit: parseInt(options.limit, 10),
        pretty: options.pretty,
    });
}))
    .addCommand(new Command('get')
    .description('Get a single message by ID')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .argument('<message-id>', 'Message ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(getAction))
    .addCommand(new Command('delete')
    .description('Delete message')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .argument('<message-id>', 'Message ID')
    .option('--force', 'Skip confirmation')
    .option('--pretty', 'Pretty print JSON output')
    .action(deleteAction));
//# sourceMappingURL=message.js.map