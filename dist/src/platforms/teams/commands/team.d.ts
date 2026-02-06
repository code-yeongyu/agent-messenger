import { Command } from 'commander';
export declare function listAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function infoAction(teamId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function switchAction(teamId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare function currentAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function removeAction(teamId: string, options: {
    pretty?: boolean;
}): Promise<void>;
export declare const teamCommand: Command;
//# sourceMappingURL=team.d.ts.map