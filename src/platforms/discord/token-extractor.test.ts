import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { DiscordTokenExtractor } from './token-extractor'

// Mock modules
mock.module('node:fs', () => ({
  existsSync: mock(() => false),
  readdirSync: mock(() => []),
  readFileSync: mock(() => Buffer.from('')),
}))

mock.module('node:child_process', () => ({
  execSync: mock(() => ''),
}))

describe('DiscordTokenExtractor', () => {
  let extractor: DiscordTokenExtractor

  beforeEach(() => {
    extractor = new DiscordTokenExtractor()
  })

  describe('getDiscordDirs', () => {
    test('returns darwin paths on macOS', () => {
      const darwinExtractor = new DiscordTokenExtractor('darwin')
      const dirs = darwinExtractor.getDiscordDirs()

      expect(dirs).toContain(join(homedir(), 'Library', 'Application Support', 'Discord'))
      expect(dirs).toContain(join(homedir(), 'Library', 'Application Support', 'discordcanary'))
      expect(dirs).toContain(join(homedir(), 'Library', 'Application Support', 'discordptb'))
    })

    test('returns linux paths on Linux', () => {
      const linuxExtractor = new DiscordTokenExtractor('linux')
      const dirs = linuxExtractor.getDiscordDirs()

      expect(dirs).toContain(join(homedir(), '.config', 'discord'))
      expect(dirs).toContain(join(homedir(), '.config', 'discordcanary'))
      expect(dirs).toContain(join(homedir(), '.config', 'discordptb'))
    })

    test('returns win32 paths on Windows', () => {
      const winExtractor = new DiscordTokenExtractor('win32')
      const dirs = winExtractor.getDiscordDirs()

      const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
      expect(dirs).toContain(join(appdata, 'Discord'))
      expect(dirs).toContain(join(appdata, 'discordcanary'))
      expect(dirs).toContain(join(appdata, 'discordptb'))
    })

    test('returns multiple paths for all 3 variants', () => {
      const dirs = extractor.getDiscordDirs()
      expect(dirs.length).toBe(3)
    })
  })

  describe('token patterns', () => {
    test('validates standard token format (base64.base64.base64)', () => {
      // Token: base64(user_id).base64(timestamp).base64(hmac)
      const validToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.abcdefghijklmnopqrstuvwxyz1234567890'
      expect(extractor.isValidToken(validToken)).toBe(true)
    })

    test('validates MFA token format', () => {
      const mfaToken = 'mfa.' + 'a'.repeat(84)
      expect(extractor.isValidToken(mfaToken)).toBe(true)
    })

    test('rejects invalid tokens', () => {
      expect(extractor.isValidToken('')).toBe(false)
      expect(extractor.isValidToken('invalid')).toBe(false)
      expect(extractor.isValidToken('xoxc-123')).toBe(false)
    })

    test('detects encrypted tokens by prefix', () => {
      const encryptedToken = 'dQw4w9WgXcQ:' + 'encrypted_data'
      expect(extractor.isEncryptedToken(encryptedToken)).toBe(true)
      expect(extractor.isEncryptedToken('MTIzNDU2.xxx.yyy')).toBe(false)
    })
  })

  describe('extract', () => {
    test('returns null when no Discord directories exist', async () => {
      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation(() => false)

      const result = await extractor.extract()
      expect(result).toBeNull()
    })

    test('extracts token from LevelDB files', async () => {
      const mockToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.abcdefghijklmnopqrstuvwxyz1234567890'
      const ldbContent = Buffer.from(`some_data"${mockToken}"more_data`)

      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('Discord') || path.includes('leveldb')) return true
        if (path.includes('Local Storage')) return true
        return false
      })

      const mockReaddirSync = readdirSync as unknown as ReturnType<typeof mock>
      mockReaddirSync.mockImplementation((path: string) => {
        if (path.includes('leveldb')) return ['000001.ldb']
        if (path.includes('Local Storage')) return ['leveldb']
        return []
      })

      const mockReadFileSync = readFileSync as unknown as ReturnType<typeof mock>
      mockReadFileSync.mockImplementation(() => ldbContent)

      // Need a fresh extractor with mock filesystem
      const testExtractor = new DiscordTokenExtractor('darwin')
      const result = await testExtractor.extract()

      expect(result).not.toBeNull()
      expect(result?.token).toBe(mockToken)
    })

    test('returns first valid token found across variants', async () => {
      // When multiple variants installed, should return first found
      const mockToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.first_token_found_1234567890'
      const ldbContent = Buffer.from(`"${mockToken}"`)

      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation(() => true)

      const mockReaddirSync = readdirSync as unknown as ReturnType<typeof mock>
      mockReaddirSync.mockImplementation((path: string) => {
        if (path.includes('leveldb')) return ['test.ldb']
        if (path.includes('Local Storage')) return ['leveldb']
        return []
      })

      const mockReadFileSync = readFileSync as unknown as ReturnType<typeof mock>
      mockReadFileSync.mockImplementation(() => ldbContent)

      const testExtractor = new DiscordTokenExtractor('darwin')
      const result = await testExtractor.extract()

      // Returns single token (not array)
      expect(result).not.toBeNull()
      expect(typeof result?.token).toBe('string')
    })
  })

  describe('encrypted token handling', () => {
    test('decrypts Windows DPAPI encrypted token', async () => {
      const mockExecSync = execSync as unknown as ReturnType<typeof mock>
      const decryptedKey = Buffer.from('0'.repeat(32), 'hex').toString('base64')

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('powershell') && cmd.includes('ProtectedData')) {
          return decryptedKey + '\n'
        }
        return ''
      })

      const winExtractor = new DiscordTokenExtractor('win32')

      // Mock Local State file reading
      const mockReadFileSync = readFileSync as unknown as ReturnType<typeof mock>
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('Local State')) {
          return JSON.stringify({
            os_crypt: {
              encrypted_key: Buffer.from('DPAPI' + 'x'.repeat(32)).toString('base64'),
            },
          })
        }
        return Buffer.from('')
      })

      // Test that DPAPI decryption is called
      const encryptedToken = 'dQw4w9WgXcQ:' + Buffer.from('test').toString('base64')
      expect(winExtractor.isEncryptedToken(encryptedToken)).toBe(true)
    })

    test('decrypts macOS Keychain encrypted token', async () => {
      const mockExecSync = execSync as unknown as ReturnType<typeof mock>
      const keychainPassword = 'test_password'

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('security find-generic-password')) {
          if (cmd.includes('Discord Safe Storage')) {
            return keychainPassword
          }
        }
        throw new Error('Not found')
      })

      const macExtractor = new DiscordTokenExtractor('darwin')

      // Verify keychain command patterns
      expect(macExtractor.getKeychainVariants()).toEqual([
        { service: 'Discord Safe Storage', account: 'Discord' },
        { service: 'Discord Canary Safe Storage', account: 'Discord Canary' },
        { service: 'Discord PTB Safe Storage', account: 'Discord PTB' },
      ])
    })
  })

  describe('variant detection', () => {
    test('identifies Discord Stable', () => {
      expect(extractor.getVariantFromPath('/path/to/Discord')).toBe('stable')
      expect(extractor.getVariantFromPath('/path/to/discord')).toBe('stable')
    })

    test('identifies Discord Canary', () => {
      expect(extractor.getVariantFromPath('/path/to/discordcanary')).toBe('canary')
      expect(extractor.getVariantFromPath('/path/to/Discord Canary')).toBe('canary')
    })

    test('identifies Discord PTB', () => {
      expect(extractor.getVariantFromPath('/path/to/discordptb')).toBe('ptb')
      expect(extractor.getVariantFromPath('/path/to/Discord PTB')).toBe('ptb')
    })
  })
})
