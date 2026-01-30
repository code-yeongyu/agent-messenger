import { beforeEach, expect, mock, test } from 'bun:test'
import { infoAction, listAction, uploadAction } from './file'

mock.module('../client', () => ({
  DiscordClient: mock(() => ({
    uploadFile: mock(async () => ({
      id: 'file_123',
      filename: 'test.pdf',
      size: 1024,
      url: 'https://cdn.discordapp.com/attachments/123/456/test.pdf',
      content_type: 'application/pdf',
    })),
    listFiles: mock(async () => [
      {
        id: 'file_123',
        filename: 'test.pdf',
        size: 1024,
        url: 'https://cdn.discordapp.com/attachments/123/456/test.pdf',
        content_type: 'application/pdf',
      },
      {
        id: 'file_124',
        filename: 'image.png',
        size: 2048,
        url: 'https://cdn.discordapp.com/attachments/123/457/image.png',
        content_type: 'image/png',
      },
    ]),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(async () => ({
      token: 'test_token',
      current_guild: 'guild_123',
      guilds: {},
    })),
  })),
}))

mock.module('../../../shared/utils/output', () => ({
  formatOutput: (data: any, pretty?: boolean) => JSON.stringify(data, null, pretty ? 2 : 0),
}))

mock.module('../../../shared/utils/error-handler', () => ({
  handleError: (error: Error) => {
    console.error(error.message)
  },
}))

mock.module('node:fs', () => ({
  readFileSync: () => Buffer.from('test file content'),
}))

mock.module('node:path', () => ({
  resolve: (path: string) => path,
}))

beforeEach(() => {
  mock.restore()
})

test('upload: sends multipart request and returns file info', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await uploadAction('ch_456', '/path/to/test.pdf', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('test.pdf')
})

test('list: filters messages with attachments', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await listAction('ch_456', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('file_124')
})

test('info: returns single file details', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await infoAction('ch_456', 'file_123', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('test.pdf')
})
