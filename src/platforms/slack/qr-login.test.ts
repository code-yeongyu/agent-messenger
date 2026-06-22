import { describe, expect, it } from 'bun:test'

import QRCode from 'qrcode'

import { SlackError } from '@/platforms/slack/client'
import { decodeQrImage, decodeSlackQr, parseSlackQrUrl } from '@/platforms/slack/qr-login'

const VALID_QR_URL =
  'https://app.slack.com/t/acme/login/z-app-1234567890-1234567890-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd?src=qr_code&user_id=U0123456789&team_id=T0123456789'

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 2, width: 256 })
}

describe('parseSlackQrUrl', () => {
  it('extracts workspace, team_id, and user_id from a valid Slack QR URL', () => {
    // Given a real-shaped Slack mobile sign-in URL
    // When parsed
    const result = parseSlackQrUrl(VALID_QR_URL)

    // Then the identifying fields are extracted
    expect(result.workspace).toBe('acme')
    expect(result.teamId).toBe('T0123456789')
    expect(result.userId).toBe('U0123456789')
    expect(result.url).toBe(VALID_QR_URL)
  })

  it('allows missing optional query params', () => {
    const url = 'https://app.slack.com/t/acme/login/z-app-1-2-abc'
    const result = parseSlackQrUrl(url)

    expect(result.workspace).toBe('acme')
    expect(result.teamId).toBeNull()
    expect(result.userId).toBeNull()
  })

  it('rejects a non-URL string', () => {
    expect(() => parseSlackQrUrl('not a url')).toThrow(SlackError)
  })

  it('rejects a non-Slack host', () => {
    expect(() => parseSlackQrUrl('https://evil.example.com/t/x/login/z-app-1')).toThrow(/not a Slack sign-in link/)
  })

  it('rejects http (non-https) URLs', () => {
    expect(() => parseSlackQrUrl('http://app.slack.com/t/x/login/z-app-1')).toThrow(SlackError)
  })

  it('rejects a Slack URL that is not a mobile sign-in link', () => {
    expect(() => parseSlackQrUrl('https://app.slack.com/client/T0123456789/C123')).toThrow(
      /not a Slack mobile sign-in link/,
    )
  })

  it('rejects a sign-in link with an unparseable workspace', () => {
    expect(() => parseSlackQrUrl('https://app.slack.com/login/z-app-1')).toThrow(/determine the workspace/)
  })
})

describe('decodeQrImage', () => {
  it('reads the encoded URL back from a generated QR PNG', async () => {
    // Given a QR PNG encoding the Slack URL
    const dataUrl = await qrDataUrl(VALID_QR_URL)

    // When decoded
    const decoded = decodeQrImage(dataUrl)

    // Then the original URL is recovered
    expect(decoded).toBe(VALID_QR_URL)
  })

  it('rejects a data URL without the PNG header', () => {
    expect(() => decodeQrImage('data:image/jpeg;base64,AAAA')).toThrow(/PNG data URL/)
  })

  it('rejects a PNG header with no data', () => {
    expect(() => decodeQrImage('data:image/png;base64,')).toThrow(/no image data/)
  })

  it('rejects a PNG header with non-PNG payload', () => {
    expect(() => decodeQrImage('data:image/png;base64,Zm9vYmFy')).toThrow(/valid PNG/)
  })
})

describe('decodeSlackQr', () => {
  it('decodes a QR PNG and parses the Slack login URL end to end', async () => {
    // Given a QR PNG encoding a valid Slack sign-in URL
    const dataUrl = await qrDataUrl(VALID_QR_URL)

    // When decoded end to end
    const result = decodeSlackQr(dataUrl)

    // Then both decode and parse succeed
    expect(result.workspace).toBe('acme')
    expect(result.teamId).toBe('T0123456789')
  })

  it('decodes the QR but rejects a non-Slack URL', async () => {
    const dataUrl = await qrDataUrl('https://example.com/whatever')

    expect(() => decodeSlackQr(dataUrl)).toThrow(SlackError)
  })
})
