/**
 * Core type definitions for Discord platform
 */

import { z } from 'zod'

export interface DiscordGuild {
  id: string
  name: string
  icon?: string
  owner?: boolean
}

export interface DiscordChannel {
  id: string
  guild_id: string
  name: string
  type: number
  topic?: string
  position?: number
  parent_id?: string
  thread_metadata?: {
    archived?: boolean
    auto_archive_duration?: number
    archive_timestamp?: string
    locked?: boolean
  }
}

export interface DiscordMessage {
  id: string
  channel_id: string
  author: {
    id: string
    username: string
  }
  content: string
  timestamp: string
  edited_timestamp?: string
  thread_id?: string
  embeds?: DiscordEmbed[]
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbedFooter {
  text: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedAuthor {
  name: string
  url?: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedImage {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  timestamp?: string
  color?: number
  footer?: DiscordEmbedFooter
  image?: DiscordEmbedImage
  thumbnail?: DiscordEmbedImage
  author?: DiscordEmbedAuthor
  fields?: DiscordEmbedField[]
}

export interface DiscordMessageSearchResponse {
  total_results: number
  messages: DiscordMessage[][]
}

export interface DiscordUser {
  id: string
  username: string
  global_name?: string
  avatar?: string
  bot?: boolean
}

export interface DiscordDMChannel {
  id: string
  type: number // 1=DM, 3=Group DM
  last_message_id?: string
  recipients: DiscordUser[]
  name?: string // Only for group DMs
}

export interface DiscordReaction {
  emoji: {
    id?: string
    name: string
  }
  count: number
}

export interface DiscordFile {
  id: string
  filename: string
  size: number
  url: string
  content_type?: string
  height?: number
  width?: number
}

export interface DiscordMention {
  id: string
  channel_id: string
  author: { id: string; username: string }
  content: string
  timestamp: string
  mention_everyone: boolean
  mentions: DiscordUser[]
  guild_id?: string
}

export interface DiscordUserNote {
  user_id: string
  note_user_id: string
  note: string
}

export interface DiscordSearchResult {
  id: string
  channel_id: string
  guild_id?: string
  content: string
  author: {
    id: string
    username: string
  }
  timestamp: string
  hit: boolean
}

export interface DiscordSearchResponse {
  total_results: number
  messages: DiscordSearchResult[][]
}

export interface DiscordSearchOptions {
  channelId?: string
  authorId?: string
  has?: 'file' | 'image' | 'video' | 'embed' | 'link' | 'sticker'
  sortBy?: 'timestamp' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface DiscordRelationship {
  id: string
  type: number
  user: DiscordUser
  nickname?: string
}

export interface DiscordGuildMember {
  user: DiscordUser
  nick?: string
  roles: string[]
  joined_at: string
  deaf: boolean
  mute: boolean
  flags: number
}

export interface DiscordUserProfile {
  user: DiscordUser & { bio?: string }
  connected_accounts: Array<{
    type: string
    id: string
    name: string
    verified: boolean
  }>
  premium_since?: string
  mutual_guilds?: Array<{ id: string; nick?: string }>
}

export interface DiscordCredentials {
  token: string
}

export interface DiscordConfig {
  current_server: string | null
  token: string
  servers: Record<
    string,
    {
      server_id: string
      server_name: string
    }
  >
}

// Zod validation schemas
export const DiscordGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  owner: z.boolean().optional(),
})

export const DiscordChannelSchema = z.object({
  id: z.string(),
  guild_id: z.string(),
  name: z.string(),
  type: z.number(),
  topic: z.string().optional(),
  position: z.number().optional(),
  parent_id: z.string().optional(),
})

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
  embeds: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        timestamp: z.string().optional(),
        color: z.number().optional(),
        footer: z
          .object({
            text: z.string(),
            icon_url: z.string().optional(),
            proxy_icon_url: z.string().optional(),
          })
          .optional(),
        image: z
          .object({
            url: z.string().optional(),
            proxy_url: z.string().optional(),
            height: z.number().optional(),
            width: z.number().optional(),
          })
          .optional(),
        thumbnail: z
          .object({
            url: z.string().optional(),
            proxy_url: z.string().optional(),
            height: z.number().optional(),
            width: z.number().optional(),
          })
          .optional(),
        author: z
          .object({
            name: z.string(),
            url: z.string().optional(),
            icon_url: z.string().optional(),
            proxy_icon_url: z.string().optional(),
          })
          .optional(),
        fields: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
              inline: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
})

export const DiscordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().optional(),
  avatar: z.string().optional(),
  bot: z.boolean().optional(),
})

export const DiscordDMChannelSchema = z.object({
  id: z.string(),
  type: z.number(),
  last_message_id: z.string().optional(),
  recipients: z.array(DiscordUserSchema),
  name: z.string().optional(),
})

export const DiscordReactionSchema = z.object({
  emoji: z.object({
    id: z.string().optional(),
    name: z.string(),
  }),
  count: z.number(),
})

export const DiscordFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  url: z.string(),
  content_type: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
})

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
})

export const DiscordRelationshipSchema = z.object({
  id: z.string(),
  type: z.number(),
  user: DiscordUserSchema,
  nickname: z.string().optional(),
})

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
})

export const DiscordSearchResponseSchema = z.object({
  total_results: z.number(),
  messages: z.array(z.array(DiscordSearchResultSchema)),
})

export const DiscordCredentialsSchema = z.object({
  token: z.string(),
})

export const DiscordConfigSchema = z.object({
  current_server: z.string().nullable(),
  token: z.string(),
  servers: z.record(
    z.string(),
    z.object({
      server_id: z.string(),
      server_name: z.string(),
    })
  ),
})

// DM Channel from /users/@me/channels
export interface DiscordDMChannel {
  id: string
  type: 1 | 3 // 1=DM, 3=Group DM
  last_message_id?: string
  recipients: DiscordUser[]
  name?: string // For group DMs only
}

// Mention from /users/@me/mentions
export interface DiscordMention {
  id: string
  channel_id: string
  guild_id?: string
  author: {
    id: string
    username: string
    global_name?: string
    avatar?: string
  }
  content: string
  timestamp: string
  mention_everyone: boolean
  mentions: DiscordUser[]
}

// Read state from /users/@me/read-states
export interface DiscordReadState {
  id: string // channel_id
  last_message_id?: string
  mention_count: number
}

// Relationship (friend) from /users/@me/relationships
export interface DiscordRelationship {
  id: string
  type: 1 | 2 | 3 | 4 // 1=Friend, 2=Blocked, 3=Incoming, 4=Outgoing
  user: DiscordUser
}

// User note from /users/@me/notes/{user_id}
export interface DiscordUserNote {
  user_id: string
  note_user_id: string
  note: string
}

// Guild member from /guilds/{id}/members/search
export interface DiscordGuildMember {
  user: DiscordUser
  nick?: string
  roles: string[]
  joined_at: string
  deaf: boolean
  mute: boolean
  flags: number
  pending?: boolean
  avatar?: string
}

// User profile from /users/{id}/profile
export interface DiscordUserProfile {
  user: DiscordUser & { bio?: string }
  connected_accounts: Array<{
    type: string
    id: string
    name: string
    verified: boolean
  }>
  premium_since?: string
  mutual_guilds?: Array<{
    id: string
    nick?: string
  }>
  premium_type?: number
  premium_guild_since?: string
}

export class DiscordError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'DiscordError'
    this.code = code
  }
}
