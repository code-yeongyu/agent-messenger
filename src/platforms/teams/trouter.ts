import { gunzipSync } from 'node:zlib'

import type { TeamsAccountType } from './types'

// Trouter is Teams' internal real-time notification service. Protocol shape was
// reverse-engineered from the Teams web client and cross-checked against the
// open-source purple-teams and eisbaw/ost implementations. It speaks socket.io
// v1 (colon-prefixed frames) over a WebSocket, NOT engine.io.

const TROUTER_BOOTSTRAP_URL = 'https://go.trouter.teams.microsoft.com/v4/a'
// Personal/TFL accounts register against edge.skype.com; work accounts use
// teams.microsoft.com.
const REGISTRAR_URL_PERSONAL = 'https://edge.skype.com/registrar/prod/v2/registrations'
const REGISTRAR_URL_WORK = 'https://teams.microsoft.com/registrar/prod/V2/registrations'
const CLIENTINFO_VERSION = '27/1.0.0.2024101502'
const TC = JSON.stringify({ cv: '2024.04.01.1', ua: 'TeamsCDL', hr: '', v: CLIENTINFO_VERSION })
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Electron/35.3.0'
const REGISTRATION_TTL_SECONDS = 86400

export interface TrouterConnectParams {
  [key: string]: string
}

export interface TrouterInfo {
  socketio: string
  surl: string
  connectparams: TrouterConnectParams
  ccid?: string
}

export interface TrouterRequestFrame {
  id: number
  url?: string
  headers?: Record<string, string>
  body?: string
}

interface RegistrationSpec {
  appId: string
  templateKey: string
  pathSuffix: string
  productContext: string
}

const REGISTRATION_SPECS: RegistrationSpec[] = [
  {
    appId: 'NextGenCalling',
    templateKey: 'DesktopNgc_2.5:SkypeNgc',
    pathSuffix: 'NGCallManagerWin',
    productContext: '',
  },
  { appId: 'SkypeSpacesWeb', templateKey: 'SkypeSpacesWeb_2.4', pathSuffix: 'SkypeSpacesWeb', productContext: '' },
  { appId: 'TeamsCDLWebWorker', templateKey: 'TeamsCDLWebWorker_2.6', pathSuffix: '', productContext: 'TFL' },
]

export function buildTrouterQuery(info: TrouterInfo, endpointId: string): string {
  const params = new URLSearchParams()
  params.set('v', 'v4')
  for (const [key, value] of Object.entries(info.connectparams)) params.set(key, value)
  params.set('tc', TC)
  params.set('timeout', '40')
  params.set('auth', 'true')
  params.set('epid', endpointId)
  if (info.ccid) params.set('ccid', info.ccid)
  params.set('con_num', `${Date.now()}_1`)
  return params.toString()
}

