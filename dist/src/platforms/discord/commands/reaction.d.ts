import { Command } from 'commander';
export declare function addAction(channelId: string, messageId: string, emoji: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function removeAction(channelId: string, messageId: string, emoji: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function listAction(channelId: string, messageId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const reactionCommand: Command;
//# sourceMappingURL=reaction.d.ts.map