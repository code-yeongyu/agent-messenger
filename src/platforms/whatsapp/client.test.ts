import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { WAMessage } from '@whiskeysockets/baileys'

import { WhatsAppClient } from './client'

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
    // Given: a logged-in client carrying a cached WAMessage whose imageMessage holds Buffer fields
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

    // When: persisting to disk and reloading into a fresh client at the same authDir
    await asInternals(writer).saveStore()

    const reader = await new WhatsAppClient().login({ authDir })
    await asInternals(reader).loadStore()

    // Then: the binary fields survive as real Buffers — no keyed-object corruption
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
