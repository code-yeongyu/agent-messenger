import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { WAMessage } from '@whiskeysockets/baileys'

import { summarizeMessage, WhatsAppClient } from './client'

type WhatsAppClientInternals = {
  messages: Map<string, WAMessage[]>
  saveStore(): Promise<void>
  loadStore(): Promise<void>
}

function asInternals(client: WhatsAppClient): WhatsAppClientInternals {
  return client as unknown as WhatsAppClientInternals
}

describe('WhatsAppClient store persistence', () => {
  let tempDir: string
  let authDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wa-client-test-'))
    authDir = join(tempDir, 'auth')
    await mkdir(authDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('round-trips a media WAMessage with binary fields through saveStore/loadStore', async () => {
    const fileEncSha256 = Buffer.from('fakeshafileenc1234567890123456789012')
    const fileSha256 = Buffer.from('fakeshafile1234567890123456789012345')
    const mediaKey = Buffer.from('mediakey1234567890123456789012345678')
    const cached: WAMessage = {
      key: { remoteJid: '12025551234@s.whatsapp.net', fromMe: false, id: 'media-msg-1' },
      message: {
        imageMessage: {
          fileEncSha256,
          fileSha256,
          mediaKey,
          url: 'https://mmg.whatsapp.net/v/test',
          mimetype: 'image/jpeg',
        },
      },
      messageTimestamp: 1700000000,
    } as unknown as WAMessage

    const writer = await new WhatsAppClient().login({ authDir })
    asInternals(writer).messages.set('12025551234@s.whatsapp.net', [cached])

    await asInternals(writer).saveStore()

    const reader = await new WhatsAppClient().login({ authDir })
    await asInternals(reader).loadStore()

    const restored = asInternals(reader).messages.get('12025551234@s.whatsapp.net')?.[0]
    expect(restored).toBeDefined()
    expect(restored!.key.id).toBe('media-msg-1')

    const img = restored!.message?.imageMessage
    expect(img).toBeDefined()
    expect(Buffer.isBuffer(img!.fileEncSha256)).toBe(true)
    expect((img!.fileEncSha256 as Buffer).equals(fileEncSha256)).toBe(true)
    expect(Buffer.isBuffer(img!.fileSha256)).toBe(true)
    expect((img!.fileSha256 as Buffer).equals(fileSha256)).toBe(true)
    expect(Buffer.isBuffer(img!.mediaKey)).toBe(true)
    expect((img!.mediaKey as Buffer).equals(mediaKey)).toBe(true)
  })
})

describe('summarizeMessage', () => {
  it('summarizes a plain text message', () => {
    const msg = {
      key: { id: 'msg-1', remoteJid: '12025551234@s.whatsapp.net', fromMe: true },
      messageTimestamp: 1_700_000_000,
      message: { conversation: 'Hello' },
    } as unknown as WAMessage

    const summary = summarizeMessage(msg)

    expect(summary.id).toBe('msg-1')
    expect(summary.type).toBe('text')
    expect(summary.text).toBe('Hello')
  })

  it('unwraps a Baileys edit protocolMessage to the edited content', () => {
    const msg = {
      key: { id: 'msg-2', remoteJid: '12025551234@s.whatsapp.net', fromMe: true },
      messageTimestamp: 1_700_000_100,
      message: {
        protocolMessage: {
          type: 14,
          editedMessage: { conversation: 'Edited text' },
        },
      },
    } as unknown as WAMessage

    const summary = summarizeMessage(msg)

    expect(summary.id).toBe('msg-2')
    expect(summary.type).toBe('text')
    expect(summary.text).toBe('Edited text')
  })

  it('unwraps an edit that uses extendedTextMessage', () => {
    const msg = {
      key: { id: 'msg-3', remoteJid: '12025551234@s.whatsapp.net', fromMe: true },
      messageTimestamp: 1_700_000_200,
      message: {
        protocolMessage: {
          type: 14,
          editedMessage: { extendedTextMessage: { text: 'Edited via extended' } },
        },
      },
    } as unknown as WAMessage

    const summary = summarizeMessage(msg)

    expect(summary.type).toBe('text')
    expect(summary.text).toBe('Edited via extended')
  })
})
