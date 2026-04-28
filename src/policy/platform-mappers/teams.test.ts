import { describe, expect, it, mock } from 'bun:test'

import { PolicyEngine } from '../engine'
import type { PolicyConfig } from '../types'
import { TeamsClient } from '../../platforms/teams/client'
import type { TeamsChannel } from '../../platforms/teams/types'

import { resolveTeamsChannelTarget, shouldResolveChannelForPolicy, teamsChannelToTarget } from './teams'

describe('teamsChannelToTarget', () => {
  it('maps Teams channel to channel target with channel channelType', () => {
    // given
    const channel = channelFixture()

    // when
    const target = teamsChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'ch-1', channelType: 'channel' })
  })
})

describe('shouldResolveChannelForPolicy', () => {
  it('returns false when policy has no Teams rules', () => {
    // given
    const engine = new PolicyEngine({})

    // when
    const shouldResolve = shouldResolveChannelForPolicy(engine, 'read')

    // then
    expect(shouldResolve).toBe(false)
  })

  it('returns true when policy has channelType rules', () => {
    // given
    const policyConfig = {
      teams: {
        read: {
          deny: {
            channelTypes: ['channel'],
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

  it('returns true when policy has userId rules', () => {
    // given
    const policyConfig = {
      teams: {
        write: {
          deny: {
            userIds: ['user-1'],
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

  it('returns false when policy only has channelId rules', () => {
    // given
    const policyConfig = {
      teams: {
        read: {
          deny: {
            channelIds: ['ch-secret'],
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

describe('resolveTeamsChannelTarget', () => {
  it('returns id-only target without fetching channel when engine has no channelType or userId rules', async () => {
    // given
    const engine = new PolicyEngine({})
    const client = new TeamsClient()
    const getChannel = mock(async (_teamId: string, _channelId: string): Promise<TeamsChannel> => channelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveTeamsChannelTarget(client, engine, 'ch-1', 'read')

    // then
    expect(target).toEqual({ kind: 'channel', id: 'ch-1' })
    expect(getChannel).not.toHaveBeenCalled()
  })

  it('fetches channel and returns mapped target when engine has channelType rules', async () => {
    // given
    const policyConfig = {
      teams: {
        read: {
          deny: {
            channelTypes: ['channel'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new TeamsClient()
    const getChannel = mock(async (_teamId: string, _channelId: string): Promise<TeamsChannel> => channelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveTeamsChannelTarget(client, engine, 'ch-1', 'read', 'team-1')

    // then
    expect(getChannel).toHaveBeenCalledWith('team-1', 'ch-1')
    expect(target).toEqual({ kind: 'channel', id: 'ch-1', channelType: 'channel' })
  })

  it('fetches channel and returns mapped target when engine has userId rules', async () => {
    // given
    const policyConfig = {
      teams: {
        write: {
          deny: {
            userIds: ['user-1'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new TeamsClient()
    const getChannel = mock(async (_teamId: string, _channelId: string): Promise<TeamsChannel> => channelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveTeamsChannelTarget(client, engine, 'ch-1', 'write', 'team-1')

    // then
    expect(getChannel).toHaveBeenCalledWith('team-1', 'ch-1')
    expect(target).toEqual({ kind: 'channel', id: 'ch-1', channelType: 'channel' })
  })
})

function channelFixture(): TeamsChannel {
  return {
    id: 'ch-1',
    team_id: 'team-1',
    name: 'General',
    type: 'standard',
  }
}
