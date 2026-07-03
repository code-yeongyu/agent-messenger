import { expect, it } from 'bun:test'
import { gzipSync } from 'node:zlib'

import {
  buildActivityFrame,
  buildAuthenticateFrame,
  buildEventAck,
  buildPingFrame,
  buildRequestAck,
  buildWebSocketUrl,
  decodeMessageBody,
  extractChatId,
  isMessageLossFrame,
  parseRequestFrame,
  type TrouterInfo,
} from './trouter'

const info: TrouterInfo = {
  socketio: 'https://pub-ent-test.trouter.teams.microsoft.com:443/',
  surl: 'https://pub-ent-test.trouter.teams.microsoft.com:3443/v4/f/HASH/',
  connectparams: { sr: 'abc', issuer: 'prod-2', sig: 'xyz' },
}

it('buildWebSocketUrl targets the socket.io v1 websocket path', () => {
  const url = buildWebSocketUrl(info, 'SESSION123', 'endpoint-uuid')
  expect(url.startsWith(`${info.socketio}socket.io/1/websocket/SESSION123?`)).toBe(true)
  expect(url).toContain('epid=endpoint-uuid')
  expect(url).toContain('sr=abc')
  expect(url).toContain('auth=true')
})

it('buildAuthenticateFrame embeds the Bearer id_token and connectparams', () => {
  const frame = buildAuthenticateFrame(info, 'ID_TOKEN')
  expect(frame.startsWith('5:::')).toBe(true)
  const payload = JSON.parse(frame.slice(4))
  expect(payload.name).toBe('user.authenticate')
  expect(payload.args[0].headers.Authorization).toBe('Bearer ID_TOKEN')
  expect(payload.args[0].connectparams).toEqual(info.connectparams)
})

it('buildActivityFrame and buildPingFrame use the sequence number', () => {
  expect(buildActivityFrame(3)).toBe('5:3::{"name":"user.activity","args":[{"state":"active"}]}')
  expect(buildPingFrame(7)).toBe('5:7::{"name":"ping"}')
})

it('buildRequestAck returns a 200 ack for the request id', () => {
  const ack = buildRequestAck(42)
  expect(ack.startsWith('3:::')).toBe(true)
  expect(JSON.parse(ack.slice(4))).toEqual({ id: 42, status: 200, body: '' })
})

it('buildEventAck acks numbered event frames and ignores others', () => {
  expect(buildEventAck('5:12::{"name":"trouter.message_loss"}')).toBe('6:12::')
  expect(buildEventAck('5:9+::{"name":"x"}')).toBe('6:9::')
  expect(buildEventAck('1::')).toBeNull()
  expect(buildEventAck('6:::1["pong"]')).toBeNull()
})

it('parseRequestFrame parses 3::: frames and rejects others', () => {
  const frame = '3:::{"id":1,"method":"POST","url":"/v4/f/HASH/messaging","body":"{}"}'
  const parsed = parseRequestFrame(frame)
  expect(parsed?.id).toBe(1)
  expect(parsed?.url).toBe('/v4/f/HASH/messaging')
  expect(parseRequestFrame('5:1::{}')).toBeNull()
  expect(parseRequestFrame('3:::not-json')).toBeNull()
})

it('parseRequestFrame rejects frames without a numeric id', () => {
  expect(parseRequestFrame('3:::{"url":"/x/messaging"}')).toBeNull()
  expect(parseRequestFrame('3:::{"id":"abc"}')).toBeNull()
  expect(parseRequestFrame('3:::"just-a-string"')).toBeNull()
  expect(parseRequestFrame('3:::null')).toBeNull()
})

it('isMessageLossFrame detects trouter.message_loss events', () => {
  expect(isMessageLossFrame('5:2::{"name":"trouter.message_loss","args":[{}]}')).toBe(true)
  expect(isMessageLossFrame('5:1::{"name":"trouter.connected","args":[{}]}')).toBe(false)
  expect(isMessageLossFrame('1::')).toBe(false)
})

it('extractChatId pulls the conversation id from a link', () => {
  expect(extractChatId('https://notifications.skype.net/v1/users/ME/conversations/19:uni01_abc@thread.v2')).toBe(
    '19:uni01_abc@thread.v2',
  )
  expect(extractChatId('https://x/conversations/19:uni01_abc@thread.v2/messages/123')).toBe('19:uni01_abc@thread.v2')
  expect(extractChatId(undefined)).toBeNull()
  expect(extractChatId('no-conversation-here')).toBeNull()
})

it('decodeMessageBody parses plain JSON bodies', () => {
  const body = JSON.stringify({ resourceType: 'NewMessage', resource: { id: '1' } })
  expect(decodeMessageBody({}, body)).toEqual({ resourceType: 'NewMessage', resource: { id: '1' } })
})

it('decodeMessageBody inflates gzip+base64 bodies', () => {
  const inner = JSON.stringify({ resourceType: 'NewMessage' })
  const gzipped = gzipSync(Buffer.from(inner)).toString('base64')
  const decoded = decodeMessageBody({ 'X-Microsoft-Skype-Content-Encoding': 'gzip' }, gzipped)
  expect(decoded).toEqual({ resourceType: 'NewMessage' })
})

it('decodeMessageBody unwraps nested cp (gzip+base64) payloads', () => {
  const inner = JSON.stringify({ resourceType: 'NewMessage', resource: { content: 'hi' } })
  const cp = gzipSync(Buffer.from(inner)).toString('base64')
  const decoded = decodeMessageBody({}, JSON.stringify({ cp }))
  expect(decoded).toEqual({ resourceType: 'NewMessage', resource: { content: 'hi' } })
})

it('decodeMessageBody unwraps nested gp (base64) payloads', () => {
  const inner = JSON.stringify({ resourceType: 'NewMessage' })
  const gp = Buffer.from(inner).toString('base64')
  const decoded = decodeMessageBody({}, JSON.stringify({ gp }))
  expect(decoded).toEqual({ resourceType: 'NewMessage' })
})
