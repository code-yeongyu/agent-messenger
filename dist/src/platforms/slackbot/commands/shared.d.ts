import { SlackBotClient } from '../client';
import { SlackBotCredentialManager } from '../credential-manager';
export interface BotOption {
    bot?: string;
    pretty?: boolean;
    _credManager?: SlackBotCredentialManager;
}
export declare function getClient(options: BotOption): Promise<SlackBotClient>;
//# sourceMappingURL=shared.d.ts.map