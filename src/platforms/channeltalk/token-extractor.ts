import { execSync } from 'node:child_process'
import { pbkdf2Sync } from 'node:crypto'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  BROWSER_KEYCHAIN_VARIANTS,
  CHROMIUM_BROWSERS,
  ChromiumCookieDecryptor,
  ChromiumCookieReader,
  discoverBrowserProfileDirs,
  findLocalStatePath,
  getBrowserBasePath,
  getAgentBrowserProfileDirs,
} from '@/shared/chromium'
import type { KeychainVariant } from '@/shared/chromium'

import type { ExtractedChannelToken } from './types'

type CookieRow = { name: string; value: string; encrypted_value: Uint8Array | Buffer; host_key: string }

// Channel Talk was rebranded to Channel Works: the desktop app now stores its cookies under a
// "Channel Works" directory. Both names are probed, newest first, so upgraded and legacy
// installs (which keep the old directory around) both resolve.
const APP_DIR_NAMES = ['Channel Works', 'Channel Talk']

// Cookies for the rebranded channel.works domain and the legacy channel.io domain can coexist in
// one profile, most likely on a browser that was signed in before and after the rebrand.
const COOKIE_DOMAINS = ['channel.works', 'channel.io']

/**
 * Match a cookie's host key against a domain on an exact label boundary: the domain itself, or a
 * subdomain of it.
 *
 * Substring matching is not good enough here. `host_key LIKE '%.channel.works%'` also admits an
 * unrelated host such as `.channel.works.example.com`, so a cookie planted by anyone who controls
 * a name of that shape could shadow the real one and be sent to the Channel API as our identity.
 */
function hostMatchesDomain(hostKey: string, domain: string): boolean {
  const host = hostKey.startsWith('.') ? hostKey.slice(1) : hostKey
  return host === domain || host.endsWith(`.${domain}`)
}

// Mirrors hostMatchesDomain in SQL so the database does the same boundary-aware narrowing. The
// domains are hardcoded constants, never caller input, so interpolating them is safe.
const COOKIE_HOST_FILTER = COOKIE_DOMAINS.map((domain) => `host_key = '${domain}' OR host_key LIKE '%.${domain}'`).join(
  ' OR ',
)

const COOKIE_QUERY = `
  SELECT name, value, encrypted_value, host_key FROM cookies
  WHERE name IN ('x-account', 'ch-session-1', 'ch-session')
  AND (${COOKIE_HOST_FILTER})
`

function findExistingAppDir(bases: string[]): string | null {
  for (const base of bases) {
    for (const name of APP_DIR_NAMES) {
      const appDir = join(base, name)
      if (existsSync(appDir)) return appDir
    }
  }
  return null
}

/**
 * Split cookie rows into one group per domain, newest domain first, dropping domains with no rows.
 *
 * Callers resolve a credential pair from a single group rather than from all rows at once. That
 * keeps `x-account` and its session cookie from being read off different domains, which would pair
 * an identity with a session that does not belong to it, and it stops a leftover legacy cookie from
 * shadowing a live channel.works one.
 */
function groupRowsByDomain(rows: CookieRow[]): CookieRow[][] {
  return COOKIE_DOMAINS.map((domain) => rows.filter((row) => hostMatchesDomain(row.host_key, domain))).filter(
    (group) => group.length > 0,
  )
}

export class ChannelTokenExtractor {
  private platform: NodeJS.Platform
  private decryptor: ChromiumCookieDecryptor
  private cookieReader: ChromiumCookieReader
  private customBrowserProfileDirs: string[]

  constructor(platform?: NodeJS.Platform, customBrowserProfileDirs?: string[]) {
    this.platform = platform ?? process.platform
    this.customBrowserProfileDirs = customBrowserProfileDirs ?? []
    this.cookieReader = new ChromiumCookieReader()
    this.decryptor = new ChromiumCookieDecryptor({ platform: this.platform })
  }

  getAppDataDir(): string | null {
    switch (this.platform) {
      case 'darwin': {
        const sandboxedBase = join(
          homedir(),
          'Library',
          'Containers',
          'com.zoyi.channel.desk.osx',
          'Data',
          'Library',
          'Application Support',
        )
        const directBase = join(homedir(), 'Library', 'Application Support')
        return findExistingAppDir([sandboxedBase, directBase])
      }
      case 'win32': {
        const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
        return findExistingAppDir([appdata])
      }
      default:
        return null
    }
  }

