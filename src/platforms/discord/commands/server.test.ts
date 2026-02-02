import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

describe('server commands', () => {
  let clientListServersSpy: ReturnType<typeof spyOn>
  let clientGetServerSpy: ReturnType<typeof spyOn>
  let credManagerLoadSpy: ReturnType<typeof spyOn>
  let credManagerSetCurrentServerSpy: ReturnType<typeof spyOn>
  let credManagerGetCurrentServerSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    clientListServersSpy = spyOn(DiscordClient.prototype, 'listServers').mockResolvedValue([
      { id: 'server-1', name: 'Server One', icon: 'icon1', owner: true },
      { id: 'server-2', name: 'Server Two', icon: 'icon2', owner: false },
    ])

    clientGetServerSpy = spyOn(DiscordClient.prototype, 'getServer').mockImplementation(
      async (serverId: string) => {
        if (serverId === 'server-1') {
          return { id: 'server-1', name: 'Server One', icon: 'icon1', owner: true }
        }
        if (serverId === 'server-2') {
          return { id: 'server-2', name: 'Server Two', icon: 'icon2', owner: false }
        }
        throw new Error('Server not found')
      }
    )

    credManagerLoadSpy = spyOn(DiscordCredentialManager.prototype, 'load').mockResolvedValue({
      token: 'test-token',
      current_server: 'server-1',
      servers: {
        'server-1': { server_id: 'server-1', server_name: 'Server One' },
        'server-2': { server_id: 'server-2', server_name: 'Server Two' },
      },
    })

    credManagerSetCurrentServerSpy = spyOn(
      DiscordCredentialManager.prototype,
      'setCurrentServer'
    ).mockResolvedValue(undefined)

    credManagerGetCurrentServerSpy = spyOn(
      DiscordCredentialManager.prototype,
      'getCurrentServer'
    ).mockResolvedValue('server-1')
  })

  afterEach(() => {
    clientListServersSpy?.mockRestore()
    clientGetServerSpy?.mockRestore()
    credManagerLoadSpy?.mockRestore()
    credManagerSetCurrentServerSpy?.mockRestore()
    credManagerGetCurrentServerSpy?.mockRestore()
  })

  test('list: returns servers with current marker', async () => {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    expect(config.servers).toBeDefined()
    expect(Object.keys(config.servers)).toHaveLength(2)
    expect(config.servers['server-1']).toBeDefined()
    expect(config.servers['server-2']).toBeDefined()
  })

  test('list: marks current server', async () => {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()
    const current = await credManager.getCurrentServer()

    expect(current).toBe('server-1')
    expect(config.current_server).toBe('server-1')
  })

  test('info: returns server details', async () => {
    const client = new DiscordClient('test-token')
    const server = await client.getServer('server-1')

    expect(server).toBeDefined()
    expect(server.id).toBe('server-1')
    expect(server.name).toBe('Server One')
    expect(server.icon).toBe('icon1')
    expect(server.owner).toBe(true)
  })

  test('info: throws error for non-existent server', async () => {
    const client = new DiscordClient('test-token')

    await expect(client.getServer('non-existent')).rejects.toThrow('Server not found')
  })

  test('switch: updates current server', async () => {
    const credManager = new DiscordCredentialManager()

    await credManager.setCurrentServer('server-2')

    expect(credManager.setCurrentServer).toHaveBeenCalledWith('server-2')
  })

  test('current: returns current server info', async () => {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()
    const current = await credManager.getCurrentServer()

    expect(current).toBe('server-1')
    expect(config.current_server).toBe('server-1')
  })
})
