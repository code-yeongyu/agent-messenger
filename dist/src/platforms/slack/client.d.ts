import type { SlackActivityItem, SlackChannel, SlackChannelSection, SlackDraft, SlackFile, SlackMessage, SlackSavedItem, SlackSearchResult, SlackThreadView, SlackUnreadCounts, SlackUser } from './types';
export declare class SlackError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class SlackClient {
    private client;
    constructor(token: string, cookie: string);
    private withRetry;
    private sleep;
    private checkResponse;
    testAuth(): Promise<{
        user_id: string;
        team_id: string;
        user?: string;
        team?: string;
    }>;
    listChannels(): Promise<SlackChannel[]>;
    getChannel(id: string): Promise<SlackChannel>;
    sendMessage(channel: string, text: string, threadTs?: string): Promise<SlackMessage>;
    getMessages(channel: string, limit?: number): Promise<SlackMessage[]>;
    getMessage(channel: string, ts: string): Promise<SlackMessage | null>;
    updateMessage(channel: string, ts: string, text: string): Promise<SlackMessage>;
    deleteMessage(channel: string, ts: string): Promise<void>;
    addReaction(channel: string, ts: string, emoji: string): Promise<void>;
    removeReaction(channel: string, ts: string, emoji: string): Promise<void>;
    listUsers(): Promise<SlackUser[]>;
    getUser(id: string): Promise<SlackUser>;
    uploadFile(channels: string[], file: Buffer, filename: string): Promise<SlackFile>;
    listFiles(channel?: string): Promise<SlackFile[]>;
    searchMessages(query: string, options?: {
        sort?: 'score' | 'timestamp';
        sortDir?: 'asc' | 'desc';
        count?: number;
    }): Promise<SlackSearchResult[]>;
    getThreadReplies(channel: string, threadTs: string, options?: {
        limit?: number;
        oldest?: string;
        latest?: string;
        cursor?: string;
    }): Promise<{
        messages: SlackMessage[];
        has_more: boolean;
        next_cursor?: string;
    }>;
    getUnreadCounts(): Promise<SlackUnreadCounts>;
    getThreadView(channelId: string, ts: string): Promise<SlackThreadView>;
    markRead(channelId: string, ts: string): Promise<void>;
    getActivityFeed(options?: {
        types?: string;
        mode?: string;
        limit?: number;
    }): Promise<SlackActivityItem[]>;
    getSavedItems(cursor?: string): Promise<{
        items: SlackSavedItem[];
        has_more: boolean;
        next_cursor?: string;
    }>;
    getChannelSections(): Promise<SlackChannelSection[]>;
    getDrafts(cursor?: string): Promise<{
        drafts: SlackDraft[];
        next_cursor?: string;
    }>;
}
//# sourceMappingURL=client.d.ts.map