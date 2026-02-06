/**
 * Core type definitions for Discord platform
 */
import { z } from 'zod';
export interface DiscordGuild {
    id: string;
    name: string;
    icon?: string;
    owner?: boolean;
}
export interface DiscordChannel {
    id: string;
    guild_id: string;
    name: string;
    type: number;
    topic?: string;
    position?: number;
    parent_id?: string;
    thread_metadata?: {
        archived?: boolean;
        auto_archive_duration?: number;
        archive_timestamp?: string;
        locked?: boolean;
    };
}
export interface DiscordMessage {
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    timestamp: string;
    edited_timestamp?: string;
    thread_id?: string;
}
export interface DiscordUser {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
}
export interface DiscordDMChannel {
    id: string;
    type: number;
    last_message_id?: string;
    recipients: DiscordUser[];
    name?: string;
}
export interface DiscordReaction {
    emoji: {
        id?: string;
        name: string;
    };
    count: number;
}
export interface DiscordFile {
    id: string;
    filename: string;
    size: number;
    url: string;
    content_type?: string;
    height?: number;
    width?: number;
}
export interface DiscordMention {
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    timestamp: string;
    mention_everyone: boolean;
    mentions: DiscordUser[];
    guild_id?: string;
}
export interface DiscordUserNote {
    user_id: string;
    note_user_id: string;
    note: string;
}
export interface DiscordSearchResult {
    id: string;
    channel_id: string;
    guild_id?: string;
    content: string;
    author: {
        id: string;
        username: string;
    };
    timestamp: string;
    hit: boolean;
}
export interface DiscordSearchResponse {
    total_results: number;
    messages: DiscordSearchResult[][];
}
export interface DiscordSearchOptions {
    channelId?: string;
    authorId?: string;
    has?: 'file' | 'image' | 'video' | 'embed' | 'link' | 'sticker';
    sortBy?: 'timestamp' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
export interface DiscordRelationship {
    id: string;
    type: number;
    user: DiscordUser;
    nickname?: string;
}
export interface DiscordGuildMember {
    user: DiscordUser;
    nick?: string;
    roles: string[];
    joined_at: string;
    deaf: boolean;
    mute: boolean;
    flags: number;
}
export interface DiscordUserProfile {
    user: DiscordUser & {
        bio?: string;
    };
    connected_accounts: Array<{
        type: string;
        id: string;
        name: string;
        verified: boolean;
    }>;
    premium_since?: string;
    mutual_guilds?: Array<{
        id: string;
        nick?: string;
    }>;
}
export interface DiscordCredentials {
    token: string;
}
export interface DiscordConfig {
    current_server: string | null;
    token: string;
    servers: Record<string, {
        server_id: string;
        server_name: string;
    }>;
}
export declare const DiscordGuildSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    icon?: string | undefined;
    owner?: boolean | undefined;
}, {
    id: string;
    name: string;
    icon?: string | undefined;
    owner?: boolean | undefined;
}>;
export declare const DiscordChannelSchema: z.ZodObject<{
    id: z.ZodString;
    guild_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodNumber;
    topic: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    type: number;
    guild_id: string;
    topic?: string | undefined;
    position?: number | undefined;
}, {
    id: string;
    name: string;
    type: number;
    guild_id: string;
    topic?: string | undefined;
    position?: number | undefined;
}>;
export declare const DiscordMessageSchema: z.ZodObject<{
    id: z.ZodString;
    channel_id: z.ZodString;
    author: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
    }, {
        id: string;
        username: string;
    }>;
    content: z.ZodString;
    timestamp: z.ZodString;
    edited_timestamp: z.ZodOptional<z.ZodString>;
    thread_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    edited_timestamp?: string | undefined;
    thread_id?: string | undefined;
}, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    edited_timestamp?: string | undefined;
    thread_id?: string | undefined;
}>;
export declare const DiscordUserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    global_name: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
    bot: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    username: string;
    global_name?: string | undefined;
    avatar?: string | undefined;
    bot?: boolean | undefined;
}, {
    id: string;
    username: string;
    global_name?: string | undefined;
    avatar?: string | undefined;
    bot?: boolean | undefined;
}>;
export declare const DiscordDMChannelSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNumber;
    last_message_id: z.ZodOptional<z.ZodString>;
    recipients: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        global_name: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodString>;
        bot: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }>, "many">;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: number;
    recipients: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }[];
    name?: string | undefined;
    last_message_id?: string | undefined;
}, {
    id: string;
    type: number;
    recipients: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }[];
    name?: string | undefined;
    last_message_id?: string | undefined;
}>;
export declare const DiscordReactionSchema: z.ZodObject<{
    emoji: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id?: string | undefined;
    }, {
        name: string;
        id?: string | undefined;
    }>;
    count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    emoji: {
        name: string;
        id?: string | undefined;
    };
    count: number;
}, {
    emoji: {
        name: string;
        id?: string | undefined;
    };
    count: number;
}>;
export declare const DiscordFileSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    size: z.ZodNumber;
    url: z.ZodString;
    content_type: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    filename: string;
    size: number;
    url: string;
    content_type?: string | undefined;
    height?: number | undefined;
    width?: number | undefined;
}, {
    id: string;
    filename: string;
    size: number;
    url: string;
    content_type?: string | undefined;
    height?: number | undefined;
    width?: number | undefined;
}>;
export declare const DiscordMentionSchema: z.ZodObject<{
    id: z.ZodString;
    channel_id: z.ZodString;
    author: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
    }, {
        id: string;
        username: string;
    }>;
    content: z.ZodString;
    timestamp: z.ZodString;
    mention_everyone: z.ZodBoolean;
    mentions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        global_name: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodString>;
        bot: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }>, "many">;
    guild_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    mention_everyone: boolean;
    mentions: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }[];
    guild_id?: string | undefined;
}, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    mention_everyone: boolean;
    mentions: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }[];
    guild_id?: string | undefined;
}>;
export declare const DiscordRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNumber;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        global_name: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodString>;
        bot: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }, {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    }>;
    nickname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: number;
    user: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    };
    nickname?: string | undefined;
}, {
    id: string;
    type: number;
    user: {
        id: string;
        username: string;
        global_name?: string | undefined;
        avatar?: string | undefined;
        bot?: boolean | undefined;
    };
    nickname?: string | undefined;
}>;
export declare const DiscordSearchResultSchema: z.ZodObject<{
    id: z.ZodString;
    channel_id: z.ZodString;
    guild_id: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    author: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
    }, {
        id: string;
        username: string;
    }>;
    timestamp: z.ZodString;
    hit: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    hit: boolean;
    guild_id?: string | undefined;
}, {
    timestamp: string;
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
    };
    content: string;
    hit: boolean;
    guild_id?: string | undefined;
}>;
export declare const DiscordSearchResponseSchema: z.ZodObject<{
    total_results: z.ZodNumber;
    messages: z.ZodArray<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        channel_id: z.ZodString;
        guild_id: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        author: z.ZodObject<{
            id: z.ZodString;
            username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            username: string;
        }, {
            id: string;
            username: string;
        }>;
        timestamp: z.ZodString;
        hit: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        id: string;
        channel_id: string;
        author: {
            id: string;
            username: string;
        };
        content: string;
        hit: boolean;
        guild_id?: string | undefined;
    }, {
        timestamp: string;
        id: string;
        channel_id: string;
        author: {
            id: string;
            username: string;
        };
        content: string;
        hit: boolean;
        guild_id?: string | undefined;
    }>, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    total_results: number;
    messages: {
        timestamp: string;
        id: string;
        channel_id: string;
        author: {
            id: string;
            username: string;
        };
        content: string;
        hit: boolean;
        guild_id?: string | undefined;
    }[][];
}, {
    total_results: number;
    messages: {
        timestamp: string;
        id: string;
        channel_id: string;
        author: {
            id: string;
            username: string;
        };
        content: string;
        hit: boolean;
        guild_id?: string | undefined;
    }[][];
}>;
export declare const DiscordCredentialsSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const DiscordConfigSchema: z.ZodObject<{
    current_server: z.ZodNullable<z.ZodString>;
    token: z.ZodString;
    servers: z.ZodRecord<z.ZodString, z.ZodObject<{
        server_id: z.ZodString;
        server_name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        server_id: string;
        server_name: string;
    }, {
        server_id: string;
        server_name: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    token: string;
    current_server: string | null;
    servers: Record<string, {
        server_id: string;
        server_name: string;
    }>;
}, {
    token: string;
    current_server: string | null;
    servers: Record<string, {
        server_id: string;
        server_name: string;
    }>;
}>;
export declare class DiscordError extends Error {
    code: string;
    constructor(message: string, code: string);
}
//# sourceMappingURL=types.d.ts.map