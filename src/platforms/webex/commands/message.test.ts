import { afterEach, beforeEach, expect, spyOn, it } from 'bun:test'

import { WebexClient } from '../client'
import { toRestId } from '../id-normalizer'
import { WebexError } from '../types'

const messageId = toRestId('msg_123', 'MESSAGE')
const message2Id = toRestId('msg_124', 'MESSAGE')
const roomId = toRestId('space_456', 'ROOM')
const personId = toRestId('person_789', 'PEOPLE')

const mockMessage = {
  id: messageId,
  ref: 'msg_123',
  roomId,
  roomRef: 'space_456',
  roomType: 'group' as const,
  text: 'Hello world',
  html: '<p>Hello <a href="https://example.com">world</a></p>',
  personId,
  personRef: 'person_789',
  personEmail: 'user@example.com',
  created: '2025-01-29T10:00:00.000Z',
}

const mockMessage2 = {
  id: message2Id,
  ref: 'msg_124',
  roomId,
  roomRef: 'space_456',
  roomType: 'group' as const,
  text: 'Second message',
  html: '<p>Second message</p>',
  personId,
  personRef: 'person_789',
  personEmail: 'user@example.com',
  created: '2025-01-29T10:01:00.000Z',
}

import { deleteAction, dmAction, editAction, getAction, listAction, replyAction, sendAction } from './message'

let mockSendMessage: ReturnType<typeof spyOn>
let mockReplyToMessage: ReturnType<typeof spyOn>
let mockSendDirectMessage: ReturnType<typeof spyOn>
let mockListMessages: ReturnType<typeof spyOn>
let mockGetMessage: ReturnType<typeof spyOn>
let mockDeleteMessage: ReturnType<typeof spyOn>
let mockEditMessage: ReturnType<typeof spyOn>
let mockLogin: ReturnType<typeof spyOn>
let mockDispose: ReturnType<typeof spyOn>
let consoleLogSpy: ReturnType<typeof spyOn>
let stderrWriteSpy: ReturnType<typeof spyOn>
let processExitSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  mockLogin = spyOn(WebexClient.prototype, 'login').mockImplementation(async function (this: WebexClient) {
    return this
  })
  mockDispose = spyOn(WebexClient.prototype, 'dispose').mockResolvedValue(undefined)
  mockSendMessage = spyOn(WebexClient.prototype, 'sendMessage').mockResolvedValue(mockMessage)
  mockReplyToMessage = spyOn(WebexClient.prototype, 'replyToMessage').mockResolvedValue(mockMessage)
  mockSendDirectMessage = spyOn(WebexClient.prototype, 'sendDirectMessage').mockResolvedValue(mockMessage)
  mockListMessages = spyOn(WebexClient.prototype, 'listMessages').mockResolvedValue([mockMessage, mockMessage2])
  mockGetMessage = spyOn(WebexClient.prototype, 'getMessage').mockResolvedValue(mockMessage)
  mockDeleteMessage = spyOn(WebexClient.prototype, 'deleteMessage').mockResolvedValue(undefined)
  mockEditMessage = spyOn(WebexClient.prototype, 'editMessage').mockResolvedValue({
    ...mockMessage,
    text: 'Updated message',
  })

  consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
  stderrWriteSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
  processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never)
})

afterEach(() => {
  consoleLogSpy.mockRestore()
  stderrWriteSpy.mockRestore()
  processExitSpy.mockRestore()
  mockLogin.mockRestore()
  mockDispose.mockRestore()
  mockSendMessage.mockRestore()
  mockReplyToMessage.mockRestore()
  mockSendDirectMessage.mockRestore()
  mockListMessages.mockRestore()
  mockGetMessage.mockRestore()
  mockDeleteMessage.mockRestore()
  mockEditMessage.mockRestore()
})

it('calls sendMessage with correct args and outputs result', async () => {
  await sendAction('space_456', 'Hello world', { pretty: false })

  expect(mockSendMessage).toHaveBeenCalledWith('space_456', 'Hello world', {
    markdown: undefined,
  })
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
  expect(output.id).toBe(messageId)
  expect(output.ref).toBe('msg_123')
  expect(output.roomId).toBe(roomId)
  expect(output.roomRef).toBe('space_456')
  expect(output.personEmail).toBe('user@example.com')
  expect(mockDispose).toHaveBeenCalled()
})

