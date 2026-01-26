import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { ClassicLevel } from 'classic-level'
import Database from 'better-sqlite3'

export interface ExtractedWorkspace {
  workspace_id: string
  workspace_name: string
  token: string
  cookie: string
}

interface TokenInfo {
  token: string
  teamId: string
  teamName: string
}

export class TokenExtractor {
  private platform: NodeJS.Platform
  private slackDir: string

  constructor(platform?: NodeJS.Platform, slackDir?: string) {
    this.platform = platform ?? process.platform

    if (!['darwin', 'linux', 'win32'].includes(this.platform)) {
      throw new Error(`Unsupported platform: ${this.platform}`)
    }

    this.slackDir = slackDir ?? this.getSlackDir()
  }

  getSlackDir(): string {
    switch (this.platform) {
      case 'darwin':
        return join(homedir(), 'Library', 'Application Support', 'Slack')
      case 'linux':
        return join(homedir(), '.config', 'Slack')
      case 'win32':
        return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'Slack')
      default:
        throw new Error(`Unsupported platform: ${this.platform}`)
    }
  }

  async extract(): Promise<ExtractedWorkspace[]> {
    if (!existsSync(this.slackDir)) {
      throw new Error(`Slack directory not found: ${this.slackDir}`)
    }

    const tokens = await this.extractTokensFromLevelDB()
    if (tokens.length === 0) {
      return []
    }

    const cookie = await this.extractCookieFromSQLite()

    return tokens.map((t) => ({
      workspace_id: t.teamId,
      workspace_name: t.teamName,
      token: t.token,
      cookie: cookie,
    }))
  }

  private async extractTokensFromLevelDB(): Promise<TokenInfo[]> {
    const storageDir = join(this.slackDir, 'storage')
    if (!existsSync(storageDir)) {
      return []
    }

    const levelDbDirs = this.findLevelDBDirs(storageDir)
    const tokens: TokenInfo[] = []

    for (const dbDir of levelDbDirs) {
      try {
        const extracted = await this.extractFromLevelDB(dbDir)
        tokens.push(...extracted)
      } catch {}
    }

    return tokens
  }

  private findLevelDBDirs(baseDir: string): string[] {
    const dirs: string[] = []

    try {
      const entries = readdirSync(baseDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(baseDir, entry.name)
          if (this.isLevelDBDir(fullPath)) {
            dirs.push(fullPath)
          }
          dirs.push(...this.findLevelDBDirs(fullPath))
        }
      }
    } catch {
      return dirs
    }

    return dirs
  }

  private isLevelDBDir(dir: string): boolean {
    try {
      const files = readdirSync(dir)
      return files.some((f) => f.endsWith('.ldb') || f.endsWith('.log') || f === 'CURRENT')
    } catch {
      return false
    }
  }

  private async extractFromLevelDB(dbPath: string): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = []
    let db: ClassicLevel<string, string> | null = null

    try {
      db = new ClassicLevel(dbPath, { valueEncoding: 'utf8' })

      for await (const [key, value] of db.iterator()) {
        if (typeof value === 'string' && value.includes('xoxc-')) {
          const extracted = this.parseTokenData(key, value)
          if (extracted) {
            tokens.push(extracted)
          }
        }
      }
    } catch {
    } finally {
      if (db) {
        try {
          await db.close()
        } catch {}
      }
    }

    return tokens
  }

  private parseTokenData(_key: string, value: string): TokenInfo | null {
    const tokenMatch = value.match(/xoxc-[a-zA-Z0-9-]+/)
    if (!tokenMatch) {
      return null
    }

    const token = tokenMatch[0]

    let teamId = 'unknown'
    let teamName = 'unknown'

    const teamIdMatch = value.match(/"team_id"\s*:\s*"(T[A-Z0-9]+)"/)
    if (teamIdMatch) {
      teamId = teamIdMatch[1]
    }

    const teamNameMatch = value.match(/"team_name"\s*:\s*"([^"]+)"/)
    if (teamNameMatch) {
      teamName = teamNameMatch[1]
    } else {
      const domainMatch = value.match(/"domain"\s*:\s*"([^"]+)"/)
      if (domainMatch) {
        teamName = domainMatch[1]
      }
    }

    return { token, teamId, teamName }
  }

  private async extractCookieFromSQLite(): Promise<string> {
    const cookiesPath = join(this.slackDir, 'Cookies')
    if (!existsSync(cookiesPath)) {
      const networkCookiesPath = join(this.slackDir, 'Network', 'Cookies')
      if (!existsSync(networkCookiesPath)) {
        return ''
      }
      return this.readCookieFromDB(networkCookiesPath)
    }
    return this.readCookieFromDB(cookiesPath)
  }

  private readCookieFromDB(dbPath: string): string {
    try {
      const db = new Database(dbPath, { readonly: true })

      const row = db
        .prepare(
          `
        SELECT value, encrypted_value 
        FROM cookies 
        WHERE name = 'd' AND host_key LIKE '%slack.com%'
        ORDER BY last_access_utc DESC
        LIMIT 1
      `
        )
        .get() as { value?: string; encrypted_value?: Buffer } | undefined

      db.close()

      if (!row) {
        return ''
      }

      if (row.value?.startsWith('xoxd-')) {
        return row.value
      }

      if (row.encrypted_value && row.encrypted_value.length > 0) {
        const decrypted = this.tryDecryptCookie(row.encrypted_value)
        if (decrypted) {
          return decrypted
        }
      }

      return ''
    } catch {
      return ''
    }
  }

  private tryDecryptCookie(encrypted: Buffer): string | null {
    if (encrypted.length > 3 && encrypted.subarray(0, 3).toString() === 'v10') {
      return null
    }

    const str = encrypted.toString('utf8')
    if (str.startsWith('xoxd-')) {
      return str
    }

    return null
  }
}
