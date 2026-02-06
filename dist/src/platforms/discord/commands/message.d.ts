import { Command } from 'commander';
export declare function sendAction(channelId: string, content: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function listAction(channelId: string, options: {
    limit?: number;
    pretty?: boolean;
}): Promise<void>;
export declare function getAction(channelId: string, messageId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function deleteAction(channelId: string, messageId: string, options: {
    force?: boolean;
    pretty?: boolean;
}): Promise<void>;
export declare function ackAction(channelId: string, messageId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function searchAction(query: string, options: {
    channel?: string;
    author?: string;
    has?: string;
    sort?: string;
    sortDir?: string;
    limit?: number;
    offset?: number;
    pretty?: boolean;
}): Promise<void>;
export declare const messageCommand: Command;
//# sourceMappingURL=message.d.ts.map