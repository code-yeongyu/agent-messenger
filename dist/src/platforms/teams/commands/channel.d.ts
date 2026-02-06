import { Command } from 'commander';
export declare function listAction(teamId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(teamId: string, channelId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function historyAction(teamId: string, channelId: string, options: {
    limit?: number;
    pretty?: boolean;
}): Promise<void>;
export declare const channelCommand: Command;
//# sourceMappingURL=channel.d.ts.map