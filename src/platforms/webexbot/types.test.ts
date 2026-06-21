import { describe, expect, it } from 'bun:test'

import { WebexBotConfigSchema, WebexBotCredentialsSchema, WebexBotEntrySchema, WebexBotError } from './types'

describe('WebexBotError', () => {
  it('creates error with message and code', () => {
    const error = new WebexBotError('Test error', 'TEST_CODE')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('WebexBotError')
  })
})

describe('WebexBotEntrySchema', () => {
  it('validates correct bot entry', () => {
    const data = {
      bot_id: 'bot123',
      bot_name: 'My Bot',
      token: 'token123',
    }

    const result = WebexBotEntrySchema.safeParse(data)

    expect(result.success).toBe(true)
  })

  it('rejects missing token', () => {
    const data = {
      bot_id: 'bot123',
      bot_name: 'My Bot',
    }

    const result = WebexBotEntrySchema.safeParse(data)

    expect(result.success).toBe(false)
  })
})

describe('WebexBotConfigSchema', () => {
  it('validates correct config with bots', () => {
    const data = {
      current: { bot_id: 'bot123' },
      bots: {
        bot123: {
          bot_id: 'bot123',
          bot_name: 'My Bot',
          token: 'token123',
        },
      },
    }

    const result = WebexBotConfigSchema.safeParse(data)

    expect(result.success).toBe(true)
  })

  it('validates config with null current', () => {
    const result = WebexBotConfigSchema.safeParse({ current: null, bots: {} })

    expect(result.success).toBe(true)
  })
})

describe('WebexBotCredentialsSchema', () => {
  it('validates credentials with required fields', () => {
    const data = {
      token: 'token123',
      bot_id: 'bot123',
      bot_name: 'My Bot',
    }

    const result = WebexBotCredentialsSchema.safeParse(data)

    expect(result.success).toBe(true)
  })

  it('rejects missing bot_id', () => {
    const data = {
      token: 'token123',
      bot_name: 'My Bot',
    }

    const result = WebexBotCredentialsSchema.safeParse(data)

    expect(result.success).toBe(false)
  })
})
