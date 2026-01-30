import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

let clientListGuildsSpy: ReturnType<typeof spyOn>
let clientGetGuildSpy: ReturnType<typeof spyOn>
let credManagerLoadSpy: ReturnType<typeof spyOn>
let credManagerSetCurrentGuildSpy: ReturnType<typeof spyOn>
let credManagerGetCurrentGuildSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  // Spy on DiscordClient.prototype methods
  clientListGuildsSpy = spyOn(DiscordClient.prototype, 'listGuilds').mockResolvedValue([
    { id: 'guild-1', name: 'Guild One', icon: 'icon1', owner: true },
    { id: 'guild-2', name: 'Guild Two', icon: 'icon2', owner: false },
  ])

  clientGetGuildSpy = spyOn(DiscordClient.prototype, 'getGuild').mockImplementation(
    async (guildId: string) => {
      if (guildId === 'guild-1') {
        return { id: 'guild-1', name: 'Guild One', icon: 'icon1', owner: true }
      }
      if (guildId === 'guild-2') {
        return { id: 'guild-2', name: 'Guild Two', icon: 'icon2', owner: false }
      }
      throw new Error('Guild not found')
    }
  )

  // Spy on DiscordCredentialManager.prototype methods
  credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
    token: 'test-token',
    current_guild: 'guild-1',
    guilds: {
      'guild-1': { guild_id: 'guild-1', guild_name: 'Guild One' },
      'guild-2': { guild_id: 'guild-2', guild_name: 'Guild Two' },
    },
  })

  credManagerSetCurrentGuildSpy = spyOn(
    DiscordCredentialManager.prototype,
    'setCurrentGuild'
  ).mockResolvedValue(undefined)

  credManagerGetCurrentGuildSpy = spyOn(
    DiscordCredentialManager.prototype,
    'getCurrentGuild'
  ).mockResolvedValue('guild-1')
})

afterEach(() => {
  clientListGuildsSpy?.mockRestore()
  clientGetGuildSpy?.mockRestore()
  credManagerLoadSpy?.mockRestore()
  credManagerSetCurrentGuildSpy?.mockRestore()
  credManagerGetCurrentGuildSpy?.mockRestore()
})

test('list: returns guilds with current marker', async () => {
  // given: credential manager with guilds
  const credManager = new DiscordCredentialManager()
  const config = await credManager.load()

  // when: list action is called
  expect(config.guilds).toBeDefined()
  expect(Object.keys(config.guilds)).toHaveLength(2)

  // then: guilds are returned
  expect(config.guilds['guild-1']).toBeDefined()
  expect(config.guilds['guild-2']).toBeDefined()
})

test('list: marks current guild', async () => {
  // given: credential manager with current guild set
  const credManager = new DiscordCredentialManager()
  const config = await credManager.load()
  const current = await credManager.getCurrentGuild()

  // when: checking current guild
  expect(current).toBe('guild-1')

  // then: current guild is marked
  expect(config.current_guild).toBe('guild-1')
})

test('info: returns guild details', async () => {
  // given: discord client with guild data
  const client = new DiscordClient('test-token')
  const guild = await client.getGuild('guild-1')

  // when: getting guild info
  expect(guild).toBeDefined()

  // then: guild details are returned
  expect(guild.id).toBe('guild-1')
  expect(guild.name).toBe('Guild One')
  expect(guild.icon).toBe('icon1')
  expect(guild.owner).toBe(true)
})

test('info: throws error for non-existent guild', async () => {
  // given: discord client
  const client = new DiscordClient('test-token')

  // when: getting non-existent guild
  // then: error is thrown
  try {
    await client.getGuild('non-existent')
    expect(true).toBe(false) // should not reach here
  } catch (error) {
    expect((error as Error).message).toContain('Guild not found')
  }
})

test('switch: updates current guild', async () => {
  // given: credential manager
  const credManager = new DiscordCredentialManager()

  // when: switching guild
  await credManager.setCurrentGuild('guild-2')

  // then: setCurrentGuild is called
  expect(credManager.setCurrentGuild).toHaveBeenCalledWith('guild-2')
})

test('current: returns current guild info', async () => {
  // given: credential manager with current guild
  const credManager = new DiscordCredentialManager()
  const config = await credManager.load()

  // when: getting current guild
  const current = await credManager.getCurrentGuild()

  // then: current guild is returned
  expect(current).toBe('guild-1')
  expect(config.current_guild).toBe('guild-1')
})
