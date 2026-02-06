import { Command } from 'commander';
export declare function uploadAction(teamId: string, channelId: string, path: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function listAction(teamId: string, channelId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(teamId: string, channelId: string, fileId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const fileCommand: Command;
//# sourceMappingURL=file.d.ts.map