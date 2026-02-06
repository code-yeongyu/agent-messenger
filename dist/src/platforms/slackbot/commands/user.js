import { Command } from 'commander';
import { handleError } from '../../../shared/utils/error-handler';
import { formatOutput } from '../../../shared/utils/output';
import { getClient } from './shared';
async function listAction(options) {
    try {
        const client = await getClient(options);
        const limit = options.limit ? parseInt(options.limit, 10) : undefined;
        const users = await client.listUsers(limit ? { limit } : undefined);
        console.log(formatOutput(users, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
async function infoAction(userId, options) {
    try {
        const client = await getClient(options);
        const user = await client.getUserInfo(userId);
        console.log(formatOutput(user, options.pretty));
    }
    catch (error) {
        handleError(error);
    }
}
export const userCommand = new Command('user')
    .description('User commands')
    .addCommand(new Command('list')
    .description('List users')
    .option('--limit <n>', 'Number of users to fetch')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(listAction))
    .addCommand(new Command('info')
    .description('Get user info')
    .argument('<user>', 'User ID')
    .option('--bot <id>', 'Use specific bot')
    .option('--pretty', 'Pretty print JSON output')
    .action(infoAction));
//# sourceMappingURL=user.js.map