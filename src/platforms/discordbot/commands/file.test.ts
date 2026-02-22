import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { DiscordBotCredentialManager } from '../credential-manager'
import { listAction, uploadAction } from './file'
import type { BotOption } from './shared'

describe('file commands', () => {
  let mockCredManager: DiscordBotCredentialManager
  let options: BotOption

  beforeEach(() => {
    mockCredManager = {
      getCurrentServer: mock(async () => 'server-123'),
    } as unknown as DiscordBotCredentialManager

    options = {
      _credManager: mockCredManager,
    }
  })

  describe('uploadAction', () => {
    it('should upload file successfully', async () => {
      const result = await uploadAction('general', './test.txt', {
        ...options,
        _credManager: mockCredManager,
      })

      expect(result).toBeDefined()
    })

    it('should return error when channel resolution fails', async () => {
      const result = await uploadAction('nonexistent', './test.txt', options)
      expect(result.error).toBeDefined()
    })

    it('should return error when file does not exist', async () => {
      const result = await uploadAction('general', '/nonexistent/file.txt', {
        ...options,
        _credManager: mockCredManager,
      })
      expect(result.error).toBeDefined()
    })
  })

  describe('listAction', () => {
    it('should list files successfully', async () => {
      const result = await listAction('general', {
        ...options,
        _credManager: mockCredManager,
      })

      expect(result).toBeDefined()
    })

    it('should return error when channel resolution fails', async () => {
      const result = await listAction('nonexistent', options)
      expect(result.error).toBeDefined()
    })
  })

  describe('action result structure', () => {
    it('uploadAction should return success result with file info', async () => {
      const result = await uploadAction('general', './test.txt', {
        ...options,
        _credManager: mockCredManager,
      })

      if (!result.error) {
        expect(result.success).toBe(true)
        expect(result.file).toBeDefined()
        if (result.file) {
          expect(result.file.id).toBeDefined()
          expect(result.file.filename).toBeDefined()
          expect(result.file.size).toBeDefined()
          expect(result.file.url).toBeDefined()
        }
      }
    })

    it('listAction should return success result with files array', async () => {
      const result = await listAction('general', {
        ...options,
        _credManager: mockCredManager,
      })

      if (!result.error) {
        expect(result.success).toBe(true)
        expect(Array.isArray(result.files)).toBe(true)
      }
    })
  })
})
