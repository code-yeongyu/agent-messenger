import { randomUUID } from 'node:crypto'

const CLIENT_BUILD_NUMBER = 492000
const NATIVE_BUILD_NUMBER = 69976
const CLIENT_VERSION = '1.0.9210'
const ELECTRON_VERSION = '35.3.0'
const CHROME_VERSION = '134.0.6998.205'

interface SuperProperties {
  os: string
  browser: string
  device: string
  system_locale: string
  browser_user_agent: string
  browser_version: string
  os_version: string
  os_arch?: string
  app_arch?: string
  os_sdk_version?: string
  referrer: string
  referring_domain: string
  referrer_current: string
  referring_domain_current: string
  release_channel: string
  client_build_number: number
  native_build_number?: number
  client_version?: string
  client_event_source: null
  client_launch_id: string
  launch_signature: string
  client_heartbeat_session_id: string
  has_client_mods: boolean
}

// Discord encodes client mod detection in specific UUID bits (BetterDiscord, Vencord, etc.)
// We clear these bits to appear as unmodified client
// @see https://docs.discord.food/reference#launch-signature
function generateLaunchSignature(): string {
  const modDetectionBits = BigInt(
    '0b00000000100000000001000000010000000010000001000000001000000000000010000010000001000000000100000000000001000000000000100000000000'
  )

  const randomInt = BigInt('0x' + randomUUID().replace(/-/g, ''))
  const cleanInt = randomInt & ~modDetectionBits & ((BigInt(1) << BigInt(128)) - BigInt(1))

  const hex = cleanInt.toString(16).padStart(32, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function detectOS(): { os: string; osVersion: string; osArch: string; osSdkVersion?: string } {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  switch (process.platform) {
    case 'darwin':
      return { os: 'Mac OS X', osVersion: '10.15.7', osArch: arch }
    case 'win32':
      return { os: 'Windows', osVersion: '10.0.26100', osArch: arch, osSdkVersion: '26100' }
    case 'linux':
      return { os: 'Linux', osVersion: '6.5.0', osArch: arch }
    default:
      return { os: 'Windows', osVersion: '10.0.26100', osArch: 'x64' }
  }
}

export function generateUserAgent(): string {
  const { os } = detectOS()
  const base = `discord/${CLIENT_VERSION} Chrome/${CHROME_VERSION} Electron/${ELECTRON_VERSION} Safari/537.36`

  if (os === 'Mac OS X') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${base}`
  } else if (os === 'Windows') {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${base}`
  }
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${base}`
}

export function generateSuperProperties(): SuperProperties {
  const { os, osVersion, osArch, osSdkVersion } = detectOS()

  const props: SuperProperties = {
    os,
    browser: 'Discord Client',
    device: '',
    system_locale: 'en-US',
    browser_user_agent: generateUserAgent(),
    browser_version: ELECTRON_VERSION,
    os_version: osVersion,
    referrer: '',
    referring_domain: '',
    referrer_current: '',
    referring_domain_current: '',
    release_channel: 'stable',
    client_build_number: CLIENT_BUILD_NUMBER,
    client_event_source: null,
    client_launch_id: randomUUID(),
    launch_signature: generateLaunchSignature(),
    client_heartbeat_session_id: randomUUID(),
    has_client_mods: false,
  }

  if (osArch) {
    props.os_arch = osArch
    props.app_arch = osArch
  }
  if (osSdkVersion) {
    props.os_sdk_version = osSdkVersion
  }
  if (os === 'Windows' || os === 'Mac OS X') {
    props.native_build_number = NATIVE_BUILD_NUMBER
    props.client_version = CLIENT_VERSION
  }

  return props
}

export function encodeSuperProperties(props: SuperProperties): string {
  return Buffer.from(JSON.stringify(props)).toString('base64')
}

export function generateXSuperProperties(): string {
  return encodeSuperProperties(generateSuperProperties())
}

export function getDiscordHeaders(token: string): Record<string, string> {
  const { os } = detectOS()

  return {
    Authorization: token,
    'User-Agent': generateUserAgent(),
    'X-Super-Properties': generateXSuperProperties(),
    'X-Discord-Locale': 'en-US',
    'X-Discord-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'X-Debug-Options': 'bugReporterEnabled',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/json',
    Origin: 'https://discord.com',
    Referer: 'https://discord.com/channels/@me',
    'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${os === 'Mac OS X' ? 'macOS' : os}"`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  }
}

export function humanDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export function typingDelay(text: string): Promise<void> {
  const baseDelay = text.length * (50 + Math.random() * 100)
  const thinkingPause = Math.random() * 500
  return new Promise((resolve) => setTimeout(resolve, baseDelay + thinkingPause))
}
