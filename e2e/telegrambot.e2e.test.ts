import { afterEach, beforeAll, describe, expect, it } from 'bun:test'

import { TELEGRAMBOT_TEST_CHAT_ID, validateTelegramBotEnvironment } from './config'
import { generateTestId, parseJSON, runCLI, waitForRateLimit } from './helpers'

let telegramBotAvailable = false
let trackedMessageIds: number[] = []

async function deleteTrackedMessages(): Promise<void> {
  for (const messageId of trackedMessageIds) {
    try {
      await runCLI('telegrambot', ['message', 'delete', TELEGRAMBOT_TEST_CHAT_ID, String(messageId), '--force'])
      await waitForRateLimit(300)
    } catch {
      // best-effort cleanup
    }
  }
  trackedMessageIds = []
}

describe('Telegram Bot E2E Tests', () => {
  beforeAll(async () => {
    telegramBotAvailable = await validateTelegramBotEnvironment()
  })

  afterEach(async () => {
    if (trackedMessageIds.length > 0) {
      await deleteTrackedMessages()
    }
    await waitForRateLimit()
  })

  describe('auth', () => {
    it('auth status returns valid bot info', async () => {
      if (!telegramBotAvailable) return

      const result = await runCLI('telegrambot', ['auth', 'status'])
      expect(result.exitCode).toBe(0)

      const data = parseJSON<{ valid: boolean; bot_id: string }>(result.stdout)
      expect(data?.valid).toBe(true)
      expect(data?.bot_id).toBeTruthy()
    })

    it('auth list returns bots array', async () => {
      if (!telegramBotAvailable) return

      const result = await runCLI('telegrambot', ['auth', 'list'])
      expect(result.exitCode).toBe(0)

      const data = parseJSON<{ bots: Array<{ bot_id: string }> }>(result.stdout)
      expect(Array.isArray(data?.bots)).toBe(true)
    })
  })

  describe('whoami', () => {
    it('whoami returns bot identity', async () => {
      if (!telegramBotAvailable) return

      const result = await runCLI('telegrambot', ['whoami'])
      expect(result.exitCode).toBe(0)

      const data = parseJSON<{ id: number; is_bot: boolean }>(result.stdout)
      expect(data?.id).toBeTruthy()
      expect(data?.is_bot).toBe(true)
    })
  })

  describe('chat', () => {
    it('chat info returns chat details', async () => {
      if (!telegramBotAvailable) return

      const result = await runCLI('telegrambot', ['chat', 'info', TELEGRAMBOT_TEST_CHAT_ID])
      expect(result.exitCode).toBe(0)

      const data = parseJSON<{ id: number; type: string }>(result.stdout)
      expect(data?.id).toBeTruthy()
      expect(data?.type).toBeTruthy()
    })
  })

  describe('message', () => {
    it('message send delivers message and returns id', async () => {
      if (!telegramBotAvailable) return

      const testId = generateTestId()
      const result = await runCLI('telegrambot', ['message', 'send', TELEGRAMBOT_TEST_CHAT_ID, `Bot e2e ${testId}`])
      expect(result.exitCode).toBe(0)

      const data = parseJSON<{ message: { message_id: number; chat_id: number; text: string } }>(result.stdout)
      expect(data?.message?.message_id).toBeTruthy()
      expect(data?.message?.text).toContain(testId)
      if (data?.message?.message_id) trackedMessageIds.push(data.message.message_id)
    })

    it('message edit edits previously sent message', async () => {
      if (!telegramBotAvailable) return

      const testId = generateTestId()
      const sendResult = await runCLI('telegrambot', [
        'message',
        'send',
        TELEGRAMBOT_TEST_CHAT_ID,
        `Original ${testId}`,
      ])
      const sent = parseJSON<{ message: { message_id: number } }>(sendResult.stdout)
      expect(sent?.message?.message_id).toBeTruthy()
      if (sent?.message?.message_id) trackedMessageIds.push(sent.message.message_id)

      await waitForRateLimit()

      const updateResult = await runCLI('telegrambot', [
        'message',
        'edit',
        TELEGRAMBOT_TEST_CHAT_ID,
        String(sent!.message.message_id),
        `Edited ${testId}`,
      ])
      expect(updateResult.exitCode).toBe(0)
    })

    it('message delete removes message', async () => {
      if (!telegramBotAvailable) return

      const testId = generateTestId()
      const sendResult = await runCLI('telegrambot', [
        'message',
        'send',
        TELEGRAMBOT_TEST_CHAT_ID,
        `Delete me ${testId}`,
      ])
      const sent = parseJSON<{ message: { message_id: number } }>(sendResult.stdout)
      expect(sent?.message?.message_id).toBeTruthy()

      await waitForRateLimit()

      const deleteResult = await runCLI('telegrambot', [
        'message',
        'delete',
        TELEGRAMBOT_TEST_CHAT_ID,
        String(sent!.message.message_id),
        '--force',
      ])
      expect(deleteResult.exitCode).toBe(0)
    })
  })

  describe('reaction', () => {
    it('reaction set and clear lifecycle', async () => {
      if (!telegramBotAvailable) return

      const testId = generateTestId()
      const sendResult = await runCLI('telegrambot', [
        'message',
        'send',
        TELEGRAMBOT_TEST_CHAT_ID,
        `Reaction test ${testId}`,
      ])
      const sent = parseJSON<{ message: { message_id: number } }>(sendResult.stdout)
      expect(sent?.message?.message_id).toBeTruthy()
      if (sent?.message?.message_id) trackedMessageIds.push(sent.message.message_id)

      await waitForRateLimit(2000)

      const setResult = await runCLI('telegrambot', [
        'reaction',
        'set',
        TELEGRAMBOT_TEST_CHAT_ID,
        String(sent!.message.message_id),
        '👍',
      ])
      expect(setResult.exitCode).toBe(0)

      await waitForRateLimit(2000)

      const clearResult = await runCLI('telegrambot', [
        'reaction',
        'clear',
        TELEGRAMBOT_TEST_CHAT_ID,
        String(sent!.message.message_id),
      ])
      expect(clearResult.exitCode).toBe(0)
    }, 15000)
  })
})
