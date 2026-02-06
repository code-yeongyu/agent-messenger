/**
 * Core type definitions for Discord platform
 */
import { z } from 'zod';
// Zod validation schemas
export const DiscordGuildSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
    owner: z.boolean().optional(),
});
export const DiscordChannelSchema = z.object({
    id: z.string(),
    guild_id: z.string(),
    name: z.string(),
    type: z.number(),
    topic: z.string().optional(),
    position: z.number().optional(),
});
export const DiscordMessageSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    author: z.object({
        id: z.string(),
        username: z.string(),
    }),
    content: z.string(),
    timestamp: z.string(),
    edited_timestamp: z.string().optional(),
    thread_id: z.string().optional(),
});
export const DiscordUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().optional(),
    avatar: z.string().optional(),
    bot: z.boolean().optional(),
});
export const DiscordDMChannelSchema = z.object({
    id: z.string(),
    type: z.number(),
    last_message_id: z.string().optional(),
    recipients: z.array(DiscordUserSchema),
    name: z.string().optional(),
});
export const DiscordReactionSchema = z.object({
    emoji: z.object({
        id: z.string().optional(),
        name: z.string(),
    }),
    count: z.number(),
});
export const DiscordFileSchema = z.object({
    id: z.string(),
    filename: z.string(),
    size: z.number(),
    url: z.string(),
    content_type: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
});
export const DiscordMentionSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    author: z.object({
        id: z.string(),
        username: z.string(),
    }),
    content: z.string(),
    timestamp: z.string(),
    mention_everyone: z.boolean(),
    mentions: z.array(DiscordUserSchema),
    guild_id: z.string().optional(),
});
export const DiscordRelationshipSchema = z.object({
    id: z.string(),
    type: z.number(),
    user: DiscordUserSchema,
    nickname: z.string().optional(),
});
export const DiscordSearchResultSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    guild_id: z.string().optional(),
    content: z.string(),
    author: z.object({
        id: z.string(),
        username: z.string(),
    }),
    timestamp: z.string(),
    hit: z.boolean(),
});
export const DiscordSearchResponseSchema = z.object({
    total_results: z.number(),
    messages: z.array(z.array(DiscordSearchResultSchema)),
});
export const DiscordCredentialsSchema = z.object({
    token: z.string(),
});
export const DiscordConfigSchema = z.object({
    current_server: z.string().nullable(),
    token: z.string(),
    servers: z.record(z.string(), z.object({
        server_id: z.string(),
        server_name: z.string(),
    })),
});
export class DiscordError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'DiscordError';
        this.code = code;
    }
}
//# sourceMappingURL=types.js.map