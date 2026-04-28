import { describe, expect, it, mock } from 'bun:test'

import { PolicyEngine } from '../engine'
import type { PolicyConfig } from '../types'
import { DiscordClient } from '../../platforms/discord/client'
import type { DiscordChannel, DiscordDMChannel } from '../../platforms/discord/types'

import { discordChannelToTarget, resolveDiscordChannelTarget, shouldResolveChannelForPolicy } from './discord'

describe('discordChannelToTarget', () => {
  it('maps guild text channel to channel target', () => {
    // given
    const channel = guildChannelFixture({ id: '123TEXT', type: 0 })

    // when
    const target = discordChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: '123TEXT', channelType: 'channel' })
  })

  it('maps guild thread to channel target', () => {
    // given
    const channel = guildChannelFixture({ id: '123THREAD', type: 11 })

    // when
    const target = discordChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: '123THREAD', channelType: 'channel' })
  })

  it('maps direct message to dm channel target with userId', () => {
    // given
    const channel = dmChannelFixture({ id: '123DM', type: 1 })

    // when
    const target = discordChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: '123DM', channelType: 'dm', userId: '456USER' })
  })

  it('maps group direct message to mpim channel target without userId', () => {
    // given
    const channel = dmChannelFixture({ id: '123GROUP', type: 3 })

    // when
    const target = discordChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: '123GROUP', channelType: 'mpim' })
    expect('userId' in target).toBe(false)
  })
})

describe('shouldResolveChannelForPolicy', () => {
  it('returns false when rules are empty', () => {
    // given
    const engine = new PolicyEngine({})

    // when
    const shouldResolve = shouldResolveChannelForPolicy(engine, 'read')

    // then
    expect(shouldResolve).toBe(false)
  })

  it('returns true when channelType rules exist', () => {
    // given
    const policyConfig = {
      discord: {
        read: {
          deny: {
            channelTypes: ['dm'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const shouldResolve = shouldResolveChannelForPolicy(engine, 'read')

    // then
    expect(shouldResolve).toBe(true)
  })

  it('returns true when userId rules exist', () => {
    // given
    const policyConfig = {
      discord: {
        write: {
          deny: {
            userIds: ['456USER'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const shouldResolve = shouldResolveChannelForPolicy(engine, 'write')

    // then
    expect(shouldResolve).toBe(true)
  })

  it('returns false when only channelId rules exist', () => {
    // given
    const policyConfig = {
      discord: {
        read: {
          deny: {
            channelIds: ['123SECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const shouldResolve = shouldResolveChannelForPolicy(engine, 'read')

    // then
    expect(shouldResolve).toBe(false)
  })
})

describe('resolveDiscordChannelTarget', () => {
  it('returns id-only target without fetching channel when engine has no channelType or userId rules', async () => {
    // given
    const policyConfig = {
      discord: {
        read: {
          deny: {
            channelIds: ['123SECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new DiscordClient()
    const getChannel = mock(async (_channelId: string): Promise<DiscordChannel> => guildChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveDiscordChannelTarget(client, engine, '123TEXT', 'read')

    // then
    expect(target).toEqual({ kind: 'channel', id: '123TEXT' })
    expect(getChannel).not.toHaveBeenCalled()
  })

  it('fetches channel and returns mapped target when engine has channelType rules', async () => {
    // given
    const policyConfig = {
      discord: {
        read: {
          deny: {
            channelTypes: ['channel'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new DiscordClient()
    const getChannel = mock(async (_channelId: string): Promise<DiscordChannel> =>
      guildChannelFixture({ id: '123TEXT', type: 0 }),
    )
    client.getChannel = getChannel

    // when
    const target = await resolveDiscordChannelTarget(client, engine, '123TEXT', 'read')

    // then
    expect(getChannel).toHaveBeenCalledWith('123TEXT')
    expect(target).toEqual({ kind: 'channel', id: '123TEXT', channelType: 'channel' })
  })
})

function guildChannelFixture(overrides: Partial<DiscordChannel> = {}): DiscordChannel {
  return {
    id: '123TEXT',
    guild_id: '789GUILD',
    name: 'general',
    type: 0,
    ...overrides,
  }
}

function dmChannelFixture(overrides: Partial<DiscordDMChannel> = {}): DiscordDMChannel {
  return {
    id: '123DM',
    type: 1,
    recipients: [
      {
        id: '456USER',
        username: 'friend',
      },
    ],
    ...overrides,
  }
}
