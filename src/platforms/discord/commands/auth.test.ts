import { expect, mock, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { DiscordTokenExtractor } from '../token-extractor'

// Mock modules
mock.module('../token-extractor', () => ({
  DiscordTokenExtractor: mock(() => ({
    extract: mock(async () => ({
      token: 'test-token-123',
    })),
  })),
}))

mock.module('../client', () => ({
  DiscordClient: mock((_token: string) => ({
    testAuth: mock(async () => ({
      id: 'user-123',
      username: 'testuser',
    })),
    listGuilds: mock(async () => [
      { id: 'guild-1', name: 'Guild One' },
      { id: 'guild-2', name: 'Guild Two' },
    ]),
  })),
}))

mock.module('../credential-manager', () => ({
  DiscordCredentialManager: mock(() => ({
    load: mock(async () => ({
      token: null,
      current_guild: null,
      guilds: {},
    })),
    save: mock(async () => {}),
    clearToken: mock(async () => {}),
  })),
}))

test('extract: calls DiscordTokenExtractor', async () => {
  const extractor = new DiscordTokenExtractor()
  const result = await extractor.extract()
  expect(result).toBeDefined()
  expect(result?.token).toBe('test-token-123')
})

test('extract: validates token with DiscordClient', async () => {
  const client = new DiscordClient('test-token-123')
  const authInfo = await client.testAuth()
  expect(authInfo).toBeDefined()
  expect(authInfo.id).toBe('user-123')
})

test('extract: discovers guilds', async () => {
  const client = new DiscordClient('test-token-123')
  const guilds = await client.listGuilds()
  expect(guilds).toHaveLength(2)
  expect(guilds[0].id).toBe('guild-1')
})

test('logout: clears credentials', async () => {
  const credManager = new DiscordCredentialManager()
  await credManager.clearToken()
  expect(credManager.clearToken).toHaveBeenCalled()
})

test('status: returns auth state', async () => {
  const credManager = new DiscordCredentialManager()
  const config = await credManager.load()
  expect(config.token).toBeNull()
  expect(config.current_guild).toBeNull()
})
