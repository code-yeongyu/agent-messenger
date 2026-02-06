import { Command } from 'commander';
export declare function listAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(serverId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function switchAction(serverId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function currentAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare const serverCommand: Command;
//# sourceMappingURL=server.d.ts.map