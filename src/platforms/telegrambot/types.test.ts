import { describe, expect, it } from 'bun:test'

import {
  TelegramBotConfigSchema,
  TelegramBotCredentialsSchema,
  TelegramBotEntrySchema,
  TelegramBotError,
  TelegramBotUserSchema,
  TelegramChatSchema,
  TelegramMessageSchema,
} from './types'

describe('TelegramBotError', () => {
  it('creates error with message and code', () => {
    const err = new TelegramBotError('Test error', 'TEST_CODE')
    expect(err.message).toBe('Test error')
    expect(err.code).toBe('TEST_CODE')
    expect(err.name).toBe('TelegramBotError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('TelegramBotEntrySchema', () => {
  it('validates correct bot entry', () => {
    const result = TelegramBotEntrySchema.safeParse({
      bot_id: 'mybot',
      bot_name: 'My Bot',
      token: '123456789:ABC-DEF',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing bot_id', () => {
    const result = TelegramBotEntrySchema.safeParse({ bot_name: 'My Bot', token: 'tok' })
    expect(result.success).toBe(false)
  })
})

describe('TelegramBotConfigSchema', () => {
  it('accepts empty config', () => {
    const result = TelegramBotConfigSchema.safeParse({ current: null, bots: {} })
    expect(result.success).toBe(true)
  })

  it('accepts config with bots and current', () => {
    const result = TelegramBotConfigSchema.safeParse({
      current: { bot_id: 'mybot' },
      bots: {
        mybot: { bot_id: 'mybot', bot_name: 'My Bot', token: '123:abc' },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('TelegramBotCredentialsSchema', () => {
  it('validates credentials', () => {
    const result = TelegramBotCredentialsSchema.safeParse({
      token: '123:abc',
      bot_id: 'mybot',
      bot_name: 'My Bot',
    })
    expect(result.success).toBe(true)
  })
})

describe('TelegramBotUserSchema', () => {
  it('validates a bot user', () => {
    const result = TelegramBotUserSchema.safeParse({
      id: 123456789,
      is_bot: true,
      first_name: 'My Bot',
      username: 'mybot',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = TelegramBotUserSchema.safeParse({ is_bot: true, first_name: 'X' })
    expect(result.success).toBe(false)
  })
})

describe('TelegramChatSchema', () => {
  it('validates private chat', () => {
    const result = TelegramChatSchema.safeParse({ id: 1, type: 'private', first_name: 'Alice' })
    expect(result.success).toBe(true)
  })

  it('validates supergroup', () => {
    const result = TelegramChatSchema.safeParse({ id: -1001234567890, type: 'supergroup', title: 'Eng' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = TelegramChatSchema.safeParse({ id: 1, type: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('TelegramMessageSchema', () => {
  it('validates a text message', () => {
    const result = TelegramMessageSchema.safeParse({
      message_id: 42,
      date: 1735689600,
      chat: { id: -1001234567890, type: 'supergroup', title: 'Eng' },
      from: { id: 1, is_bot: false, first_name: 'Alice' },
      text: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('validates message with reply', () => {
    const result = TelegramMessageSchema.safeParse({
      message_id: 43,
      date: 1735689700,
      chat: { id: -1001234567890, type: 'supergroup', title: 'Eng' },
      text: 'Reply',
      reply_to_message: {
        message_id: 42,
        date: 1735689600,
        chat: { id: -1001234567890, type: 'supergroup', title: 'Eng' },
        text: 'Original',
      },
    })
    expect(result.success).toBe(true)
  })
})
