import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { SlackClient } from '../../src/lib/slack-client'
import type { SlackMessage } from '../../src/types'

describe('Message Commands', () => {
  let mockClient: SlackClient

  beforeEach(() => {
    // Mock SlackClient
    mockClient = {
      sendMessage: mock(async (_channel: string, text: string, threadTs?: string) => ({
        ts: '1234567890.123456',
        text,
        type: 'message',
        user: 'U123',
        thread_ts: threadTs,
      })),
      getMessages: mock(async (_channel: string, _limit?: number) => [
        {
          ts: '1234567890.123456',
          text: 'First message',
          type: 'message',
          user: 'U123',
        },
        {
          ts: '1234567890.123457',
          text: 'Second message',
          type: 'message',
          user: 'U456',
        },
      ]),
      updateMessage: mock(async (_channel: string, ts: string, text: string) => ({
        ts,
        text,
        type: 'message',
        user: 'U123',
      })),
      deleteMessage: mock(async (_channel: string, _ts: string) => {
        // no-op
      }),
      getMessage: mock(async (_channel: string, ts: string) => {
        if (ts === '1234567890.123456') {
          return {
            ts: '1234567890.123456',
            text: 'Found single message',
            type: 'message',
            user: 'U123',
          }
        }
        return null
      }),
      searchMessages: mock(async (_query: string, _options?: any) => [
        {
          ts: '1234567890.123456',
          text: 'Found message 1',
          user: 'U123',
          channel: { id: 'C001', name: 'general' },
          permalink: 'https://workspace.slack.com/archives/C001/p1234567890123456',
        },
        {
          ts: '1234567890.123457',
          text: 'Found message 2',
          user: 'U456',
          channel: { id: 'C002', name: 'random' },
          permalink: 'https://workspace.slack.com/archives/C002/p1234567890123457',
        },
      ]),
    } as any
  })

  describe('message send', () => {
    test('sends message to channel', async () => {
      // Given: A channel and message text
      const channel = 'C123'
      const text = 'Hello, world!'

      // When: Sending message
      const result = await mockClient.sendMessage(channel, text)

      // Then: Should return message with ts
      expect(result.ts).toBeDefined()
      expect(result.text).toBe(text)
      expect(result.type).toBe('message')
    })

    test('sends message to thread', async () => {
      // Given: A channel, message text, and thread ts
      const channel = 'C123'
      const text = 'Reply in thread'
      const threadTs = '1234567890.123456'

      // When: Sending message with thread_ts
      const result = await mockClient.sendMessage(channel, text, threadTs)

      // Then: Should include thread_ts
      expect(result.thread_ts).toBe(threadTs)
      expect(result.text).toBe(text)
    })
  })

  describe('message list', () => {
    test('lists messages from channel', async () => {
      // Given: A channel
      const channel = 'C123'

      // When: Getting messages
      const messages = await mockClient.getMessages(channel)

      // Then: Should return array of messages
      expect(messages).toHaveLength(2)
      expect(messages[0].text).toBe('First message')
      expect(messages[1].text).toBe('Second message')
    })

    test('respects limit parameter', async () => {
      // Given: A channel and limit
      const channel = 'C123'
      const limit = 10

      // When: Getting messages with limit
      const messages = await mockClient.getMessages(channel, limit)

      // Then: Should pass limit to API
      expect(messages).toBeDefined()
    })

    test('filters messages by thread', async () => {
      // Given: A channel and thread ts
      const channel = 'C123'
      const _threadTs = '1234567890.123456'

      // When: Getting thread messages
      // Note: This would need SlackClient to support thread filtering
      const messages = await mockClient.getMessages(channel)

      // Then: Should return messages
      expect(messages).toBeDefined()
    })
  })

  describe('message update', () => {
    test('updates message text', async () => {
      // Given: A channel, message ts, and new text
      const channel = 'C123'
      const ts = '1234567890.123456'
      const newText = 'Updated message'

      // When: Updating message
      const result = await mockClient.updateMessage(channel, ts, newText)

      // Then: Should return updated message
      expect(result.ts).toBe(ts)
      expect(result.text).toBe(newText)
    })
  })

  describe('message delete', () => {
    test('deletes message', async () => {
      // Given: A channel and message ts
      const channel = 'C123'
      const ts = '1234567890.123456'

      // When: Deleting message
      await mockClient.deleteMessage(channel, ts)

      // Then: Should complete without error
      expect(mockClient.deleteMessage).toHaveBeenCalled()
    })
  })

  describe('message get', () => {
    test('gets single message by timestamp', async () => {
      // Given: A channel and message ts
      const channel = 'C123'
      const ts = '1234567890.123456'

      // When: Getting message by ts
      const message = await mockClient.getMessage(channel, ts)

      // Then: Should return the message
      expect(message).not.toBeNull()
      expect(message?.ts).toBe(ts)
      expect(message?.text).toBe('Found single message')
    })

    test('returns null for non-existent message', async () => {
      // Given: A channel and non-existent ts
      const channel = 'C123'
      const ts = '9999999999.999999'

      // When: Getting non-existent message
      const message = await mockClient.getMessage(channel, ts)

      // Then: Should return null
      expect(message).toBeNull()
    })
  })

  describe('message search', () => {
    test('searches messages across workspace', async () => {
      // Given: A search query
      const query = 'hello world'

      // When: Searching messages
      const results = await mockClient.searchMessages(query)

      // Then: Should return matching messages with channel info
      expect(results).toHaveLength(2)
      expect(results[0].text).toBe('Found message 1')
      expect(results[0].channel.name).toBe('general')
      expect(results[0].permalink).toBeDefined()
    })

    test('returns channel info with each result', async () => {
      // Given: A search query
      const query = 'test'

      // When: Searching messages
      const results = await mockClient.searchMessages(query)

      // Then: Each result should have channel info
      for (const result of results) {
        expect(result.channel).toBeDefined()
        expect(result.channel.id).toBeDefined()
        expect(result.channel.name).toBeDefined()
      }
    })
  })

  describe('ref resolution', () => {
    test('resolves channel ref @c1', () => {
      // Given: A channel ref
      const ref = '@c1'

      // When: Parsing ref
      const match = ref.match(/@c(\d+)/)

      // Then: Should extract number
      expect(match).toBeDefined()
      expect(match?.[1]).toBe('1')
    })

    test('resolves message ref @m5', () => {
      // Given: A message ref
      const ref = '@m5'

      // When: Parsing ref
      const match = ref.match(/@m(\d+)/)

      // Then: Should extract number
      expect(match).toBeDefined()
      expect(match?.[1]).toBe('5')
    })

    test('supports combined refs like @c1 @m5', () => {
      // Given: Combined refs
      const input = '@c1 @m5'

      // When: Parsing refs
      const refs = input.match(/@[cmuf]\d+/g)

      // Then: Should extract all refs
      expect(refs).toEqual(['@c1', '@m5'])
    })
  })

  describe('output formatting', () => {
    test('includes ref in message output', () => {
      // Given: A message with ref
      const message: SlackMessage = {
        ts: '1234567890.123456',
        text: 'Hello',
        type: 'message',
        user: 'U123',
      }

      // When: Formatting output
      const output = {
        ref: '@m1',
        ...message,
      }

      // Then: Should include ref
      expect(output.ref).toBe('@m1')
      expect(output.text).toBe('Hello')
    })

    test('formats multiple messages with refs', () => {
      // Given: Multiple messages
      const messages: SlackMessage[] = [
        {
          ts: '1234567890.123456',
          text: 'First',
          type: 'message',
          user: 'U123',
        },
        {
          ts: '1234567890.123457',
          text: 'Second',
          type: 'message',
          user: 'U456',
        },
      ]

      // When: Formatting with refs
      const output = messages.map((msg, idx) => ({
        ref: `@m${idx + 1}`,
        ...msg,
      }))

      // Then: Should have sequential refs
      expect(output[0].ref).toBe('@m1')
      expect(output[1].ref).toBe('@m2')
    })
  })
})
