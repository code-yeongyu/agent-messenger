import { Command } from 'commander';
export declare function listAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(channelId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function historyAction(channelId: string, options: {
    limit?: number;
    pretty?: boolean;
}): Promise<void>;
export declare const channelCommand: Command;
//# sourceMappingURL=channel.d.ts.map