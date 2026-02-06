import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { TeamsClient } from '../client';
import { TeamsCredentialManager } from '../credential-manager';
export async function listAction(teamId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const channels = await client.listChannels(teamId);
        const output = channels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            team_id: ch.team_id,
        }));
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function infoAction(teamId, channelId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const channel = await client.getChannel(teamId, channelId);
        const output = {
            id: channel.id,
            name: channel.name,
            type: channel.type,
            team_id: channel.team_id,
        };
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export async function historyAction(teamId, channelId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const messages = await client.getMessages(teamId, channelId, options.limit || 50);
        const output = messages.map((msg) => ({
            id: msg.id,
            author: msg.author.displayName,
            content: msg.content,
            timestamp: msg.timestamp,
        }));
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const channelCommand = new Command('channel')
    .description('Channel commands')
    .addCommand(new Command('list')
    .description('List channels in a team')
    .argument('<team-id>', 'Team ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(listAction))
    .addCommand(new Command('info')
    .description('Get channel info')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(infoAction))
    .addCommand(new Command('history')
    .description('Get channel message history')
    .argument('<team-id>', 'Team ID')
    .argument('<channel-id>', 'Channel ID')
    .option('--limit <n>', 'Number of messages to fetch', '50')
    .option('--pretty', 'Pretty print JSON output')
    .action((teamId, channelId, options) => {
    return historyAction(teamId, channelId, {
        limit: parseInt(options.limit, 10),
        pretty: options.pretty,
    });
}));
//# sourceMappingURL=channel.js.map