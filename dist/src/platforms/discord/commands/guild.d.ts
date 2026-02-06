import { Command } from 'commander';
export declare function listAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(guildId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function switchAction(guildId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function currentAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare const guildCommand: Command;
//# sourceMappingURL=guild.d.ts.map