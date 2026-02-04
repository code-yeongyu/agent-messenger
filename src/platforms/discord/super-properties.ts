const SUPER_PROPERTIES = {
  os: 'Mac OS X',
  browser: 'Discord Client',
  release_channel: 'stable',
  client_version: '1.0.9210',
  os_version: '24.3.0',
  os_arch: 'arm64',
  app_arch: 'arm64',
  system_locale: 'en-US',
  browser_user_agent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9210 Chrome/134.0.0.0 Electron/35.3.0 Safari/537.36',
  browser_version: '134.0.0.0',
  client_build_number: 366629,
  native_build_number: 64292,
  client_event_source: null,
  design_id: 0,
}

const USER_AGENT = 'Discord/1.0.9210 Chrome/134.0.0.0 Electron/35.3.0'

function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
}

export function getDiscordHeaders(token: string): Record<string, string> {
  const superPropertiesBase64 = btoa(JSON.stringify(SUPER_PROPERTIES))

  return {
    Authorization: token,
    'User-Agent': USER_AGENT,
    'X-Super-Properties': superPropertiesBase64,
    'X-Discord-Locale': 'en-US',
    'X-Discord-Timezone': getSystemTimezone(),
    'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
  }
}

export function humanDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export function typingDelay(text: string): Promise<void> {
  const baseDelay = 50
  const variance = 30
  const delayPerChar = baseDelay + Math.random() * variance
  const totalDelay = Math.min(text.length * delayPerChar, 5000)
  return new Promise((resolve) => setTimeout(resolve, totalDelay))
}
