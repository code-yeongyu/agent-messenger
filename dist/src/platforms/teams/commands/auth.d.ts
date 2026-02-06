import { Command } from 'commander';
export declare function extractAction(options: {
    pretty?: boolean;
    debug?: boolean;
    token?: string;
}): Promise<void>;
export declare function logoutAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare function statusAction(options: {
    pretty?: boolean;
}): Promise<void>;
export declare const authCommand: Command;
//# sourceMappingURL=auth.d.ts.map