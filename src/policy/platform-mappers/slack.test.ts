import { describe, expect, it, mock } from 'bun:test'

import { PolicyEngine } from '@/policy/engine'
import type { PolicyConfig } from '@/policy/types'
import { SlackClient } from '@/platforms/slack/client'
import type { SlackChannel, SlackDM, SlackSearchResult } from '@/platforms/slack/types'

import { resolveSlackChannelTarget, slackChannelToTarget, slackSearchResultToTarget } from './slack'

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

describe('slackSearchResultToTarget', () => {
  it('maps direct message search result to dm channel target', () => {
    // given
    const result = searchResultFixture({ id: 'D123DIRECT', name: 'yeongyu', is_im: true })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'D123DIRECT', channelType: 'dm' })
  })

  it('maps multi-person direct message search result to mpim channel target', () => {
    // given
    const result = searchResultFixture({ id: 'G123MPIM', name: 'group-dm', is_mpim: true })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'G123MPIM', channelType: 'mpim' })
  })

  it('maps private channel search result to private channel target', () => {
    // given
    const result = searchResultFixture({
      id: 'G123PRIVATE',
      name: 'secret',
      is_private: true,
      is_im: false,
      is_mpim: false,
    })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'G123PRIVATE', channelType: 'private' })
  })

  it('maps public channel search result to public channel target', () => {
    // given
    const result = searchResultFixture({ id: 'C123PUBLIC', name: 'general', is_private: false, is_channel: true })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'C123PUBLIC', channelType: 'public' })
  })

  it('omits channelType when search result has no type flags', () => {
    // given
    const result = searchResultFixture({ id: 'C123UNKNOWN', name: 'unknown' })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'C123UNKNOWN' })
    expect('channelType' in target).toBe(false)
  })

  it('prefers dm when direct message and private flags are both set', () => {
    // given
    const result = searchResultFixture({ id: 'D123DIRECT', name: 'yeongyu', is_im: true, is_private: true })

    // when
    const target = slackSearchResultToTarget(result)

    // then
    expect(target).toEqual({ kind: 'channel', id: 'D123DIRECT', channelType: 'dm' })
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

  it('fetches channel when D-prefix channel has userId rules', async () => {
    // given
    const policyConfig = {
      slack: {
        write: {
          deny: {
            userIds: ['U456'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => directMessageChannelFixture())
    client.getChannel = getChannel

    // when
    const target = await resolveSlackChannelTarget(client, engine, 'D123DIRECT', 'write')

    // then
    expect(getChannel).toHaveBeenCalledWith('D123DIRECT')
    expect(target).toEqual({ kind: 'channel', id: 'D123DIRECT', channelType: 'dm', userId: 'U456' })
  })

  it('returns dm target without fetching channel when D-prefix channel only has channelType rules', async () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelTypes: ['dm'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const client = new SlackClient()
    const getChannel = mock(async (_channelId: string): Promise<SlackChannel> => directMessageChannelFixture())
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

function directMessageChannelFixture(): SlackChannel & SlackDM {
  return {
    id: 'D123DIRECT',
    name: 'direct-message',
    is_private: true,
    is_archived: false,
    created: 1700000000,
    creator: 'U123',
    user: 'U456',
    is_mpim: false,
  }
}

function searchResultFixture(channel: SlackSearchResult['channel']): SlackSearchResult {
  return {
    ts: '123.456',
    text: 'search result',
    user: 'U123',
    channel,
    permalink: `https://workspace.slack.com/archives/${channel.id}/p123456`,
  }
}
