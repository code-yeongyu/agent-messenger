import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { DiscordCredentialManager } from './credential-manager'

const testDirs: string[] = []

function setup(): DiscordCredentialManager {
  const testConfigDir = join(
    import.meta.dir,
    `.test-discord-config-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  testDirs.push(testConfigDir)
  return new DiscordCredentialManager(testConfigDir)
}

afterAll(() => {
  for (const dir of testDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('DiscordCredentialManager', () => {
  test('load returns default config when file does not exist', async () => {
    const manager = setup()
    const config = await manager.load()

    expect(config).toEqual({
      token: null,
      current_guild: null,
      guilds: {},
    })
  })

  test('save creates config file with correct permissions', async () => {
    const testConfigDir = join(
      import.meta.dir,
      `.test-discord-config-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    testDirs.push(testConfigDir)
    const manager = new DiscordCredentialManager(testConfigDir)
    const config = {
      token: 'test-token',
      current_guild: 'guild-123',
      guilds: {
        'guild-123': { guild_id: 'guild-123', guild_name: 'Test Guild' },
      },
    }

    await manager.save(config)

    const credentialsPath = join(testConfigDir, 'discord-credentials.json')
    expect(existsSync(credentialsPath)).toBe(true)

    const file = Bun.file(credentialsPath)
    const content = await file.text()
    const loaded = JSON.parse(content)
    expect(loaded).toEqual(config)
  })

  test('getToken returns null when not authenticated', async () => {
    const manager = setup()
    const token = await manager.getToken()
    expect(token).toBeNull()
  })

  test('setToken saves token to config', async () => {
    const manager = setup()
    await manager.setToken('test-token-123')

    const token = await manager.getToken()
    expect(token).toBe('test-token-123')
  })

  test('getToken returns previously set token', async () => {
    const manager = setup()
    await manager.setToken('my-token')

    const token = await manager.getToken()
    expect(token).toBe('my-token')
  })

  test('clearToken removes token from config', async () => {
    const manager = setup()
    await manager.setToken('test-token')
    await manager.clearToken()

    const token = await manager.getToken()
    expect(token).toBeNull()
  })

  test('getCurrentGuild returns null when not set', async () => {
    const manager = setup()
    const guild = await manager.getCurrentGuild()
    expect(guild).toBeNull()
  })

  test('setCurrentGuild saves guild id', async () => {
    const manager = setup()
    await manager.setCurrentGuild('guild-456')

    const guild = await manager.getCurrentGuild()
    expect(guild).toBe('guild-456')
  })

  test('getGuilds returns empty object when no guilds set', async () => {
    const manager = setup()
    const guilds = await manager.getGuilds()
    expect(guilds).toEqual({})
  })

  test('setGuilds saves guilds to config', async () => {
    const manager = setup()
    const guilds = {
      'guild-1': { guild_id: 'guild-1', guild_name: 'Guild One' },
      'guild-2': { guild_id: 'guild-2', guild_name: 'Guild Two' },
    }

    await manager.setGuilds(guilds)

    const loaded = await manager.getGuilds()
    expect(loaded).toEqual(guilds)
  })

  test('getCredentials returns null when not authenticated', async () => {
    const manager = setup()
    const creds = await manager.getCredentials()
    expect(creds).toBeNull()
  })

  test('getCredentials returns null when token exists but no guild selected', async () => {
    const manager = setup()
    await manager.setToken('test-token')

    const creds = await manager.getCredentials()
    expect(creds).toBeNull()
  })

  test('getCredentials returns null when guild selected but no token', async () => {
    const manager = setup()
    await manager.setCurrentGuild('guild-123')

    const creds = await manager.getCredentials()
    expect(creds).toBeNull()
  })

  test('getCredentials returns token and guildId when both are set', async () => {
    const manager = setup()
    await manager.setToken('test-token-xyz')
    await manager.setCurrentGuild('guild-789')

    const creds = await manager.getCredentials()
    expect(creds).toEqual({
      token: 'test-token-xyz',
      guildId: 'guild-789',
    })
  })

  test('multiple operations preserve existing data', async () => {
    const manager = setup()
    await manager.setToken('token-1')
    await manager.setCurrentGuild('guild-1')
    const guilds = {
      'guild-1': { guild_id: 'guild-1', guild_name: 'Guild One' },
    }
    await manager.setGuilds(guilds)

    await manager.setToken('token-2')

    expect(await manager.getToken()).toBe('token-2')
    expect(await manager.getCurrentGuild()).toBe('guild-1')
    expect(await manager.getGuilds()).toEqual(guilds)
  })
})
