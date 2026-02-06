import { z } from 'zod';
export interface SlackBotCredentials {
    token: string;
    workspace_id: string;
    workspace_name: string;
    bot_id: string;
    bot_name: string;
}
export interface SlackBotEntry {
    bot_id: string;
    bot_name: string;
    token: string;
}
export interface SlackBotWorkspace {
    workspace_id: string;
    workspace_name: string;
    bots: Record<string, SlackBotEntry>;
}
export interface SlackBotConfig {
    current: {
        workspace_id: string;
        bot_id: string;
    } | null;
    workspaces: Record<string, SlackBotWorkspace>;
}
export declare class SlackBotError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export interface SlackChannel {
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    created: number;
    creator: string;
    topic?: {
        value: string;
        creator: string;
        last_set: number;
    };
    purpose?: {
        value: string;
        creator: string;
        last_set: number;
    };
}
export interface SlackMessage {
    ts: string;
    text: string;
    user?: string;
    username?: string;
    type: string;
    thread_ts?: string;
    reply_count?: number;
    replies?: Array<{
        user: string;
        ts: string;
    }>;
    edited?: {
        user: string;
        ts: string;
    };
}
export interface SlackUser {
    id: string;
    name: string;
    real_name: string;
    is_admin: boolean;
    is_owner: boolean;
    is_bot: boolean;
    is_app_user: boolean;
    profile?: {
        email?: string;
        phone?: string;
        title?: string;
        status_text?: string;
    };
}
export interface SlackReaction {
    name: string;
    count: number;
    users: string[];
}
export interface SlackFile {
    id: string;
    name: string;
    title: string;
    mimetype: string;
    size: number;
    url_private: string;
    created: number;
    user: string;
    channels?: string[];
}
export declare const SlackBotEntrySchema: z.ZodObject<{
    bot_id: z.ZodString;
    bot_name: z.ZodString;
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    bot_id: string;
    bot_name: string;
}, {
    token: string;
    bot_id: string;
    bot_name: string;
}>;
export declare const SlackBotWorkspaceSchema: z.ZodObject<{
    workspace_id: z.ZodString;
    workspace_name: z.ZodString;
    bots: z.ZodRecord<z.ZodString, z.ZodObject<{
        bot_id: z.ZodString;
        bot_name: z.ZodString;
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
        bot_id: string;
        bot_name: string;
    }, {
        token: string;
        bot_id: string;
        bot_name: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    workspace_id: string;
    workspace_name: string;
    bots: Record<string, {
        token: string;
        bot_id: string;
        bot_name: string;
    }>;
}, {
    workspace_id: string;
    workspace_name: string;
    bots: Record<string, {
        token: string;
        bot_id: string;
        bot_name: string;
    }>;
}>;
export declare const SlackBotCredentialsSchema: z.ZodObject<{
    token: z.ZodString;
    workspace_id: z.ZodString;
    workspace_name: z.ZodString;
    bot_id: z.ZodString;
    bot_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    workspace_id: string;
    workspace_name: string;
    bot_id: string;
    bot_name: string;
}, {
    token: string;
    workspace_id: string;
    workspace_name: string;
    bot_id: string;
    bot_name: string;
}>;
export declare const SlackBotConfigSchema: z.ZodObject<{
    current: z.ZodNullable<z.ZodObject<{
        workspace_id: z.ZodString;
        bot_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        workspace_id: string;
        bot_id: string;
    }, {
        workspace_id: string;
        bot_id: string;
    }>>;
    workspaces: z.ZodRecord<z.ZodString, z.ZodObject<{
        workspace_id: z.ZodString;
        workspace_name: z.ZodString;
        bots: z.ZodRecord<z.ZodString, z.ZodObject<{
            bot_id: z.ZodString;
            bot_name: z.ZodString;
            token: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            token: string;
            bot_id: string;
            bot_name: string;
        }, {
            token: string;
            bot_id: string;
            bot_name: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        workspace_id: string;
        workspace_name: string;
        bots: Record<string, {
            token: string;
            bot_id: string;
            bot_name: string;
        }>;
    }, {
        workspace_id: string;
        workspace_name: string;
        bots: Record<string, {
            token: string;
            bot_id: string;
            bot_name: string;
        }>;
    }>>;
}, "strip", z.ZodTypeAny, {
    current: {
        workspace_id: string;
        bot_id: string;
    } | null;
    workspaces: Record<string, {
        workspace_id: string;
        workspace_name: string;
        bots: Record<string, {
            token: string;
            bot_id: string;
            bot_name: string;
        }>;
    }>;
}, {
    current: {
        workspace_id: string;
        bot_id: string;
    } | null;
    workspaces: Record<string, {
        workspace_id: string;
        workspace_name: string;
        bots: Record<string, {
            token: string;
            bot_id: string;
            bot_name: string;
        }>;
    }>;
}>;
export declare const SlackChannelSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    is_private: z.ZodBoolean;
    is_archived: z.ZodBoolean;
    created: z.ZodNumber;
    creator: z.ZodString;
    topic: z.ZodOptional<z.ZodObject<{
        value: z.ZodString;
        creator: z.ZodString;
        last_set: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: string;
        creator: string;
        last_set: number;
    }, {
        value: string;
        creator: string;
        last_set: number;
    }>>;
    purpose: z.ZodOptional<z.ZodObject<{
        value: z.ZodString;
        creator: z.ZodString;
        last_set: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: string;
        creator: string;
        last_set: number;
    }, {
        value: string;
        creator: string;
        last_set: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    created: number;
    creator: string;
    topic?: {
        value: string;
        creator: string;
        last_set: number;
    } | undefined;
    purpose?: {
        value: string;
        creator: string;
        last_set: number;
    } | undefined;
}, {
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    created: number;
    creator: string;
    topic?: {
        value: string;
        creator: string;
        last_set: number;
    } | undefined;
    purpose?: {
        value: string;
        creator: string;
        last_set: number;
    } | undefined;
}>;
export declare const SlackMessageSchema: z.ZodObject<{
    ts: z.ZodString;
    text: z.ZodString;
    user: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    thread_ts: z.ZodOptional<z.ZodString>;
    reply_count: z.ZodOptional<z.ZodNumber>;
    replies: z.ZodOptional<z.ZodArray<z.ZodObject<{
        user: z.ZodString;
        ts: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: string;
        ts: string;
    }, {
        user: string;
        ts: string;
    }>, "many">>;
    edited: z.ZodOptional<z.ZodObject<{
        user: z.ZodString;
        ts: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: string;
        ts: string;
    }, {
        user: string;
        ts: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    ts: string;
    text: string;
    username?: string | undefined;
    user?: string | undefined;
    thread_ts?: string | undefined;
    reply_count?: number | undefined;
    replies?: {
        user: string;
        ts: string;
    }[] | undefined;
    edited?: {
        user: string;
        ts: string;
    } | undefined;
}, {
    type: string;
    ts: string;
    text: string;
    username?: string | undefined;
    user?: string | undefined;
    thread_ts?: string | undefined;
    reply_count?: number | undefined;
    replies?: {
        user: string;
        ts: string;
    }[] | undefined;
    edited?: {
        user: string;
        ts: string;
    } | undefined;
}>;
export declare const SlackUserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    real_name: z.ZodString;
    is_admin: z.ZodBoolean;
    is_owner: z.ZodBoolean;
    is_bot: z.ZodBoolean;
    is_app_user: z.ZodBoolean;
    profile: z.ZodOptional<z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        status_text: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email?: string | undefined;
        phone?: string | undefined;
        title?: string | undefined;
        status_text?: string | undefined;
    }, {
        email?: string | undefined;
        phone?: string | undefined;
        title?: string | undefined;
        status_text?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    real_name: string;
    is_admin: boolean;
    is_owner: boolean;
    is_bot: boolean;
    is_app_user: boolean;
    profile?: {
        email?: string | undefined;
        phone?: string | undefined;
        title?: string | undefined;
        status_text?: string | undefined;
    } | undefined;
}, {
    id: string;
    name: string;
    real_name: string;
    is_admin: boolean;
    is_owner: boolean;
    is_bot: boolean;
    is_app_user: boolean;
    profile?: {
        email?: string | undefined;
        phone?: string | undefined;
        title?: string | undefined;
        status_text?: string | undefined;
    } | undefined;
}>;
export declare const SlackReactionSchema: z.ZodObject<{
    name: z.ZodString;
    count: z.ZodNumber;
    users: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    count: number;
    users: string[];
}, {
    name: string;
    count: number;
    users: string[];
}>;
export declare const SlackFileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    title: z.ZodString;
    mimetype: z.ZodString;
    size: z.ZodNumber;
    url_private: z.ZodString;
    created: z.ZodNumber;
    user: z.ZodString;
    channels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    size: number;
    user: string;
    created: number;
    title: string;
    mimetype: string;
    url_private: string;
    channels?: string[] | undefined;
}, {
    id: string;
    name: string;
    size: number;
    user: string;
    created: number;
    title: string;
    mimetype: string;
    url_private: string;
    channels?: string[] | undefined;
}>;
//# sourceMappingURL=types.d.ts.map