import { Command } from 'commander';
export declare function addAction(teamId: string, channelId: string, messageId: string, emoji: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function removeAction(teamId: string, channelId: string, messageId: string, emoji: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const reactionCommand: Command;
//# sourceMappingURL=reaction.d.ts.map