import { Command } from 'commander';
export declare function snapshotAction(options: {
    channelsOnly?: boolean;
    usersOnly?: boolean;
    limit?: number;
    teamId?: string;
    pretty?: boolean;
}): Promise<void>;
export declare const snapshotCommand: Command;
//# sourceMappingURL=snapshot.d.ts.map