import { afterEach, beforeEach, expect, mock, spyOn, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { TeamsClient } from '../client'
import { TeamsCredentialManager } from '../credential-manager'
import { TeamsAuthCapabilityError } from '../types'
import { downloadAction, infoAction, listAction, uploadAction } from './file'

let clientUploadFileSpy: ReturnType<typeof spyOn>
let clientListFilesSpy: ReturnType<typeof spyOn>
let clientDownloadFileSpy: ReturnType<typeof spyOn>
let credManagerLoadConfigSpy: ReturnType<typeof spyOn>
let processExitSpy: ReturnType<typeof spyOn>
const tempDirs: string[] = []
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalCwd = process.cwd()

beforeEach(() => {
  clientUploadFileSpy = spyOn(TeamsClient.prototype, 'uploadFile').mockResolvedValue({
    id: 'file_123',
    name: 'test.pdf',
    size: 1024,
    url: 'https://teams.microsoft.com/files/123/test.pdf',
    contentType: 'application/pdf',
  })

  clientListFilesSpy = spyOn(TeamsClient.prototype, 'listFiles').mockResolvedValue([
    {
      id: 'file_123',
      name: 'test.pdf',
      size: 1024,
      url: 'https://teams.microsoft.com/files/123/test.pdf',
      contentType: 'application/pdf',
    },
    {
      id: 'file_124',
      name: 'image.png',
      size: 2048,
      url: 'https://teams.microsoft.com/files/124/image.png',
      contentType: 'image/png',
    },
  ])

  clientDownloadFileSpy = spyOn(TeamsClient.prototype, 'downloadFile').mockResolvedValue({
    buffer: Buffer.from('downloaded-content'),
    file: {
      id: 'file_123',
      name: 'folder\\test.pdf',
      size: 18,
      url: 'https://teams.microsoft.com/files/123/test.pdf',
      contentType: 'application/pdf',
    },
  })

  credManagerLoadConfigSpy = spyOn(TeamsCredentialManager.prototype, 'loadConfig').mockResolvedValue({
    current_account: 'work',
    accounts: {
      work: {
        token: 'test_token',
        account_type: 'work' as const,
        current_team: 'team_123',
        teams: { team_123: { team_id: 'team_123', team_name: 'Test Team' } },
      },
    },
  })

  processExitSpy = spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
    throw new Error(`process.exit:${code ?? 0}`)
  })
})

afterEach(() => {
  clientUploadFileSpy?.mockRestore()
  clientListFilesSpy?.mockRestore()
  clientDownloadFileSpy?.mockRestore()
  credManagerLoadConfigSpy?.mockRestore()
  processExitSpy?.mockRestore()
  console.log = originalConsoleLog
  console.error = originalConsoleError
  process.chdir(originalCwd)
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

it('upload: sends multipart request and returns file info', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await uploadAction('team_123', 'ch_456', '/path/to/test.pdf', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('test.pdf')
})

it('list: returns files in channel', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await listAction('team_123', 'ch_456', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('file_124')
})

it('info: returns single file details', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy

  await infoAction('team_123', 'ch_456', 'file_123', { pretty: false })

  expect(consoleSpy).toHaveBeenCalled()
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain('file_123')
  expect(output).toContain('test.pdf')
})

it('download: writes to a directory using a safe basename', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy
  const dir = mkdtempSync(join(tmpdir(), 'teams-download-dir-'))
  tempDirs.push(dir)

  await downloadAction('team_123', 'ch_456', 'file_123', dir, { pretty: false })

  const downloadedPath = join(dir, 'test.pdf')
  expect(readFileSync(downloadedPath, 'utf8')).toBe('downloaded-content')
  expect(clientDownloadFileSpy).toHaveBeenCalledWith('team_123', 'ch_456', 'file_123')
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain(downloadedPath)
})

it('download: writes to an explicit output file path', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy
  const dir = mkdtempSync(join(tmpdir(), 'teams-download-file-'))
  tempDirs.push(dir)
  const outputPath = join(dir, 'renamed.pdf')

  await downloadAction('team_123', 'ch_456', 'file_123', outputPath, { pretty: false })

  expect(readFileSync(outputPath, 'utf8')).toBe('downloaded-content')
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain(outputPath)
})

it('download: writes to cwd when output path is omitted', async () => {
  const consoleSpy = mock((_msg: string) => {})
  console.log = consoleSpy
  const dir = mkdtempSync(join(tmpdir(), 'teams-download-cwd-'))
  tempDirs.push(dir)
  process.chdir(dir)

  await downloadAction('team_123', 'ch_456', 'file_123', undefined, { pretty: false })

  const downloadedPath = join(dir, 'test.pdf')
  expect(readFileSync(downloadedPath, 'utf8')).toBe('downloaded-content')
  const output = consoleSpy.mock.calls[0][0]
  expect(output).toContain(downloadedPath)
})

it('download: exits on capability error without writing a partial file', async () => {
  const consoleErrorSpy = mock((_msg: string) => {})
  console.error = consoleErrorSpy
  const dir = mkdtempSync(join(tmpdir(), 'teams-download-capability-'))
  tempDirs.push(dir)
  const outputPath = join(dir, 'sharepoint.docx')
  clientDownloadFileSpy.mockRejectedValue(new TeamsAuthCapabilityError())

  await expect(downloadAction('team_123', 'ch_456', 'file_123', outputPath, { pretty: false })).rejects.toThrow(
    'process.exit:1',
  )

  expect(existsSync(outputPath)).toBe(false)
  expect(consoleErrorSpy.mock.calls[0][0]).toContain('Requires `agent-teams auth login`')
})