  getCookiesPath(): string | null {
    const appDir = this.getAppDataDir()
    if (!appDir) return null

    switch (this.platform) {
      case 'darwin':
        return existsSync(join(appDir, 'Cookies')) ? join(appDir, 'Cookies') : null
      case 'win32': {
        const networkPath = join(appDir, 'Network', 'Cookies')
        return existsSync(networkPath) ? networkPath : null
      }
      default:
        return null
    }
  }

  getBrowserCookiesPaths(): string[] {
    const paths: string[] = []

    for (const browser of CHROMIUM_BROWSERS) {
      const browserBase = getBrowserBasePath(browser, this.platform)
      if (!browserBase) continue

      for (const profileDir of discoverBrowserProfileDirs(browserBase)) {
        paths.push(join(profileDir, 'Cookies'))
        paths.push(join(profileDir, 'Network', 'Cookies'))
      }
    }

    for (const profileDir of getAgentBrowserProfileDirs({ customProfileDirs: this.customBrowserProfileDirs })) {
      paths.push(join(profileDir, 'Cookies'))
      paths.push(join(profileDir, 'Network', 'Cookies'))
    }

    return paths
  }

  getKeychainVariants(): KeychainVariant[] {
    return BROWSER_KEYCHAIN_VARIANTS
  }

  async extract(): Promise<ExtractedChannelToken[]> {
    const results: ExtractedChannelToken[] = []
    const seenAccounts = new Set<string>()

    if (this.customBrowserProfileDirs.length > 0) {
      for (const browserResult of await this.extractAllFromBrowserPaths()) {
        if (!seenAccounts.has(browserResult.accountCookie)) {
          seenAccounts.add(browserResult.accountCookie)
          results.push(browserResult)
        }
      }
    }

    const desktopResult = await this.extractFromDesktopApp()
    if (desktopResult && !seenAccounts.has(desktopResult.accountCookie)) {
      seenAccounts.add(desktopResult.accountCookie)
      results.push(desktopResult)
    }

    if (this.customBrowserProfileDirs.length === 0) {
      for (const browserResult of await this.extractAllFromBrowserPaths()) {
        if (!seenAccounts.has(browserResult.accountCookie)) {
          seenAccounts.add(browserResult.accountCookie)
          results.push(browserResult)
        }
      }
    }

    return results
  }

  decryptDPAPI(encryptedBlob: Buffer): Buffer | null {
    return this.decryptor.decryptDPAPI(encryptedBlob)
  }

