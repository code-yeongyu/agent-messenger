import { z } from 'zod'

export type { WebexListenerEventMap as WebexBotListenerEventMap } from '../webex/listener'

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