it('passes markdown option when --markdown flag is set on send', async () => {
  await sendAction('space_456', '**bold**', { markdown: true, pretty: false })

  expect(mockSendMessage).toHaveBeenCalledWith('space_456', '**bold**', { markdown: true })
})

it('disposes the client when send fails', async () => {
  mockSendMessage.mockRejectedValue(new WebexError('Send failed', 'send_failed'))

  await sendAction('space_456', 'Hello world', { pretty: false })

  expect(mockDispose).toHaveBeenCalled()
})

it('exits with code 1 when not authenticated on send', async () => {
  mockLogin.mockRejectedValue(new WebexError('No Webex credentials found.', 'no_credentials'))

  await sendAction('space_456', 'Hello', { pretty: false })

  expect(mockSendMessage).not.toHaveBeenCalled()
  expect(processExitSpy).toHaveBeenCalledWith(1)
})

it('calls replyToMessage with parent id and outputs result', async () => {
  await replyAction('space_456', 'parent_123', 'Reply text', { pretty: false })

  expect(mockReplyToMessage).toHaveBeenCalledWith('space_456', 'parent_123', 'Reply text', {
    markdown: undefined,
  })
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = consoleLogSpy.mock.calls[0][0]
  expect(output).toContain('msg_123')
  expect(output).toContain('parent_123')
})

it('passes markdown option to replyToMessage when --markdown flag is set', async () => {
  await replyAction('space_456', 'parent_123', '**reply**', { markdown: true, pretty: false })

  expect(mockReplyToMessage).toHaveBeenCalledWith('space_456', 'parent_123', '**reply**', {
    markdown: true,
  })
})

it('calls sendDirectMessage with email and text', async () => {
  await dmAction('alice@example.com', 'Hello!', { pretty: false })

  expect(mockSendDirectMessage).toHaveBeenCalledWith('alice@example.com', 'Hello!', {
    markdown: undefined,
  })
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
  expect(output.ref).toBe('msg_123')
})

it('passes markdown option to sendDirectMessage when --markdown flag is set', async () => {
  await dmAction('alice@example.com', '**bold**', { markdown: true, pretty: false })

  expect(mockSendDirectMessage).toHaveBeenCalledWith('alice@example.com', '**bold**', {
    markdown: true,
  })
})

it('calls listMessages with limit and outputs array', async () => {
  await listAction('space_456', { limit: 50, pretty: false })

  expect(mockListMessages).toHaveBeenCalledWith('space_456', { max: 50 })
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
  expect(output[0].ref).toBe('msg_123')
  expect(output[1].ref).toBe('msg_124')
  expect(output[0].html).toContain('https://example.com')
})

it('calls getMessage with correct id and outputs result', async () => {
  await getAction('msg_123', { pretty: false })

  expect(mockGetMessage).toHaveBeenCalledWith('msg_123')
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
  expect(output.ref).toBe('msg_123')
  expect(output.personEmail).toBe('user@example.com')
  expect(output.html).toContain('https://example.com')
})

it('calls deleteMessage and outputs deleted id when --force flag is set', async () => {
  await deleteAction('msg_123', { force: true, pretty: false })

  expect(mockDeleteMessage).toHaveBeenCalledWith('msg_123')
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = consoleLogSpy.mock.calls[0][0]
  expect(output).toContain('deleted')
  expect(output).toContain('msg_123')
})

it('shows warning and does not delete without --force flag', async () => {
  await deleteAction('msg_123', { force: false, pretty: false })

  expect(processExitSpy).toHaveBeenCalledWith(0)
  expect(mockDeleteMessage).not.toHaveBeenCalled()
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = consoleLogSpy.mock.calls[0][0]
  expect(output).toContain('warning')
  expect(output).toContain('--force')
})

it('calls editMessage with roomId in args and outputs result', async () => {
  await editAction('msg_123', 'space_456', 'Updated message', { pretty: false })

  expect(mockEditMessage).toHaveBeenCalledWith('msg_123', 'space_456', 'Updated message', {
    markdown: undefined,
  })
  expect(consoleLogSpy).toHaveBeenCalled()
  const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
  expect(output.ref).toBe('msg_123')
  expect(output.text).toBe('Updated message')
  expect(mockDispose).toHaveBeenCalled()
})

it('passes markdown option to editMessage when --markdown flag is set', async () => {
  await editAction('msg_123', 'space_456', '**updated**', { markdown: true, pretty: false })

  expect(mockEditMessage).toHaveBeenCalledWith('msg_123', 'space_456', '**updated**', {
    markdown: true,
  })
})