  private execSecurityCommand(service: string, account: string): string | null {
    try {
      const safeService = service.replace(/"/g, '\\"')
      const safeAccount = account.replace(/"/g, '\\"')
      return (
        execSync(`security find-generic-password -s "${safeService}" -a "${safeAccount}" -w 2>/dev/null`, {
          encoding: 'utf8',
        }).trim() || null
      )
    } catch {
      return null
    }
  }

  private decryptBrowserCookie(encrypted: Buffer, cookiePath: string): string | null {
    const prefix = encrypted.length > 3 ? encrypted.subarray(0, 3).toString('utf8') : ''

    if (prefix === 'v10' || prefix === 'v11') {
      if (this.platform === 'darwin') {
        for (const variant of BROWSER_KEYCHAIN_VARIANTS) {
          const password = this.execSecurityCommand(variant.service, variant.account)
          if (!password) continue
          const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1')
          const buf = this.decryptor.decryptAESCBCRaw(encrypted, key)
          if (buf) return ChromiumCookieDecryptor.stripIntegrityHash(buf).toString('utf8')
        }
        return null
      }

      if (this.platform === 'linux') {
        const key = pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1')
        const buf = this.decryptor.decryptAESCBCRaw(encrypted, key)
        if (buf) return ChromiumCookieDecryptor.stripIntegrityHash(buf).toString('utf8')
        return null
      }

      if (this.platform === 'win32') {
        const localStatePath = findLocalStatePath(cookiePath) ?? undefined
        const buf = this.decryptor.decryptWindowsCookieRaw(encrypted, localStatePath)
        if (buf) return ChromiumCookieDecryptor.stripIntegrityHash(buf).toString('utf8')
        return null
      }
    }

    return null
  }

  private getLocalStatePath(): string | null {
    const appDir = this.getAppDataDir()
    if (!appDir) return null
    const localStatePath = join(appDir, 'Local State')
    return existsSync(localStatePath) ? localStatePath : null
  }

  private async extractAllFromBrowserPaths(): Promise<ExtractedChannelToken[]> {
    const results: ExtractedChannelToken[] = []
    const cookiePaths = this.getBrowserCookiesPaths()

    for (const cookiePath of cookiePaths) {
      if (!existsSync(cookiePath)) continue
      const result = await this.extractFromBrowserCookiePath(cookiePath)
      if (result) results.push(result)
    }

    return results
  }

  private async extractFromDesktopApp(): Promise<ExtractedChannelToken | null> {
    const cookiesPath = this.getCookiesPath()
    if (!cookiesPath) {
      return null
    }

    const rows = await this.cookieReader.queryAll<CookieRow>(cookiesPath, COOKIE_QUERY)
    if (rows.length === 0) return null

    const localStatePath = this.getLocalStatePath() ?? undefined
    for (const group of groupRowsByDomain(rows)) {
      const accountCookie = this.getDesktopCookieValue(group, 'x-account', localStatePath)
      if (!accountCookie) continue

      const sessionCookie =
        this.getDesktopCookieValue(group, 'ch-session-1', localStatePath) ??
        this.getDesktopCookieValue(group, 'ch-session', localStatePath)

      return { accountCookie, sessionCookie }
    }

    return null
  }

  private async extractFromBrowserCookiePath(cookiePath: string): Promise<ExtractedChannelToken | null> {
    const rows = await this.cookieReader.queryAll<CookieRow>(cookiePath, COOKIE_QUERY)
    if (rows.length === 0) return null

    const localStatePath = findLocalStatePath(cookiePath) ?? undefined
    for (const group of groupRowsByDomain(rows)) {
      const accountCookie = this.getBrowserCookieValue(group, 'x-account', localStatePath)
      if (!accountCookie) continue

      const sessionCookie =
        this.getBrowserCookieValue(group, 'ch-session-1', localStatePath) ??
        this.getBrowserCookieValue(group, 'ch-session', localStatePath)

      return { accountCookie, sessionCookie }
    }

    return null
  }

  private getDesktopCookieValue(rows: CookieRow[], name: string, localStatePath?: string): string | undefined {
    const row = rows.find((candidate) => candidate.name === name)
    if (!row) return undefined

    if (row.value && row.value.length > 0) {
      return row.value
    }

    const encryptedValue = Buffer.from(row.encrypted_value)
    if (encryptedValue.length === 0) return undefined

    if (this.platform === 'win32' && localStatePath && this.decryptor.isEncryptedValue(encryptedValue)) {
      return this.decryptDesktopWindowsCookie(encryptedValue, localStatePath) ?? undefined
    }

    return this.decryptor.decryptCookie(encryptedValue, localStatePath) ?? undefined
  }

  private decryptDesktopWindowsCookie(encryptedData: Buffer, localStatePath: string): string | null {
    try {
      const { readFileSync } = require('node:fs') as typeof import('node:fs')
      const localState = JSON.parse(readFileSync(localStatePath, 'utf8'))
      const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64')
      const dpapiBlobKey = encryptedKey.subarray(5)
      const masterKey = this.decryptDPAPI(dpapiBlobKey)
      if (!masterKey) return null
      return this.decryptor.decryptAESGCM(encryptedData, masterKey)
    } catch {
      return null
    }
  }

  private getBrowserCookieValue(rows: CookieRow[], name: string, localStatePath?: string): string | undefined {
    const row = rows.find((candidate) => candidate.name === name)
    if (!row) return undefined

    if (row.value && row.value.length > 0) {
      return row.value
    }

    const encryptedValue = Buffer.from(row.encrypted_value)
    if (encryptedValue.length === 0) return undefined

    const buf = this.decryptor.decryptCookieRaw(encryptedValue, localStatePath)
    if (!buf) return undefined

    return ChromiumCookieDecryptor.stripIntegrityHash(buf).toString('utf8')
  }
}
