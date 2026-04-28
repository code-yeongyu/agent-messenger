import { describe, expect, it, mock } from 'bun:test'

import { PolicyEngine } from '../engine'
import type { PolicyConfig } from '../types'
import { SlackClient } from '../../platforms/slack/client'
import type { SlackChannel, SlackDM } from '../../platforms/slack/types'

import { resolveSlackChannelTarget, slackChannelToTarget } from './slack'

describe('slackChannelToTarget', () => {
  it('maps public channel to public channel target without userId', () => {
    // given
    const channel = {
      id: 'C123PUBLIC',
      name: 'general',
      is_private: false,
      is_archived: false,
      created: 1700000000,
      creator: 'U123',
    } satisfies SlackChannel

    // when
    const target = slackChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'C123PUBLIC', channelType: 'public' })
    expect('userId' in target).toBe(false)
  })

  it('maps private channel to private channel target', () => {
    // given
    const channel = {
      id: 'G123PRIVATE',
      name: 'secret',
      is_private: true,
      is_archived: false,
      created: 1700000000,
      creator: 'U123',
    } satisfies SlackChannel

    // when
    const target = slackChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'G123PRIVATE', channelType: 'private' })
  })

  it('maps direct message to dm channel target with userId', () => {
    // given
    const channel = {
      id: 'D123DIRECT',
      user: 'U456',
      is_mpim: false,
    } satisfies SlackDM

    // when
    const target = slackChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'D123DIRECT', channelType: 'dm', userId: 'U456' })
  })

  it('maps multi-person direct message to mpim channel target with userId', () => {
    // given
    const channel = {
      id: 'G123MPIM',
      user: 'U789',
      is_mpim: true,
    } satisfies SlackDM

    // when
    const target = slackChannelToTarget(channel)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'G123MPIM', channelType: 'mpim', userId: 'U789' })
  })
})

describe('resolveSlackChannelTarget', () => {
  it('returns dm target without fetching channel when channel has D prefix and engine has no rules', async () => {
    // given
    const engine = new PolicyEngine({})
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => privateChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveSlackChannelTarget(client, engine, 'D123DIRECT', 'read')

    // then
    expect(target).toEqual({ kind: 'channel', id: 'D123DIRECT', channelType: 'dm' })
    expect(getChannel).not.toHaveBeenCalled()
  })

  it('returns id-only target without fetching channel when engine has no channelType rules', async () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelIds: ['CSECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => publicChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveSlackChannelTarget(client, engine, 'C123PUBLIC', 'read')

    // then
    expect(target).toEqual({ kind: 'channel', id: 'C123PUBLIC' })
    expect(getChannel).not.toHaveBeenCalled()
  })

  it('fetches channel and returns mapped target when engine has channelType rules', async () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelTypes: ['public'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => publicChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveSlackChannelTarget(client, engine, 'C123PUBLIC', 'read')

    // then
    expect(getChannel).toHaveBeenCalledWith('C123PUBLIC')
    expect(target).toEqual({ kind: 'channel', id: 'C123PUBLIC', channelType: 'public' })
  })

  it('returns private channel type when fetched channel is private and channelType rules are present', async () => {
    // given
    const policyConfig = {
      slack: {
        write: {
          deny: {
            channelTypes: ['private'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => privateChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveSlackChannelTarget(client, engine, 'G123PRIVATE', 'write')

    // then
    expect(getChannel).toHaveBeenCalledWith('G123PRIVATE')
    expect(target).toEqual({ kind: 'channel', id: 'G123PRIVATE', channelType: 'private' })
  })
})

function publicChannelFixture(): SlackChannel {
  return {
    id: 'C123PUBLIC',
    name: 'general',
    is_private: false,
    is_archived: false,
    created: 1700000000,
    creator: 'U123',
  }
}

function privateChannelFixture(): SlackChannel {
  return {
    id: 'G123PRIVATE',
    name: 'secret',
    is_private: true,
    is_archived: false,
    created: 1700000000,
    creator: 'U123',
  }
}
