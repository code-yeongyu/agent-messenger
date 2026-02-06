import { type SlackChannel, type SlackMessage, type SlackUser } from './types';
export declare class SlackBotClient {
    private client;
    constructor(token: string);
    private withRetry;
    private sleep;
    private checkResponse;
    testAuth(): Promise<{
        user_id: string;
        team_id: string;
        bot_id?: string;
        user?: string;
        team?: string;
    }>;
    postMessage(channel: string, text: string, options?: {
        thread_ts?: string;
    }): Promise<SlackMessage>;
    getConversationHistory(channel: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<SlackMessage[]>;
    getMessage(channel: string, ts: string): Promise<SlackMessage | null>;
    addReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
    removeReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
    listChannels(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<SlackChannel[]>;
    getChannelInfo(channel: string): Promise<SlackChannel>;
    listUsers(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<SlackUser[]>;
    getUserInfo(userId: string): Promise<SlackUser>;
    updateMessage(channel: string, ts: string, text: string): Promise<SlackMessage>;
    getThreadReplies(channel: string, ts: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<SlackMessage[]>;
    joinChannel(channel: string): Promise<void>;
    deleteMessage(channel: string, ts: string): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map