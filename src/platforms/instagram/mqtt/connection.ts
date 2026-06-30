import { deflateSync } from 'node:zlib'

import type { InstagramSessionState } from '../types'
import { ThriftCompactWriter } from './thrift'

const IG_APP_ID = 567067343352427n
const IG_VERSION = '312.1.0.34.111'
const CLIENT_CAPABILITIES = 183n
const PUBLISH_FORMAT = 1
const NETWORK_TYPE_WIFI = 1
const CLIENT_STACK = 3
const CLIENT_IDENTIFIER_MAX_LENGTH = 20
const SESSION_ID_MASK = 0xffffffffn

const CONNECT_SUBSCRIBE_TOPIC_IDS = [88, 135, 149, 150, 133, 146]

export function extractSessionId(session: InstagramSessionState): string {
  const authorization = session.authorization ?? ''
  const igTokenMatch = authorization.match(/^Bearer IGT:2:(.+)$/)
  if (igTokenMatch) {
    try {
      const decoded = JSON.parse(Buffer.from(igTokenMatch[1]!, 'base64').toString('utf8')) as { sessionid?: string }
      if (decoded.sessionid) return decoded.sessionid
    } catch {
      // Malformed/stale token: fall through to the cookie-based sessionid below.
    }
  }

  const cookieMatch = session.cookies.match(/sessionid=([^;]+)/)
  if (cookieMatch) return cookieMatch[1]!

  throw new Error('No sessionid found in Instagram session (checked authorization token and cookies)')
}

export function buildConnectPayload(session: InstagramSessionState): Buffer {
  const sessionId = extractSessionId(session)
  const userId = BigInt(session.user_id ?? '0')
  const deviceId = session.device.phone_id
  const userAgent = `Instagram ${IG_VERSION} Android (${session.device.device_string})`

  const thrift = new ThriftCompactWriter()
    .binary(1, deviceId.substring(0, CLIENT_IDENTIFIER_MAX_LENGTH))
    .structStart(4)
    .i64(1, userId)
    .binary(2, userAgent)
    .i64(3, CLIENT_CAPABILITIES)
    .i64(4, 0)
    .i32(5, PUBLISH_FORMAT)
    .bool(6, false)
    .bool(7, true)
    .binary(8, deviceId)
    .bool(9, true)
    .i32(10, NETWORK_TYPE_WIFI)
    .i32(11, 0)
    .i64(12, BigInt(Date.now()) & SESSION_ID_MASK)
    .listOfI32(14, CONNECT_SUBSCRIBE_TOPIC_IDS)
    .binary(15, 'cookie_auth')
    .i64(16, IG_APP_ID)
    .binary(20, '')
    .byte(21, CLIENT_STACK)
    .structEnd()
    .binary(5, `sessionid=${sessionId}`)
    .mapBinaryBinary(10, {
      platform: 'android',
      ig_mqtt_route: 'django',
      pubsub_msg_type_blacklist: 'direct, typing_type',
      auth_cache_enabled: '0',
    })
    .finish()

  return deflateSync(thrift, { level: 9 })
}
