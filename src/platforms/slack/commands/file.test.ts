import { afterEach, beforeEach, describe, expect, mock, spyOn, it } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'

import { SlackClient } from '@/platforms/slack/client'
import type { SlackFile } from '@/platforms/slack/types'

describe('File Commands', () => {
  let mockClient: SlackClient

  beforeEach(() => {
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
      getFileInfo: mock(async (fileId: string) => ({
        id: fileId,
        name: 'test.txt',
        title: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
        created: 1234567890,
        user: 'U123',
        channels: ['C123'],
      })),
      downloadFile: mock(async (fileId: string) => ({
        buffer: Buffer.from('downloaded content'),
        file: {
          id: fileId,
          name: 'test.txt',
          title: 'test.txt',
          mimetype: 'text/plain',
          size: 18,
          url_private: 'https://files.slack.com/files-pri/T123-F123/test.txt',
          created: 1234567890,
          user: 'U123',
          channels: ['C123'],
        },
      })),
    } as any
  })

  describe('file upload', () => {
    it('uploads file to channel', async () => {
      const channel = 'C123'
      const fileBuffer = Buffer.from('test content')
      const filename = 'test.txt'

      const result = await mockClient.uploadFile([channel], fileBuffer, filename)

      expect(result.id).toBeDefined()
      expect(result.name).toBe(filename)
      expect(result.size).toBe(fileBuffer.length)
      expect(result.channels).toContain(channel)
    })

    it('supports --filename override', async () => {
      const channel = 'C123'
      const fileBuffer = Buffer.from('content')
      const customFilename = 'custom-name.txt'

      const result = await mockClient.uploadFile([channel], fileBuffer, customFilename)

      expect(result.name).toBe(customFilename)
    })

    it('returns file with metadata', () => {
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

      const output = { ...file }

      expect(output.id).toBe('F123')
      expect(output.name).toBe('test.txt')
    })
  })

  describe('file list', () => {
    it('lists all files in workspace', async () => {
      const files = await mockClient.listFiles()

      expect(files).toHaveLength(2)
      expect(files[0].name).toBe('test.txt')
      expect(files[1].name).toBe('document.pdf')
    })

    it('filters files by channel', async () => {
      const channel = 'C123'

      const files = await mockClient.listFiles(channel)

      expect(files).toBeDefined()
      expect(files.length).toBeGreaterThan(0)
    })

    it('returns files with metadata', () => {
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

      const output = files.map((file) => ({ ...file }))

      expect(output).toHaveLength(2)
      expect(output[0].name).toBe('test.txt')
      expect(output[1].name).toBe('document.pdf')
    })
  })

  describe('file info', () => {
    it('shows file details', async () => {
      const fileId = 'F123'

      const files = await mockClient.listFiles()
      const file = files.find((f) => f.id === fileId)

      expect(file).toBeDefined()
      expect(file?.id).toBe(fileId)
      expect(file?.name).toBe('test.txt')
    })
  })

  describe('file download', () => {
    it('downloads file by ID', async () => {
      const fileId = 'F123'
      const result = await mockClient.downloadFile(fileId)

      expect(result.file.id).toBe(fileId)
      expect(result.file.name).toBe('test.txt')
      expect(result.buffer.toString()).toBe('downloaded content')
    })

    it('sanitizes filename to prevent path traversal', () => {
      const { basename } = require('node:path')
      const sanitize = (name: string) => basename(name.replace(/\\/g, '/'))

      expect(sanitize('../../../etc/passwd')).toBe('passwd')
      expect(sanitize('test.txt')).toBe('test.txt')
      expect(sanitize('/foo/bar/malicious.sh')).toBe('malicious.sh')
      expect(sanitize('..\\..\\windows\\system32\\evil.exe')).toBe('evil.exe')
    })
  })

  describe('output formatting', () => {
    it('includes file fields in output', () => {
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

      const output = { ...file }

      expect(output.id).toBeDefined()
      expect(output.name).toBe('test.txt')
    })

    it('formats multiple files', () => {
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

      const output = files.map((file) => ({ ...file }))

      expect(output).toHaveLength(2)
      expect(output[0].name).toBe('test.txt')
      expect(output[1].name).toBe('document.pdf')
    })
  })
})

const originalConsoleLog = console.log

import { CredentialManager } from '../credential-manager'
import { fileCommand } from './file'

const FIXTURE_DIR = '/tmp/agent-slack-file-cmd-test'
const FIXTURE_A = `${FIXTURE_DIR}/a.txt`
const FIXTURE_B = `${FIXTURE_DIR}/b.txt`

