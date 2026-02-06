import { Command } from 'commander';
export declare function sendAction(teamId: string, channelId: string, content: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function listAction(teamId: string, channelId: string, options: {
    limit?: number;
    pretty?: boolean;
}): Promise<void>;
export declare function getAction(teamId: string, channelId: string, messageId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function deleteAction(teamId: string, channelId: string, messageId: string, options: {
    force?: boolean;
    pretty?: boolean;
}): Promise<void>;
export declare const messageCommand: Command;
//# sourceMappingURL=message.d.ts.map