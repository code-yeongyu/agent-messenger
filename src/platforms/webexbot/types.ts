import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  HandlerStatus,
  MembershipActivity,
  RoomActivity,
} from 'webex-message-handler'
import { z } from 'zod'

export interface WebexBotEntry {
  bot_id: string
  bot_name: string
  token: string
}

export interface WebexBotConfig {
  current: { bot_id: string } | null
  bots: Record<string, WebexBotEntry>
}

export interface WebexBotCredentials {
  token: string
  bot_id: string
  bot_name: string
}

export class WebexBotError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'WebexBotError'
    this.code = code
  }
}

export const WebexBotEntrySchema = z.object({
  bot_id: z.string(),
  bot_name: z.string(),
  token: z.string(),
})

export const WebexBotConfigSchema = z.object({
  current: z
    .object({
      bot_id: z.string(),
    })
    .nullable(),
  bots: z.record(z.string(), WebexBotEntrySchema),
})

export const WebexBotCredentialsSchema = z.object({
  token: z.string(),
  bot_id: z.string(),
  bot_name: z.string(),
})

export interface WebexBotListenerEventMap {
  message_created: [event: DecryptedMessage]
  message_updated: [event: DecryptedMessage]
  message_deleted: [event: DeletedMessage]
  membership_created: [event: MembershipActivity]
  attachment_action: [event: AttachmentAction]
  room_created: [event: RoomActivity]
  room_updated: [event: RoomActivity]
  webex_event: [event: DecryptedMessage | DeletedMessage | MembershipActivity | AttachmentAction | RoomActivity]
  connected: [info: { connected: boolean; status: HandlerStatus }]
  reconnecting: [attempt: number]
  disconnected: [reason: string]
  error: [error: Error]
}
