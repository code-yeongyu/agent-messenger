import type { DiscordChannel, DiscordDMChannel, DiscordFile, DiscordGuild, DiscordGuildMember, DiscordMention, DiscordMessage, DiscordRelationship, DiscordSearchOptions, DiscordSearchResult, DiscordUser, DiscordUserNote, DiscordUserProfile } from './types';
export declare class DiscordError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class DiscordClient {
    private token;
    private buckets;
    private globalRateLimitUntil;
    constructor(token: string);
    private getBucketKey;
    private waitForRateLimit;
    private updateBucket;
    private handleRateLimitResponse;
    private sleep;
    private request;
    private requestFormData;
    testAuth(): Promise<DiscordUser>;
    listServers(): Promise<DiscordGuild[]>;
    getServer(serverId: string): Promise<DiscordGuild>;
    listChannels(serverId: string): Promise<DiscordChannel[]>;
    getChannel(channelId: string): Promise<DiscordChannel>;
    sendMessage(channelId: string, content: string): Promise<DiscordMessage>;
    getMessages(channelId: string, limit?: number): Promise<DiscordMessage[]>;
    getMessage(channelId: string, messageId: string): Promise<DiscordMessage>;
    deleteMessage(channelId: string, messageId: string): Promise<void>;
    addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
    removeReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
    ackMessage(channelId: string, messageId: string): Promise<void>;
    listUsers(serverId: string): Promise<DiscordUser[]>;
    getUser(userId: string): Promise<DiscordUser>;
    uploadFile(channelId: string, filePath: string): Promise<DiscordFile>;
    listFiles(channelId: string): Promise<DiscordFile[]>;
    listDMChannels(): Promise<DiscordDMChannel[]>;
    createDM(userId: string): Promise<DiscordDMChannel>;
    getMentions(options?: {
        limit?: number;
        guildId?: string;
    }): Promise<DiscordMention[]>;
    getUserNote(userId: string): Promise<DiscordUserNote | null>;
    setUserNote(userId: string, note: string): Promise<DiscordUserNote>;
    getRelationships(): Promise<DiscordRelationship[]>;
    searchMembers(guildId: string, query: string, limit?: number): Promise<DiscordGuildMember[]>;
    searchMessages(guildId: string, query: string, options?: DiscordSearchOptions): Promise<{
        results: DiscordSearchResult[];
        total: number;
    }>;
    getUserProfile(userId: string): Promise<DiscordUserProfile>;
    createThread(channelId: string, name: string, options?: {
        auto_archive_duration?: number;
        rate_limit_per_user?: number;
    }): Promise<DiscordChannel>;
    archiveThread(threadId: string, archived?: boolean): Promise<DiscordChannel>;
}
//# sourceMappingURL=client.d.ts.map