import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { DiscordClient } from '../client';
import { DiscordCredentialManager } from '../credential-manager';
export async function addAction(channelId, messageId, emoji, options) {
    try {
        const credManager = new DiscordCredentialManager();
        const config = await credManager.load();
        if (!config.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new DiscordClient(config.token);
        await client.addReaction(channelId, messageId, emoji);
        console.log(formatOutput({
            success: true,
            channel_id: channelId,
            message_id: messageId,
            emoji,
        }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function removeAction(channelId, messageId, emoji, options) {
    try {
        const credManager = new DiscordCredentialManager();
        const config = await credManager.load();
        if (!config.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new DiscordClient(config.token);
        await client.removeReaction(channelId, messageId, emoji);
        console.log(formatOutput({
            success: true,
            channel_id: channelId,
            message_id: messageId,
            emoji,
        }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function listAction(channelId, messageId, options) {
    try {
        const credManager = new DiscordCredentialManager();
        const config = await credManager.load();
        if (!config.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new DiscordClient(config.token);
        const message = await client.getMessage(channelId, messageId);
        if (!message) {
            console.log(formatOutput({
                error: 'Message not found',
                channel_id: channelId,
                message_id: messageId,
            }, options.pretty));
            process.exit(1);
        }
        const reactions = message.reactions || [];
        console.log(formatOutput({
            channel_id: channelId,
            message_id: messageId,
            reactions,
        }, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const reactionCommand = new Command('reaction')
    .description('Reaction commands')
    .addCommand(new Command('add')
    .description('Add emoji reaction to message')
    .argument('<channel-id>', 'Channel ID')
    .argument('<message-id>', 'Message ID')
    .argument('<emoji>', 'Emoji name (without colons)')
    .option('--pretty', 'Pretty print JSON output')
    .action(addAction))
    .addCommand(new Command('remove')
    .description('Remove emoji reaction from message')
    .argument('<channel-id>', 'Channel ID')
    .argument('<message-id>', 'Message ID')
    .argument('<emoji>', 'Emoji name (without colons)')
    .option('--pretty', 'Pretty print JSON output')
    .action(removeAction))
    .addCommand(new Command('list')
    .description('List reactions on a message')
    .argument('<channel-id>', 'Channel ID')
    .argument('<message-id>', 'Message ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(listAction));
//# sourceMappingURL=reaction.js.map