describe('file upload command action', () => {
  let consoleLogSpy: ReturnType<typeof mock>
  let processExitSpy: ReturnType<typeof spyOn>
  let getWorkspaceSpy: ReturnType<typeof spyOn>
  let loginSpy: ReturnType<typeof spyOn>
  let resolveChannelSpy: ReturnType<typeof spyOn>
  let uploadFileSpy: ReturnType<typeof spyOn>
  let uploadFilesSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mkdirSync(FIXTURE_DIR, { recursive: true })
    writeFileSync(FIXTURE_A, 'file a content')
    writeFileSync(FIXTURE_B, 'file b content')
    consoleLogSpy = mock((..._args: unknown[]) => {})
    console.log = consoleLogSpy
    processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)

    getWorkspaceSpy = spyOn(CredentialManager.prototype, 'getWorkspace').mockResolvedValue({
      token: 'xoxc-token',
      cookie: 'xoxd-cookie',
    } as Awaited<ReturnType<CredentialManager['getWorkspace']>>)
    loginSpy = spyOn(SlackClient.prototype, 'login').mockImplementation(function (this: SlackClient) {
      return Promise.resolve(this)
    })
    resolveChannelSpy = spyOn(SlackClient.prototype, 'resolveChannel').mockResolvedValue('C123')
    uploadFileSpy = spyOn(SlackClient.prototype, 'uploadFile').mockResolvedValue({
      id: 'F999',
      name: 'test.txt',
      title: 'test.txt',
      mimetype: 'text/plain',
      size: 12,
      url_private: 'https://files.slack.com/files-pri/T123-F999/test.txt',
      created: 1234567890,
      user: 'U123',
      channels: ['C123'],
    })
    uploadFilesSpy = spyOn(SlackClient.prototype, 'uploadFiles').mockResolvedValue([
      {
        id: 'F111',
        name: 'a.txt',
        title: 'shared',
        mimetype: 'text/plain',
        size: 5,
        url_private: 'https://files.slack.com/files-pri/T123-F111/a.txt',
        created: 1234567890,
        user: 'U123',
        channels: ['C123'],
      },
      {
        id: 'F222',
        name: 'b.txt',
        title: 'shared',
        mimetype: 'text/plain',
        size: 5,
        url_private: 'https://files.slack.com/files-pri/T123-F222/b.txt',
        created: 1234567891,
        user: 'U123',
        channels: ['C123'],
      },
    ])
  })

  afterEach(() => {
    console.log = originalConsoleLog
    processExitSpy.mockRestore()
    getWorkspaceSpy.mockRestore()
    loginSpy.mockRestore()
    resolveChannelSpy.mockRestore()
    uploadFileSpy.mockRestore()
    uploadFilesSpy.mockRestore()
  })

  it('uploads a single file through uploadFile and prints an object', async () => {
    await fileCommand.parseAsync(['upload', 'C123', FIXTURE_A], { from: 'user' })

    expect(uploadFileSpy).toHaveBeenCalledTimes(1)
    expect(uploadFilesSpy).not.toHaveBeenCalled()
    const [channels, _buffer, filename, opts] = uploadFileSpy.mock.calls[0] as any[]
    expect(channels).toEqual(['C123'])
    expect(filename).toBe('a.txt')
    expect(opts).toEqual({ thread_ts: undefined, title: undefined, initial_comment: undefined })
    const printed = JSON.parse(consoleLogSpy.mock.calls.at(-1)![0] as string)
    expect(Array.isArray(printed)).toBe(false)
    expect(printed.id).toBe('F999')
  })

  it('forwards --thread, --comment, and --title on the single-file path', async () => {
    await fileCommand.parseAsync(
      ['upload', 'C123', FIXTURE_A, '--thread', '1700.001', '--comment', 'hi', '--title', 'shot'],
      { from: 'user' },
    )

    const [_channels, _buffer, _filename, opts] = uploadFileSpy.mock.calls[0] as any[]
    expect(opts).toEqual({ thread_ts: '1700.001', title: 'shot', initial_comment: 'hi' })
  })

  it('uploads several files through uploadFiles and prints an array', async () => {
    await fileCommand.parseAsync(
      ['upload', 'C123', FIXTURE_A, FIXTURE_B, '--thread', '1700.001', '--comment', 'batch', '--title', 'shared'],
      { from: 'user' },
    )

    expect(uploadFilesSpy).toHaveBeenCalledTimes(1)
    expect(uploadFileSpy).not.toHaveBeenCalled()
    const [files, opts] = uploadFilesSpy.mock.calls[0] as any[]
    expect(files.map((f: any) => f.filename)).toEqual(['a.txt', 'b.txt'])
    expect(opts).toEqual({ channel: 'C123', threadTs: '1700.001', comment: 'batch', title: 'shared' })
    const printed = JSON.parse(consoleLogSpy.mock.calls.at(-1)![0] as string)
    expect(Array.isArray(printed)).toBe(true)
    expect(printed.map((f: any) => f.id)).toEqual(['F111', 'F222'])
  })

  it('rejects --filename with several files before uploading', async () => {
    processExitSpy.mockImplementation((code?: number) => {
      throw new Error(`exit ${code}`)
    })
    await expect(
      fileCommand.parseAsync(['upload', 'C123', FIXTURE_A, FIXTURE_B, '--filename', 'nope.txt'], { from: 'user' }),
    ).rejects.toThrow('exit 1')

    expect(uploadFilesSpy).not.toHaveBeenCalled()
    expect(uploadFileSpy).not.toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
    const printed = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
    expect(printed.error).toContain('--filename')
  })
})
