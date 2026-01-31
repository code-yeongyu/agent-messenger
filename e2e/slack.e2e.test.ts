import { describe, test, expect, beforeAll, afterEach } from 'bun:test'
import { 
  runCLI, parseJSON, generateTestId, createTestMessage, 
  deleteTestMessage, waitForRateLimit, cleanupMessages 
} from './helpers'
import { 
  SLACK_TEST_CHANNEL, SLACK_TEST_CHANNEL_ID,
  validateSlackEnvironment 
} from './config'

// Track messages created during tests for cleanup
let testMessages: string[] = []

describe('Slack E2E Tests', () => {
  beforeAll(async () => {
    // Validate we're in the correct workspace
    await validateSlackEnvironment()
  })

  afterEach(async () => {
    if (testMessages.length > 0) {
      await cleanupMessages('slack', SLACK_TEST_CHANNEL_ID, testMessages)
      testMessages = []
    }
    await waitForRateLimit()
  })

  describe('auth', () => {
    test('auth status returns authenticated workspace info', async () => {
      const result = await runCLI('slack', ['auth', 'status'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ workspace_id: string; workspace_name: string }>(result.stdout)
      expect(data).not.toBeNull()
      expect(data?.workspace_id).toBeTruthy()
      expect(data?.workspace_name).toBeTruthy()
    })
  })

  describe('workspace', () => {
    test('workspace list returns array', async () => {
      const result = await runCLI('slack', ['workspace', 'list'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ id: string; name: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

    test('workspace current returns current workspace', async () => {
      const result = await runCLI('slack', ['workspace', 'current'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ workspace_id: string }>(result.stdout)
      expect(data?.workspace_id).toBeTruthy()
    })
  })

  describe('message', () => {
    test('message send creates message and returns ts', async () => {
      const testId = generateTestId()
      const result = await runCLI('slack', ['message', 'send', SLACK_TEST_CHANNEL_ID, `Test message ${testId}`])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ ts: string }>(result.stdout)
      expect(data?.ts).toBeTruthy()
      
      if (data?.ts) testMessages.push(data.ts)
    })

    test('message list returns messages array', async () => {
      const result = await runCLI('slack', ['message', 'list', SLACK_TEST_CHANNEL_ID, '--limit', '5'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ ts: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

    test('message get retrieves specific message', async () => {
      const testId = generateTestId()
      const { id: ts } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Get test ${testId}`)
      testMessages.push(ts)
      
      await waitForRateLimit()
      
      const result = await runCLI('slack', ['message', 'get', SLACK_TEST_CHANNEL_ID, ts])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ text: string }>(result.stdout)
      expect(data?.text).toContain(testId)
    })

    test('message update modifies message', async () => {
      const testId = generateTestId()
      const { id: ts } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Original ${testId}`)
      testMessages.push(ts)
      
      await waitForRateLimit()
      
      const result = await runCLI('slack', ['message', 'update', SLACK_TEST_CHANNEL_ID, ts, `Updated ${testId}`])
      expect(result.exitCode).toBe(0)
      
      await waitForRateLimit()
      const getResult = await runCLI('slack', ['message', 'get', SLACK_TEST_CHANNEL_ID, ts])
      const data = parseJSON<{ text: string }>(getResult.stdout)
      expect(data?.text).toContain('Updated')
    })

    test('message search finds messages', async () => {
      const result = await runCLI('slack', ['message', 'search', 'test', '--limit', '5'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ ts: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

    test('message send with thread creates reply', async () => {
      const testId = generateTestId()
      const { id: parentTs } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Parent ${testId}`)
      testMessages.push(parentTs)
      
      await waitForRateLimit()
      
      const result = await runCLI('slack', ['message', 'send', SLACK_TEST_CHANNEL_ID, `Reply ${testId}`, '--thread', parentTs])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ ts: string; thread_ts: string }>(result.stdout)
      expect(data?.thread_ts).toBe(parentTs)
      
      if (data?.ts) testMessages.push(data.ts)
    })

    test('message replies gets thread replies', async () => {
      const testId = generateTestId()
      const { id: parentTs } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Thread parent ${testId}`)
      testMessages.push(parentTs)
      
      await waitForRateLimit()
      
      await runCLI('slack', ['message', 'send', SLACK_TEST_CHANNEL_ID, `Thread reply ${testId}`, '--thread', parentTs])
      
      await waitForRateLimit()
      
      const result = await runCLI('slack', ['message', 'replies', SLACK_TEST_CHANNEL_ID, parentTs])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ ts: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
      expect(data?.length).toBeGreaterThanOrEqual(1)
    })

    test('message delete removes message', async () => {
      const testId = generateTestId()
      const { id: ts } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Delete me ${testId}`)
      
      await waitForRateLimit()
      
      const result = await runCLI('slack', ['message', 'delete', SLACK_TEST_CHANNEL_ID, ts, '--force'])
      expect(result.exitCode).toBe(0)
    })
  })

  describe('channel', () => {
    test('channel list returns channels array', async () => {
      const result = await runCLI('slack', ['channel', 'list'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ id: string; name: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
      expect(data?.length).toBeGreaterThan(0)
    })

    test('channel list --type public filters channels', async () => {
      const result = await runCLI('slack', ['channel', 'list', '--type', 'public'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ is_private: boolean }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

     test('channel info returns channel details', async () => {
       const result = await runCLI('slack', ['channel', 'info', SLACK_TEST_CHANNEL_ID])
       expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ id: string; name: string }>(result.stdout)
      expect(data?.id).toBeTruthy()
      expect(data?.name).toBe('e2e-test')
    })
  })

  describe('user', () => {
    test('user list returns users array', async () => {
      const result = await runCLI('slack', ['user', 'list'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ id: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

    test('user me returns current user', async () => {
      const result = await runCLI('slack', ['user', 'me'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ id: string; name: string }>(result.stdout)
      expect(data?.id).toBeTruthy()
      expect(data?.name).toBeTruthy()
    })

    test('user info returns user details', async () => {
      // First get current user ID
      const meResult = await runCLI('slack', ['user', 'me'])
      const me = parseJSON<{ id: string }>(meResult.stdout)
      expect(me?.id).toBeTruthy()
      
      await waitForRateLimit()
      
      // Get user info
      const result = await runCLI('slack', ['user', 'info', me!.id])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ id: string }>(result.stdout)
      expect(data?.id).toBe(me?.id)
    })
  })

  describe('reaction', () => {
    test('reaction add/list/remove lifecycle', async () => {
      const testId = generateTestId()
      const { id: ts } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Reaction test ${testId}`)
      testMessages.push(ts)
      
      await waitForRateLimit()
      
      const addResult = await runCLI('slack', ['reaction', 'add', SLACK_TEST_CHANNEL_ID, ts, 'thumbsup'])
      expect(addResult.exitCode).toBe(0)
      
      await waitForRateLimit()
      
      const listResult = await runCLI('slack', ['reaction', 'list', SLACK_TEST_CHANNEL_ID, ts])
      expect(listResult.exitCode).toBe(0)
      
      const data = parseJSON<{ reactions: Array<{ name: string }> }>(listResult.stdout)
      expect(Array.isArray(data?.reactions)).toBe(true)
      
      await waitForRateLimit()
      
      const removeResult = await runCLI('slack', ['reaction', 'remove', SLACK_TEST_CHANNEL_ID, ts, 'thumbsup'])
      expect(removeResult.exitCode).toBe(0)
    })
  })

  describe('file', () => {
    test('file list returns files array', async () => {
      const result = await runCLI('slack', ['file', 'list'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<Array<{ id: string }>>(result.stdout)
      expect(Array.isArray(data)).toBe(true)
    })

    test.skip('file upload uploads file', async () => {
      const testId = generateTestId()
      const testFilePath = `/tmp/slack-e2e-${testId}.txt`
      await Bun.write(testFilePath, `E2E test file content ${testId}`)
      
      try {
        const result = await runCLI('slack', ['file', 'upload', SLACK_TEST_CHANNEL_ID, testFilePath])
        expect(result.exitCode).toBe(0)
        
        const data = parseJSON<{ id: string }>(result.stdout)
        expect(data?.id).toBeTruthy()
        
        if (data?.id) {
          await waitForRateLimit()
          const infoResult = await runCLI('slack', ['file', 'info', data.id])
          expect(infoResult.exitCode).toBe(0)
        }
      } finally {
        await Bun.$`rm -f ${testFilePath}`.quiet()
      }
    })
  })

  describe('snapshot', () => {
    test('snapshot returns full workspace data', async () => {
      const result = await runCLI('slack', ['snapshot', '--limit', '2'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ channels: unknown[]; users: unknown[] }>(result.stdout)
      expect(data?.channels).toBeDefined()
      expect(data?.users).toBeDefined()
    })

    test('snapshot --channels-only returns only channels', async () => {
      const result = await runCLI('slack', ['snapshot', '--channels-only'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ channels: unknown[] }>(result.stdout)
      expect(data?.channels).toBeDefined()
    })

    test('snapshot --users-only returns only users', async () => {
      const result = await runCLI('slack', ['snapshot', '--users-only'])
      expect(result.exitCode).toBe(0)
      
      const data = parseJSON<{ users: unknown[] }>(result.stdout)
      expect(data?.users).toBeDefined()
    })
  })
})