export async function fetchTrouterInfo(skypeToken: string, endpointId: string): Promise<TrouterInfo> {
  const response = await fetch(`${TROUTER_BOOTSTRAP_URL}?epid=${encodeURIComponent(endpointId)}`, {
    method: 'POST',
    headers: { 'x-skypetoken': skypeToken, 'Content-Length': '0', 'User-Agent': USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`Trouter bootstrap failed: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as TrouterInfo
}

export async function fetchTrouterSessionId(
  info: TrouterInfo,
  skypeToken: string,
  endpointId: string,
): Promise<string> {
  const url = `${info.socketio}socket.io/1/?${buildTrouterQuery(info, endpointId)}`
  const response = await fetch(url, { headers: { 'X-Skypetoken': skypeToken, 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`Trouter handshake failed: ${response.status} ${response.statusText}`)
  }
  const body = await response.text()
  return body.split(':')[0]
}

export function buildWebSocketUrl(info: TrouterInfo, sessionId: string, endpointId: string): string {
  return `${info.socketio}socket.io/1/websocket/${sessionId}?${buildTrouterQuery(info, endpointId)}`
}

export function buildAuthenticateFrame(info: TrouterInfo, idToken: string): string {
  const message = {
    name: 'user.authenticate',
    args: [
      {
        headers: {
          'X-Ms-Test-User': 'False',
          Authorization: `Bearer ${idToken}`,
          'X-MS-Migration': 'True',
        },
        connectparams: info.connectparams,
      },
    ],
  }
  return `5:::${JSON.stringify(message)}`
}

export function buildActivityFrame(sequence: number): string {
  return `5:${sequence}::{"name":"user.activity","args":[{"state":"active"}]}`
}

export function buildPingFrame(sequence: number): string {
  return `5:${sequence}::{"name":"ping"}`
}

// Trouter delivers messages as socket.io "3:::" data frames, which require an
// HTTP-style 200 acknowledgement or the server marks the endpoint unresponsive
// and stops routing.
export function buildRequestAck(requestId: number): string {
  return `3:::${JSON.stringify({ id: requestId, status: 200, body: '' })}`
}

// Server "5:<id>+::" event frames must be acked with "6:<id>::" or trouter
// eventually drops the connection.
export function buildEventAck(frame: string): string | null {
  const match = frame.match(/^5:(\d+)\+?::/)
  return match ? `6:${match[1]}::` : null
}

export async function registerEndpoint(
  info: TrouterInfo,
  skypeToken: string,
  idToken: string,
  endpointId: string,
  accountType: TeamsAccountType,
  makeId: () => string,
): Promise<void> {
  const registrarUrl = accountType === 'personal' ? REGISTRAR_URL_PERSONAL : REGISTRAR_URL_WORK

  for (const spec of REGISTRATION_SPECS) {
    // The messaging worker must reuse the endpoint id; call apps get fresh ids.
    const registrationId = spec.appId === 'TeamsCDLWebWorker' ? endpointId : makeId()
    const payload = {
      clientDescription: {
        appId: spec.appId,
        aesKey: '',
        languageId: 'en-US',
        platform: 'edge',
        templateKey: spec.templateKey,
        platformUIVersion: CLIENTINFO_VERSION,
        productContext: accountType === 'personal' ? spec.productContext : '',
      },
      registrationId,
      nodeId: '',
      transports: { TROUTER: [{ context: '', path: `${info.surl}${spec.pathSuffix}`, ttl: REGISTRATION_TTL_SECONDS }] },
    }

    const response = await fetch(registrarUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Skypetoken': skypeToken,
        Authorization: `Bearer ${idToken}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Trouter registration for ${spec.appId} failed: ${response.status}`)
    }
  }
}

export function parseRequestFrame(frame: string): TrouterRequestFrame | null {
  if (!frame.startsWith('3:::')) return null
  try {
    const parsed = JSON.parse(frame.slice(4)) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const { id } = parsed as { id?: unknown }
    if (typeof id !== 'number' || !Number.isFinite(id)) return null
    return parsed as TrouterRequestFrame
  } catch {
    return null
  }
}

export function isMessageLossFrame(frame: string): boolean {
  if (!frame.startsWith('5:')) return false
  const jsonStart = frame.indexOf('{')
  if (jsonStart === -1) return false
  try {
    const payload = JSON.parse(frame.slice(jsonStart)) as { name?: string }
    return payload.name === 'trouter.message_loss'
  } catch {
    return false
  }
}

// Trouter message bodies may be gzip+base64 encoded, and nest a further encoded
// payload under `cp` (gzip+base64) or `gp` (base64).
export function decodeMessageBody(headers: Record<string, string>, body: string): Record<string, unknown> {
  let raw = body
  if (headers['X-Microsoft-Skype-Content-Encoding'] === 'gzip') {
    raw = gunzipSync(Buffer.from(body, 'base64')).toString('utf8')
  }
  const obj = JSON.parse(raw) as Record<string, unknown>
  if (typeof obj.cp === 'string') {
    return JSON.parse(gunzipSync(Buffer.from(obj.cp, 'base64')).toString('utf8')) as Record<string, unknown>
  }
  if (typeof obj.gp === 'string') {
    return JSON.parse(Buffer.from(obj.gp, 'base64').toString('utf8')) as Record<string, unknown>
  }
  return obj
}

export function extractChatId(link: string | undefined): string | null {
  if (!link) return null
  const match = link.match(/conversations\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// `id` is Teams' positional mention index (the content span's `itemid`); `mri`
// is the target's Skype MRI, present only via `properties.mentions` metadata.
export interface TrouterMention {
  id: string
  mri?: string
  displayName: string
}

// 1:1 chats resolve to a unique roster / one-to-one conversation id; anything on
// a thread (group chat OR team channel) shares the @thread.* family. The thread
// family alone cannot tell a group chat from a channel — that needs the
// conversation's groupId, which the realtime resource does not carry.
export function isThreadConversation(conversationId: string): boolean {
  return conversationId.includes('@thread.tacv2') || conversationId.includes('@thread.v2')
}

function parseJsonRecord(value: unknown): Record<string, unknown> | undefined {
  const source = typeof value === 'string' ? safeJsonParse(value) : value
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return undefined
  return source as Record<string, unknown>
}

function parseJsonArray(value: unknown): unknown[] | undefined {
  const source = typeof value === 'string' ? safeJsonParse(value) : value
  return Array.isArray(source) ? source : undefined
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

// Mentions arrive two ways: the authoritative `properties.mentions` array (JSON
// or JSON-string) carries real MRIs, while the message content only has
// positional `<span itemtype=".../Mention" itemid="N">Name</span>` markup with
// no MRI. Prefer the metadata; fall back to scraping the content spans so a
// mention is still surfaced when properties are missing. Never throws — bad
// data yields an empty list.
export function parseMentions(properties: unknown, content: string): TrouterMention[] {
  const fromProperties = parseMentionsFromProperties(properties)
  if (fromProperties.length > 0) return fromProperties
  return parseMentionsFromContent(content)
}

function parseMentionsFromProperties(properties: unknown): TrouterMention[] {
  const record = parseJsonRecord(properties)
  if (!record) return []
  const rawMentions = parseJsonArray(record.mentions)
  if (!rawMentions) return []

  const mentions: TrouterMention[] = []
  for (const entry of rawMentions) {
    if (typeof entry !== 'object' || entry === null) continue
    const item = entry as Record<string, unknown>
    const id = item.itemid
    if (typeof id !== 'string' && typeof id !== 'number') continue
    mentions.push({
      id: String(id),
      mri: typeof item.mri === 'string' ? item.mri : undefined,
      displayName: typeof item.displayName === 'string' ? item.displayName : '',
    })
  }
  return mentions
}

const MENTION_SPAN_REGEX = /<span\b[^>]*itemtype=["'][^"']*Mention[^"']*["'][^>]*>(.*?)<\/span>/gi

function parseMentionsFromContent(content: string): TrouterMention[] {
  const mentions: TrouterMention[] = []
  for (const match of content.matchAll(MENTION_SPAN_REGEX)) {
    const attributes = match[0]
    const itemId = attributes.match(/itemid=["']([^"']*)["']/i)?.[1]
    if (itemId === undefined) continue
    mentions.push({
      id: itemId,
      displayName: stripTags(match[1]),
    })
  }
  return mentions
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}
