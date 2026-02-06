import type { TeamsChannel, TeamsFile, TeamsMessage, TeamsTeam, TeamsUser } from './types';
export declare class TeamsClient {
    private token;
    private tokenExpiresAt?;
    private buckets;
    private globalRateLimitUntil;
    constructor(token: string, tokenExpiresAt?: string);
    private isTokenExpired;
    private getBucketKey;
    private waitForRateLimit;
    private updateBucket;
    private handleRateLimitResponse;
    private sleep;
    private request;
    private requestFormData;
    testAuth(): Promise<TeamsUser>;
    listTeams(): Promise<TeamsTeam[]>;
    getTeam(teamId: string): Promise<TeamsTeam>;
    listChannels(teamId: string): Promise<TeamsChannel[]>;
    getChannel(teamId: string, channelId: string): Promise<TeamsChannel>;
    sendMessage(teamId: string, channelId: string, content: string): Promise<TeamsMessage>;
    getMessages(teamId: string, channelId: string, limit?: number): Promise<TeamsMessage[]>;
    getMessage(teamId: string, channelId: string, messageId: string): Promise<TeamsMessage>;
    deleteMessage(teamId: string, channelId: string, messageId: string): Promise<void>;
    addReaction(teamId: string, channelId: string, messageId: string, emoji: string): Promise<void>;
    removeReaction(teamId: string, channelId: string, messageId: string, emoji: string): Promise<void>;
    listUsers(teamId: string): Promise<TeamsUser[]>;
    getUser(userId: string): Promise<TeamsUser>;
    uploadFile(teamId: string, channelId: string, filePath: string): Promise<TeamsFile>;
    listFiles(teamId: string, channelId: string): Promise<TeamsFile[]>;
}
//# sourceMappingURL=client.d.ts.map