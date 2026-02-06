import { Command } from 'commander';
import { SlackBotCredentialManager } from '../credential-manager';
interface ActionOptions {
    pretty?: boolean;
    bot?: string;
    name?: string;
    _credManager?: SlackBotCredentialManager;
}
interface ActionResult {
    success?: boolean;
    error?: string;
    workspace_id?: string;
    workspace_name?: string;
    bot_id?: string;
    bot_name?: string;
    user?: string;
    team?: string;
    valid?: boolean;
    bots?: Array<{
        workspace_id: string;
        workspace_name: string;
        bot_id: string;
        bot_name: string;
        is_current: boolean;
    }>;
}
export declare function setAction(token: string, options: ActionOptions): Promise<ActionResult>;
export declare function clearAction(options: ActionOptions): Promise<ActionResult>;
export declare function statusAction(options: ActionOptions): Promise<ActionResult>;
export declare function listAction(options: ActionOptions): Promise<ActionResult>;
export declare function useAction(botId: string, options: ActionOptions): Promise<ActionResult>;
export declare function removeAction(botId: string, options: ActionOptions): Promise<ActionResult>;
export declare const authCommand: Command;
export {};
//# sourceMappingURL=auth.d.ts.map