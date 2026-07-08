import { describe, expect, it } from 'bun:test'

import type { WAMessage } from '@whiskeysockets/baileys'

import { summarizeMessage } from '@/platforms/whatsapp/client'

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
