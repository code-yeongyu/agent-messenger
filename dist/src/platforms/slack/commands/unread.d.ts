import { Command } from 'commander';
export declare function countsAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function threadsAction(channel: string, threadTs: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function markAction(channel: string, ts: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const unreadCommand: Command;
//# sourceMappingURL=unread.d.ts.map