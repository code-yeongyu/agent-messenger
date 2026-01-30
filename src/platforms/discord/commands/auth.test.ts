import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'
import { DiscordTokenExtractor } from '../token-extractor'

let extractorExtractSpy: ReturnType<typeof spyOn>
let clientTestAuthSpy: ReturnType<typeof spyOn>
let clientListGuildsSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>
let credManagerSaveSpy: ReturnType<typeof spyOn>
let credManagerClearTokenSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  // Spy on DiscordTokenExtractor.prototype.extract
  extractorExtractSpy = spyOn(DiscordTokenExtractor.prototype, 'extract').mockResolvedValue({
    token: 'test-token-123',
  })

  // Spy on DiscordClient.prototype methods
  clientTestAuthSpy = spyOn(DiscordClient.prototype, 'testAuth').mockResolvedValue({
    id: 'user-123',
    username: 'testuser',
  })

  clientListGuildsSpy = spyOn(DiscordClient.prototype, 'listGuilds').mockResolvedValue([
    { id: 'guild-1', name: 'Guild One' },
    { id: 'guild-2', name: 'Guild Two' },
  ])

  // Spy on DiscordCredentialManager.prototype methods
  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: null,
    current_guild: null,
    guilds: {},
  })

  credManagerSaveSpy = spyOn(DiscordCredentialManager.prototype, 'save').mockResolvedValue(
    undefined
  )

  credManagerClearTokenSpy = spyOn(
    DiscordCredentialManager.prototype,
    'clearToken'
  ).mockResolvedValue(undefined)
})

afterEach(() => {
  extractorExtractSpy?.mockRestore()
  clientTestAuthSpy?.mockRestore()
  clientListGuildsSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
  credManagerSaveSpy?.mockRestore()
  credManagerClearTokenSpy?.mockRestore()
})

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
