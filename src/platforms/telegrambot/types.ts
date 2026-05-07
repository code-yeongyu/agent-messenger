import { z } from 'zod'

export interface TelegramBotEntry {
  bot_id: string
  bot_name: string
  token: string
}

export interface TelegramBotConfig {
  current: { bot_id: string } | null
  bots: Record<string, TelegramBotEntry>
}

export interface TelegramBotCredentials {
  token: string
  bot_id: string
  bot_name: string
}

export class TelegramBotError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'TelegramBotError'
    this.code = code
  }
}

export interface TelegramBotUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
  is_forum?: boolean
}

export interface TelegramChatFullInfo extends TelegramChat {
  bio?: string
  description?: string
  invite_link?: string
  pinned_message?: TelegramMessage
  permissions?: Record<string, boolean>
  member_count?: number
}

export interface TelegramChatMember {
  user: TelegramBotUser
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
  is_anonymous?: boolean
  custom_title?: string
  until_date?: number
}

export interface TelegramMessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: TelegramBotUser
  language?: string
  custom_emoji_id?: string
}

export interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TelegramDocument {
  file_id: string
  file_unique_id: string
  thumbnail?: TelegramPhotoSize
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramMessage {
  message_id: number
  message_thread_id?: number
  date: number
  chat: TelegramChat
  from?: TelegramBotUser
  sender_chat?: TelegramChat
  text?: string
  caption?: string
  entities?: TelegramMessageEntity[]
  caption_entities?: TelegramMessageEntity[]
  reply_to_message?: TelegramMessage
  edit_date?: number
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  is_topic_message?: boolean
}

export interface TelegramReactionType {
  type: 'emoji' | 'custom_emoji' | 'paid'
  emoji?: string
  custom_emoji_id?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramBotUser
  message?: TelegramMessage
  inline_message_id?: string
  chat_instance: string
  data?: string
  game_short_name?: string
}

export interface TelegramInlineQuery {
  id: string
  from: TelegramBotUser
  query: string
  offset: string
  chat_type?: string
}

export interface TelegramChatMemberUpdated {
  chat: TelegramChat
  from: TelegramBotUser
  date: number
  old_chat_member: TelegramChatMember
  new_chat_member: TelegramChatMember
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
  edited_channel_post?: TelegramMessage
  inline_query?: TelegramInlineQuery
  chosen_inline_result?: Record<string, unknown>
  callback_query?: TelegramCallbackQuery
  shipping_query?: Record<string, unknown>
  pre_checkout_query?: Record<string, unknown>
  poll?: Record<string, unknown>
  poll_answer?: Record<string, unknown>
  my_chat_member?: TelegramChatMemberUpdated
  chat_member?: TelegramChatMemberUpdated
  chat_join_request?: Record<string, unknown>
  message_reaction?: Record<string, unknown>
  message_reaction_count?: Record<string, unknown>
}

export const TelegramBotEntrySchema = z.object({
  bot_id: z.string(),
  bot_name: z.string(),
  token: z.string(),
})

export const TelegramBotConfigSchema = z.object({
  current: z
    .object({
      bot_id: z.string(),
    })
    .nullable(),
  bots: z.record(z.string(), TelegramBotEntrySchema),
})

export const TelegramBotCredentialsSchema = z.object({
  token: z.string(),
  bot_id: z.string(),
  bot_name: z.string(),
})

export const TelegramBotUserSchema = z
  .object({
    id: z.number(),
    is_bot: z.boolean(),
    first_name: z.string(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    language_code: z.string().optional(),
    is_premium: z.boolean().optional(),
    can_join_groups: z.boolean().optional(),
    can_read_all_group_messages: z.boolean().optional(),
    supports_inline_queries: z.boolean().optional(),
  })
  .passthrough()

export const TelegramChatSchema = z
  .object({
    id: z.number(),
    type: z.enum(['private', 'group', 'supergroup', 'channel']),
    title: z.string().optional(),
    username: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    is_forum: z.boolean().optional(),
  })
  .passthrough()

export const TelegramMessageEntitySchema = z.object({
  type: z.string(),
  offset: z.number(),
  length: z.number(),
  url: z.string().optional(),
  user: TelegramBotUserSchema.optional(),
  language: z.string().optional(),
  custom_emoji_id: z.string().optional(),
})

export const TelegramPhotoSizeSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number(),
  height: z.number(),
  file_size: z.number().optional(),
})

export const TelegramDocumentSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  thumbnail: TelegramPhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
})

export const TelegramMessageSchema = z
  .object({
    message_id: z.number(),
    message_thread_id: z.number().optional(),
    date: z.number(),
    chat: TelegramChatSchema,
    from: TelegramBotUserSchema.optional(),
    sender_chat: TelegramChatSchema.optional(),
    text: z.string().optional(),
    caption: z.string().optional(),
    entities: z.array(TelegramMessageEntitySchema).optional(),
    caption_entities: z.array(TelegramMessageEntitySchema).optional(),
    reply_to_message: z.lazy(() => TelegramMessageSchema).optional(),
    edit_date: z.number().optional(),
    photo: z.array(TelegramPhotoSizeSchema).optional(),
    document: TelegramDocumentSchema.optional(),
    is_topic_message: z.boolean().optional(),
  })
  .passthrough() as z.ZodType<TelegramMessage>

export interface TelegramBotListenerOptions {
  timeoutSeconds?: number
  limit?: number
  allowedUpdates?: string[]
  dropPendingUpdates?: boolean
}

export interface TelegramBotListenerEventMap {
  message: [event: TelegramMessage]
  edited_message: [event: TelegramMessage]
  channel_post: [event: TelegramMessage]
  edited_channel_post: [event: TelegramMessage]
  callback_query: [event: TelegramCallbackQuery]
  inline_query: [event: TelegramInlineQuery]
  my_chat_member: [event: TelegramChatMemberUpdated]
  chat_member: [event: TelegramChatMemberUpdated]
  telegram_update: [event: TelegramUpdate]
  connected: [info: { user: TelegramBotUser }]
  disconnected: []
  error: [error: Error]
}
