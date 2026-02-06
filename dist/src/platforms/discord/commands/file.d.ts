import { Command } from 'commander';
export declare function uploadAction(channelId: string, path: string, options: {
    filename?: string;
    pretty?: boolean;
}): Promise<void>;
export declare function listAction(channelId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(channelId: string, fileId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const fileCommand: Command;
//# sourceMappingURL=file.d.ts.map