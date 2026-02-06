import { formatOutput } from '../../../shared/utils/output';
import { SlackBotClient } from '../client';
import { SlackBotCredentialManager } from '../credential-manager';
export async function getClient(options) {
    const credManager = options._credManager ?? new SlackBotCredentialManager();
    const creds = await credManager.getCredentials(options.bot);
    if (!creds) {
        console.log(formatOutput({ error: 'No credentials. Run "auth set <token>" first.' }, options.pretty));
        process.exit(1);
    }
    return new SlackBotClient(creds.token);
}
//# sourceMappingURL=shared.js.map