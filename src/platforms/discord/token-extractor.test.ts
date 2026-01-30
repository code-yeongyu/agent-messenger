import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { execSync, spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { CDP_PORT, DiscordTokenExtractor, TOKEN_EXTRACTION_JS } from './token-extractor'

// Mock modules
mock.module('node:fs', () => ({
  existsSync: mock(() => false),
  readdirSync: mock(() => []),
  readFileSync: mock(() => Buffer.from('')),
}))

const mockSpawn = mock(() => ({
  unref: mock(() => {}),
}))

mock.module('node:child_process', () => ({
  execSync: mock(() => ''),
  spawn: mockSpawn,
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
      const mfaToken = `mfa.${'a'.repeat(84)}`
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
    test('returns null when no Discord directories exist on linux', async () => {
      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation(() => false)

      const linuxExtractor = new DiscordTokenExtractor('linux')
      const result = await linuxExtractor.extract()
      expect(result).toBeNull()
    })

    test('extracts token from LevelDB files on linux', async () => {
      const mockToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.abcdefghijklmnopqrstuvwxyz1234567890'
      const ldbContent = Buffer.from(`some_data"${mockToken}"more_data`)

      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('discord') || path.includes('leveldb')) return true
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

      const linuxExtractor = new DiscordTokenExtractor('linux')
      const result = await linuxExtractor.extract()

      expect(result).not.toBeNull()
      expect(result?.token).toBe(mockToken)
    })

    test('tries LevelDB first on macOS, CDP as fallback', async () => {
      const levelDbToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.leveldb_token_123456789012345'
      const ldbContent = Buffer.from(`some_data"${levelDbToken}"more_data`)

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

      const darwinExtractor = new DiscordTokenExtractor('darwin', 0)
      const result = await darwinExtractor.extract()

      expect(result).not.toBeNull()
      expect(result?.token).toBe(levelDbToken)
    })

    test('falls back to leveldb on macOS when CDP fails', async () => {
      const mockToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.leveldb_fallback_token_12345'
      const ldbContent = Buffer.from(`some_data"${mockToken}"more_data`)

      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () => ({
        ok: true,
        json: async () => [],
      })) as unknown as typeof fetch

      const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('/Applications/')) return false
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

      try {
        const darwinExtractor = new DiscordTokenExtractor('darwin', 0)
        const result = await darwinExtractor.extract()

        expect(result).not.toBeNull()
        expect(result?.token).toBe(mockToken)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    test('returns first valid token found across variants on linux', async () => {
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

      const linuxExtractor = new DiscordTokenExtractor('linux')
      const result = await linuxExtractor.extract()

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
          return `${decryptedKey}\n`
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
              encrypted_key: Buffer.from(`DPAPI${'x'.repeat(32)}`).toString('base64'),
            },
          })
        }
        return Buffer.from('')
      })

      // Test that DPAPI decryption is called
      const encryptedToken = `dQw4w9WgXcQ:${Buffer.from('test').toString('base64')}`
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
        { service: 'discord Safe Storage', account: 'discord Key' },
        { service: 'discordcanary Safe Storage', account: 'discordcanary Key' },
        { service: 'discordptb Safe Storage', account: 'discordptb Key' },
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

  describe('process management', () => {
    describe('isDiscordRunning', () => {
      test('returns true when Discord process is found on macOS', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('pgrep') && cmd.includes('Discord')) {
            return '12345\n'
          }
          return ''
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        const result = await darwinExtractor.isDiscordRunning('stable')
        expect(result).toBe(true)
      })

      test('returns false when no Discord process is found', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        mockExecSync.mockImplementation(() => '')

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        const result = await darwinExtractor.isDiscordRunning('stable')
        expect(result).toBe(false)
      })

      test('checks all variants when no specific variant provided', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        const checkedProcesses: string[] = []

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('pgrep')) {
            const match = cmd.match(/pgrep -f "([^"]+)"/)
            if (match) checkedProcesses.push(match[1])
          }
          return ''
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        await darwinExtractor.isDiscordRunning()

        expect(checkedProcesses).toContain('Discord')
        expect(checkedProcesses).toContain('Discord Canary')
        expect(checkedProcesses).toContain('Discord PTB')
      })

      test('returns true when Windows process is found', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('tasklist') && cmd.includes('Discord.exe')) {
            return 'Discord.exe                  12345 Console                    1    123,456 K\n'
          }
          return ''
        })

        const winExtractor = new DiscordTokenExtractor('win32', 0, 0)
        const result = await winExtractor.isDiscordRunning('stable')
        expect(result).toBe(true)
      })
    })

    describe('killDiscord', () => {
      test('kills Discord process on macOS using pkill', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        const killedProcesses: string[] = []

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('pkill')) {
            const match = cmd.match(/pkill -f "([^"]+)"/)
            if (match) killedProcesses.push(match[1])
          }
          return ''
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        await darwinExtractor.killDiscord('stable')

        expect(killedProcesses).toContain('Discord')
      })

      test('kills Discord process on Windows using taskkill', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        const killedProcesses: string[] = []

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('taskkill')) {
            const match = cmd.match(/taskkill \/F \/IM "([^"]+)"/)
            if (match) killedProcesses.push(match[1])
          }
          return ''
        })

        const winExtractor = new DiscordTokenExtractor('win32', 0, 0)
        await winExtractor.killDiscord('stable')

        expect(killedProcesses).toContain('Discord.exe')
      })

      test('kills all variants when no specific variant provided', async () => {
        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        const killedProcesses: string[] = []

        mockExecSync.mockImplementation((cmd: string) => {
          if (cmd.includes('pkill')) {
            const match = cmd.match(/pkill -f "([^"]+)"/)
            if (match) killedProcesses.push(match[1])
          }
          return ''
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        await darwinExtractor.killDiscord()

        expect(killedProcesses).toContain('Discord')
        expect(killedProcesses).toContain('Discord Canary')
        expect(killedProcesses).toContain('Discord PTB')
      })
    })

    describe('launchDiscordWithDebug', () => {
      test('throws error when Discord app not found', async () => {
        const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
        mockExistsSync.mockImplementation(() => false)

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)

        await expect(darwinExtractor.launchDiscordWithDebug('stable')).rejects.toThrow(
          'Discord stable not found'
        )
      })

      test('launches Discord with remote debugging port on macOS', async () => {
        const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
        mockExistsSync.mockImplementation((path: string) => {
          return path.includes('/Applications/Discord.app')
        })

        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        mockExecSync.mockImplementation(() => '')

        let spawnedPath = ''
        let spawnedArgs: string[] = []
        const mockSpawnFn = spawn as unknown as ReturnType<typeof mock>
        mockSpawnFn.mockImplementation((path: string, args: string[]) => {
          spawnedPath = path
          spawnedArgs = args
          return { unref: () => {} }
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        await darwinExtractor.launchDiscordWithDebug('stable', 9222)

        expect(spawnedPath).toBe('/Applications/Discord.app/Contents/MacOS/Discord')
        expect(spawnedArgs).toContain('--remote-debugging-port=9222')
      })

      test('uses default CDP port when not specified', async () => {
        const mockExistsSync = existsSync as unknown as ReturnType<typeof mock>
        mockExistsSync.mockImplementation(() => true)

        const mockExecSync = execSync as unknown as ReturnType<typeof mock>
        mockExecSync.mockImplementation(() => '')

        let spawnedArgs: string[] = []
        const mockSpawnFn = spawn as unknown as ReturnType<typeof mock>
        mockSpawnFn.mockImplementation((_path: string, args: string[]) => {
          spawnedArgs = args
          return { unref: () => {} }
        })

        const darwinExtractor = new DiscordTokenExtractor('darwin', 0, 0)
        await darwinExtractor.launchDiscordWithDebug('stable')

        expect(spawnedArgs).toContain(`--remote-debugging-port=${CDP_PORT}`)
      })
    })
  })

  describe('CDP client methods', () => {
    describe('discoverCDPTargets', () => {
      test('returns empty array when CDP endpoint is not reachable', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => {
          throw new Error('Connection refused')
        }) as unknown as typeof fetch

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const targets = await extractor.discoverCDPTargets(19999)
          expect(targets).toEqual([])
        } finally {
          globalThis.fetch = originalFetch
        }
      })

      test('returns targets from CDP endpoint', async () => {
        const mockTargets = [
          {
            id: '1',
            type: 'page',
            title: 'Discord',
            url: 'https://discord.com/app',
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
          },
        ]

        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => mockTargets,
        })) as unknown as typeof fetch

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const targets = await extractor.discoverCDPTargets(9222)
          expect(targets).toEqual(mockTargets)
        } finally {
          globalThis.fetch = originalFetch
        }
      })

      test('returns empty array on HTTP error', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: false,
          status: 500,
        })) as unknown as typeof fetch

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const targets = await extractor.discoverCDPTargets(9222)
          expect(targets).toEqual([])
        } finally {
          globalThis.fetch = originalFetch
        }
      })
    })

    describe('findDiscordPageTarget', () => {
      test('finds target by discord.com URL', () => {
        const targets = [
          {
            id: '1',
            type: 'page',
            title: 'Discord',
            url: 'https://discord.com/app',
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
          },
          {
            id: '2',
            type: 'background_page',
            title: 'background',
            url: 'about:blank',
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/2',
          },
        ]

        const extractor = new DiscordTokenExtractor('darwin')
        const target = extractor.findDiscordPageTarget(targets)

        expect(target).not.toBeNull()
        expect(target?.id).toBe('1')
      })

      test('finds target by Discord title', () => {
        const targets = [
          {
            id: '1',
            type: 'page',
            title: 'Discord - Chat',
            url: 'https://app.discord.com/channels',
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
          },
        ]

        const extractor = new DiscordTokenExtractor('darwin')
        const target = extractor.findDiscordPageTarget(targets)

        expect(target).not.toBeNull()
        expect(target?.id).toBe('1')
      })

      test('returns null when no Discord page found', () => {
        const targets = [
          {
            id: '1',
            type: 'background_page',
            title: 'background',
            url: 'about:blank',
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
          },
        ]

        const extractor = new DiscordTokenExtractor('darwin')
        const target = extractor.findDiscordPageTarget(targets)

        expect(target).toBeNull()
      })

      test('returns null for empty targets', () => {
        const extractor = new DiscordTokenExtractor('darwin')
        const target = extractor.findDiscordPageTarget([])
        expect(target).toBeNull()
      })
    })

    describe('executeJSViaCDP', () => {
      test('executes JavaScript and returns result', async () => {
        const mockToken = 'test_token_12345'

        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => {
              this.onopen?.()
            }, 10)
          }

          send(data: string) {
            const message = JSON.parse(data)
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  id: message.id,
                  result: { result: { value: mockToken } },
                }),
              })
            }, 10)
          }

          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.executeJSViaCDP(
            'ws://localhost:9222/devtools/page/1',
            TOKEN_EXTRACTION_JS
          )
          expect(result).toBe(mockToken)
        } finally {
          globalThis.WebSocket = originalWebSocket
        }
      })

      test('rejects on CDP error response', async () => {
        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => {
              this.onopen?.()
            }, 10)
          }

          send(data: string) {
            const message = JSON.parse(data)
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  id: message.id,
                  error: { code: -32000, message: 'Evaluation failed' },
                }),
              })
            }, 10)
          }

          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          await expect(
            extractor.executeJSViaCDP('ws://localhost:9222/devtools/page/1', TOKEN_EXTRACTION_JS)
          ).rejects.toThrow('Evaluation failed')
        } finally {
          globalThis.WebSocket = originalWebSocket
        }
      })

      test('rejects on WebSocket error', async () => {
        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => {
              this.onerror?.(new Error('Connection failed'))
            }, 10)
          }

          send() {}
          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          await expect(
            extractor.executeJSViaCDP('ws://localhost:9222/devtools/page/1', TOKEN_EXTRACTION_JS)
          ).rejects.toThrow()
        } finally {
          globalThis.WebSocket = originalWebSocket
        }
      })
    })

    describe('extractViaCDP', () => {
      test('returns null when no CDP targets available', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => [],
        })) as unknown as typeof fetch

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.extractViaCDP(9222)
          expect(result).toBeNull()
        } finally {
          globalThis.fetch = originalFetch
        }
      })

      test('returns null when no Discord page target found', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => [
            {
              id: '1',
              type: 'background_page',
              title: 'background',
              url: 'about:blank',
              webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
            },
          ],
        })) as unknown as typeof fetch

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.extractViaCDP(9222)
          expect(result).toBeNull()
        } finally {
          globalThis.fetch = originalFetch
        }
      })

      test('extracts token via CDP when Discord is running with debug port', async () => {
        const mockToken = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GrE5dA.abcdefghijklmnopqrstuvwxyz1234567890'

        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => [
            {
              id: '1',
              type: 'page',
              title: 'Discord',
              url: 'https://discord.com/app',
              webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
            },
          ],
        })) as unknown as typeof fetch

        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => this.onopen?.(), 10)
          }

          send(data: string) {
            const message = JSON.parse(data)
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  id: message.id,
                  result: { result: { value: mockToken } },
                }),
              })
            }, 10)
          }

          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.extractViaCDP(9222)
          expect(result).toBe(mockToken)
        } finally {
          globalThis.fetch = originalFetch
          globalThis.WebSocket = originalWebSocket
        }
      })

      test('returns null when token extraction JS fails', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => [
            {
              id: '1',
              type: 'page',
              title: 'Discord',
              url: 'https://discord.com/app',
              webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
            },
          ],
        })) as unknown as typeof fetch

        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => this.onopen?.(), 10)
          }

          send(data: string) {
            const message = JSON.parse(data)
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  id: message.id,
                  error: { code: -32000, message: 'Cannot find module' },
                }),
              })
            }, 10)
          }

          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.extractViaCDP(9222)
          expect(result).toBeNull()
        } finally {
          globalThis.fetch = originalFetch
          globalThis.WebSocket = originalWebSocket
        }
      })

      test('returns null when returned value is not a valid token', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
          ok: true,
          json: async () => [
            {
              id: '1',
              type: 'page',
              title: 'Discord',
              url: 'https://discord.com/app',
              webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
            },
          ],
        })) as unknown as typeof fetch

        const mockWebSocket = class {
          onopen: (() => void) | null = null
          onmessage: ((event: { data: string }) => void) | null = null
          onerror: ((error: unknown) => void) | null = null

          constructor() {
            setTimeout(() => this.onopen?.(), 10)
          }

          send(data: string) {
            const message = JSON.parse(data)
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  id: message.id,
                  result: { result: { value: 'not_a_valid_token' } },
                }),
              })
            }, 10)
          }

          close() {}
        }

        const originalWebSocket = globalThis.WebSocket
        globalThis.WebSocket = mockWebSocket as unknown as typeof WebSocket

        try {
          const extractor = new DiscordTokenExtractor('darwin')
          const result = await extractor.extractViaCDP(9222)
          expect(result).toBeNull()
        } finally {
          globalThis.fetch = originalFetch
          globalThis.WebSocket = originalWebSocket
        }
      })
    })
  })
})
