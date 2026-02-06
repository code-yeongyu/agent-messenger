import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { TeamsClient } from '../client';
import { TeamsCredentialManager } from '../credential-manager';
async function listAction(teamId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const users = await client.listUsers(teamId);
        const output = users.map((user) => ({
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            userPrincipalName: user.userPrincipalName,
        }));
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function infoAction(userId, options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const user = await client.getUser(userId);
        const output = {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            userPrincipalName: user.userPrincipalName,
        };
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function meAction(options) {
    try {
        const credManager = new TeamsCredentialManager();
        const config = await credManager.loadConfig();
        if (!config?.token) {
            console.log(formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty));
            process.exit(1);
        }
        const client = new TeamsClient(config.token, config.token_expires_at);
        const user = await client.testAuth();
        const output = {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            userPrincipalName: user.userPrincipalName,
        };
        console.log(formatOutput(output, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const userCommand = new Command('user')
    .description('User commands')
    .addCommand(new Command('list')
    .description('List team members')
    .argument('<team-id>', 'Team ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(listAction))
    .addCommand(new Command('info')
    .description('Get user info')
    .argument('<user-id>', 'User ID')
    .option('--pretty', 'Pretty print JSON output')
    .action(infoAction))
    .addCommand(new Command('me')
    .description('Show current authenticated user')
    .option('--pretty', 'Pretty print JSON output')
    .action(meAction));
//# sourceMappingURL=user.js.map