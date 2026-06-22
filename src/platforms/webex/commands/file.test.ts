import { afterEach, beforeEach, expect, it, spyOn } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { WebexClient } from '../client'
import { toRestId } from '../id-normalizer'

const roomId = toRestId('space_456', 'ROOM')

const mockMessage = {
  id: toRestId('msg_123', 'MESSAGE'),
  ref: 'msg_123',
  roomId,
  roomRef: 'space_456',
  roomType: 'group' as const,
  text: '',
  personId: toRestId('person_789', 'PEOPLE'),
  personRef: 'person_789',
  personEmail: 'user@example.com',
  files: ['https://files.wbx2.com/files/f1'],
  created: '2025-01-29T10:00:00.000Z',
}

import { downloadAction, uploadAction } from './file'

let mockUploadFile: ReturnType<typeof spyOn>
let mockDownloadContent: ReturnType<typeof spyOn>
let consoleLogSpy: ReturnType<typeof spyOn>
const protoSpies: ReturnType<typeof spyOn>[] = []
let workDir: string

function protoSpy(method: keyof WebexClient) {
  const s = spyOn(WebexClient.prototype, method as never)
  protoSpies.push(s)
  return s
}

beforeEach(() => {
  protoSpy('login').mockImplementation(async function (this: WebexClient) {
    return this
  })
  protoSpy('dispose').mockResolvedValue(undefined)
  mockUploadFile = protoSpy('uploadFile').mockResolvedValue(mockMessage)
  mockDownloadContent = protoSpy('downloadContent').mockResolvedValue({
    data: new TextEncoder().encode('file-bytes').buffer,
    filename: 'report.pdf',
    contentType: 'application/pdf',
  })
  consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
  workDir = mkdtempSync(join(tmpdir(), 'webex-file-test-'))
})

afterEach(() => {
  for (const s of protoSpies) s.mockRestore()
  protoSpies.length = 0
  consoleLogSpy.mockRestore()
  rmSync(workDir, { recursive: true, force: true })
})

it('upload reads the local file and forwards filename plus text to uploadFile', async () => {
  const filePath = join(workDir, 'note.txt')
  writeFileSync(filePath, 'hello world')

  await uploadAction(roomId, filePath, { text: 'see attached' })

  expect(mockUploadFile).toHaveBeenCalledTimes(1)
  const [space, file, options] = mockUploadFile.mock.calls[0] as [
    string,
    { content: Blob; filename: string },
    { text?: string },
  ]
  expect(space).toBe(roomId)
  expect(file.filename).toBe('note.txt')
  expect(options.text).toBe('see attached')
})

it('upload prints the resulting message with file urls', async () => {
  const filePath = join(workDir, 'note.txt')
  writeFileSync(filePath, 'hello world')

  await uploadAction(roomId, filePath, {})

  const printed = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string)
  expect(printed.id).toBe(mockMessage.id)
  expect(printed.files).toEqual(['https://files.wbx2.com/files/f1'])
})

it('download writes content to the given output path', async () => {
  const outPath = join(workDir, 'out.pdf')

  await downloadAction('https://webexapis.com/v1/contents/c1', outPath, {})

  expect(mockDownloadContent).toHaveBeenCalledWith('https://webexapis.com/v1/contents/c1')
  expect(readFileSync(outPath, 'utf8')).toBe('file-bytes')
})
