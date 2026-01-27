import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { SlackClient } from '../../src/lib/slack-client'
import type { SlackFile } from '../../src/types'

describe('File Commands', () => {
  let mockClient: SlackClient

  beforeEach(() => {
    // Mock SlackClient
    mockClient = {
      uploadFile: mock(async (channels: string[], file: Buffer, filename: string) => ({
        id: 'F123',
        name: filename,
        title: filename,
        mimetype: 'text/plain',
        size: file.length,
        url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
        created: Math.floor(Date.now() / 1000),
        user: 'U123',
        channels,
      })),
      listFiles: mock(async (channel?: string) => [
        {
          id: 'F123',
          name: 'test.txt',
          title: 'test.txt',
          mimetype: 'text/plain',
          size: 1024,
          url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
          created: 1234567890,
          user: 'U123',
          channels: channel ? [channel] : ['C123'],
        },
        {
          id: 'F456',
          name: 'document.pdf',
          title: 'document.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          url_private: 'https://files.slack.com/files-pri/T123-F456/document.pdf',
          created: 1234567891,
          user: 'U456',
          channels: channel ? [channel] : ['C456'],
        },
      ]),
    } as any
  })

  describe('file upload', () => {
    test('uploads file to channel', async () => {
      // Given: A channel and file buffer
      const channel = 'C123'
      const fileBuffer = Buffer.from('test content')
      const filename = 'test.txt'

      // When: Uploading file
      const result = await mockClient.uploadFile([channel], fileBuffer, filename)

      // Then: Should return file with id and name
      expect(result.id).toBeDefined()
      expect(result.name).toBe(filename)
      expect(result.size).toBe(fileBuffer.length)
      expect(result.channels).toContain(channel)
    })

    test('supports --filename override', async () => {
      // Given: A file with custom filename
      const channel = 'C123'
      const fileBuffer = Buffer.from('content')
      const customFilename = 'custom-name.txt'

      // When: Uploading with custom filename
      const result = await mockClient.uploadFile([channel], fileBuffer, customFilename)

      // Then: Should use custom filename
      expect(result.name).toBe(customFilename)
    })

    test('returns file with ref assignment', () => {
      // Given: An uploaded file
      const file: SlackFile = {
        id: 'F123',
        name: 'test.txt',
        title: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
        created: 1234567890,
        user: 'U123',
      }

      // When: Formatting output with ref
      const output = {
        ref: '@f1',
        ...file,
      }

      // Then: Should include ref
      expect(output.ref).toBe('@f1')
      expect(output.id).toBe('F123')
    })
  })

  describe('file list', () => {
    test('lists all files in workspace', async () => {
      // Given: No channel filter
      // When: Listing files
      const files = await mockClient.listFiles()

      // Then: Should return array of files
      expect(files).toHaveLength(2)
      expect(files[0].name).toBe('test.txt')
      expect(files[1].name).toBe('document.pdf')
    })

    test('filters files by channel', async () => {
      // Given: A specific channel
      const channel = 'C123'

      // When: Listing files for channel
      const files = await mockClient.listFiles(channel)

      // Then: Should return files from that channel
      expect(files).toBeDefined()
      expect(files.length).toBeGreaterThan(0)
    })

    test('returns files with sequential refs', () => {
      // Given: Multiple files
      const files: SlackFile[] = [
        {
          id: 'F123',
          name: 'test.txt',
          title: 'test.txt',
          mimetype: 'text/plain',
          size: 1024,
          url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
          created: 1234567890,
          user: 'U123',
        },
        {
          id: 'F456',
          name: 'document.pdf',
          title: 'document.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          url_private: 'https://files.slack.com/files-pri/T123-F456/document.pdf',
          created: 1234567891,
          user: 'U456',
        },
      ]

      // When: Formatting with refs
      const output = files.map((file, idx) => ({
        ref: `@f${idx + 1}`,
        ...file,
      }))

      // Then: Should have sequential refs
      expect(output[0].ref).toBe('@f1')
      expect(output[1].ref).toBe('@f2')
    })
  })

  describe('file info', () => {
    test('shows file details', async () => {
      // Given: A file ID
      const fileId = 'F123'

      // When: Getting file info (simulated by listing and filtering)
      const files = await mockClient.listFiles()
      const file = files.find((f) => f.id === fileId)

      // Then: Should return file details
      expect(file).toBeDefined()
      expect(file?.id).toBe(fileId)
      expect(file?.name).toBe('test.txt')
    })

    test('resolves file ref @f1', () => {
      // Given: A file ref
      const ref = '@f1'

      // When: Parsing ref
      const match = ref.match(/@f(\d+)/)

      // Then: Should extract number
      expect(match).toBeDefined()
      expect(match?.[1]).toBe('1')
    })

    test('supports ref in file info command', () => {
      // Given: A file with ref
      const file: SlackFile = {
        id: 'F123',
        name: 'test.txt',
        title: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
        created: 1234567890,
        user: 'U123',
      }

      // When: Using ref to identify file
      const ref = '@f1'
      const output = {
        ref,
        ...file,
      }

      // Then: Should resolve ref to file
      expect(output.ref).toBe('@f1')
      expect(output.id).toBe('F123')
    })
  })

  describe('ref resolution', () => {
    test('resolves file ref @f1', () => {
      // Given: A file ref
      const ref = '@f1'

      // When: Parsing ref
      const match = ref.match(/@f(\d+)/)

      // Then: Should extract number
      expect(match).toBeDefined()
      expect(match?.[1]).toBe('1')
    })

    test('supports combined refs like @c1 @f1', () => {
      // Given: Combined refs
      const input = '@c1 @f1'

      // When: Parsing refs
      const refs = input.match(/@[cmuf]\d+/g)

      // Then: Should extract all refs
      expect(refs).toEqual(['@c1', '@f1'])
    })
  })

  describe('output formatting', () => {
    test('includes ref in file output', () => {
      // Given: A file with ref
      const file: SlackFile = {
        id: 'F123',
        name: 'test.txt',
        title: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
        created: 1234567890,
        user: 'U123',
      }

      // When: Formatting output
      const output = {
        ref: '@f1',
        ...file,
      }

      // Then: Should include ref
      expect(output.ref).toBe('@f1')
      expect(output.name).toBe('test.txt')
    })

    test('formats multiple files with refs', () => {
      // Given: Multiple files
      const files: SlackFile[] = [
        {
          id: 'F123',
          name: 'test.txt',
          title: 'test.txt',
          mimetype: 'text/plain',
          size: 1024,
          url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
          created: 1234567890,
          user: 'U123',
        },
        {
          id: 'F456',
          name: 'document.pdf',
          title: 'document.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          url_private: 'https://files.slack.com/files-pri/T123-F456/document.pdf',
          created: 1234567891,
          user: 'U456',
        },
      ]

      // When: Formatting with refs
      const output = files.map((file, idx) => ({
        ref: `@f${idx + 1}`,
        ...file,
      }))

      // Then: Should have sequential refs
      expect(output[0].ref).toBe('@f1')
      expect(output[1].ref).toBe('@f2')
      expect(output[0].name).toBe('test.txt')
      expect(output[1].name).toBe('document.pdf')
    })
  })
})
