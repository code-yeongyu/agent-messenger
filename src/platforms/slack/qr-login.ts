import jsQR from 'jsqr'
import { PNG } from 'pngjs'

import { SlackError } from './client'

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'

// Slack's "Sign in on Mobile" QR encodes a login URL of the form:
//   https://app.slack.com/t/<workspace>/login/z-app-<app_id>-<secret>?src=qr_code&user_id=...&team_id=...
// The `z-app-` segment is the single-use cross-device auth secret; `src=qr_code` marks the source.
const SLACK_QR_HOST = 'app.slack.com'
const SLACK_QR_PATH_SEGMENT = '/login/z-app-'

export interface SlackQrLogin {
  url: string
  workspace: string
  teamId: string | null
  userId: string | null
}

export function decodeQrImage(dataUrl: string): string {
  const png = decodePngDataUrl(dataUrl)
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  if (!result) {
    throw new SlackError('Could not read a QR code from the image.', 'qr_unreadable')
  }
  return result.data
}

export function parseSlackQrUrl(raw: string): SlackQrLogin {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new SlackError('QR code does not contain a valid URL.', 'qr_invalid_url')
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== SLACK_QR_HOST) {
    throw new SlackError(`QR code is not a Slack sign-in link (expected https://${SLACK_QR_HOST}).`, 'qr_not_slack')
  }

  if (!parsed.pathname.includes(SLACK_QR_PATH_SEGMENT)) {
    throw new SlackError('QR code is not a Slack mobile sign-in link.', 'qr_not_signin')
  }

  const workspace = extractWorkspace(parsed.pathname)
  if (!workspace) {
    throw new SlackError('Could not determine the workspace from the QR code.', 'qr_no_workspace')
  }

  return {
    url: parsed.toString(),
    workspace,
    teamId: parsed.searchParams.get('team_id'),
    userId: parsed.searchParams.get('user_id'),
  }
}

export function decodeSlackQr(dataUrl: string): SlackQrLogin {
  return parseSlackQrUrl(decodeQrImage(dataUrl))
}

function extractWorkspace(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)\/login\/z-app-/)
  return match ? match[1] : null
}

function decodePngDataUrl(dataUrl: string): PNG {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new SlackError(`Expected a PNG data URL starting with "${PNG_DATA_URL_PREFIX}".`, 'qr_invalid_header')
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  if (!base64) {
    throw new SlackError('QR data URL contains no image data.', 'qr_no_data')
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, 'base64')
  } catch {
    throw new SlackError('QR data URL is not valid base64.', 'qr_invalid_base64')
  }

  try {
    return PNG.sync.read(buffer)
  } catch {
    throw new SlackError('QR data URL is not a valid PNG image.', 'qr_invalid_png')
  }
}
