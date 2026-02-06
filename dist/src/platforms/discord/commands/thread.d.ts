import { Command } from 'commander';
export declare function createAction(channelId: string, name: string, options: {
    autoArchiveDuration?: string;
    pretty?: boolean;
}): Promise<void>;
export declare function archiveAction(threadId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const threadCommand: Command;
//# sourceMappingURL=thread.d.ts.map