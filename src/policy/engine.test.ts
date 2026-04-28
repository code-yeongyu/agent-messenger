import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PolicyDeniedError } from './errors'
import { PolicyEngine, getPolicyEngine, resetPolicyEngine } from './engine'
import type { ChannelType, PolicyConfig, PolicyTarget } from './types'

describe('PolicyEngine', () => {
  let originalPolicyFile: string | undefined

  beforeEach(() => {
    originalPolicyFile = process.env.AGENT_MESSENGER_POLICY_FILE
    resetPolicyEngine()
  })

  afterEach(() => {
    resetPolicyEngine()

    if (originalPolicyFile === undefined) {
      delete process.env.AGENT_MESSENGER_POLICY_FILE
    } else {
      process.env.AGENT_MESSENGER_POLICY_FILE = originalPolicyFile
    }
  })

  it('never denies with empty config', () => {
    // given
    const engine = new PolicyEngine({})
    const targets: PolicyTarget[] = [
      { kind: 'channel', id: 'C1', channelType: 'public' },
      { kind: 'message', id: '123.456', parentChannelId: 'C1' },
      { kind: 'user', id: 'U1' },
    ]

    // when
    const readDenials = targets.map((target) => engine.isDenied('slack', 'read', target))
    const writeDenials = targets.map((target) => engine.isDenied('discord', 'write', target))

    // then
    expect(readDenials).toEqual([false, false, false])
    expect(writeDenials).toEqual([false, false, false])
  })

  it('denies matching channel types', () => {
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
    const target: PolicyTarget = { kind: 'channel', id: 'D1', channelType: 'dm' }

    // when
    const denied = engine.isDenied('slack', 'read', target)

    // then
    expect(denied).toBe(true)
    expect(() => engine.assertAllowed('slack', 'read', target)).toThrow(PolicyDeniedError)
  })

  it('denies matching channel ids', () => {
    // given
    const policyConfig = {
      slack: {
        write: {
          deny: {
            channelIds: ['C0SECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const target: PolicyTarget = { kind: 'channel', id: 'C0SECRET', channelType: 'private' }

    // when
    const denied = engine.isDenied('slack', 'write', target)

    // then
    expect(denied).toBe(true)
    expect(() => engine.assertAllowed('slack', 'write', target)).toThrow('policy: write denied')
  })

  it('denies matching user ids', () => {
    // given
    const policyConfig = {
      discord: {
        write: {
          deny: {
            userIds: ['123456789012345678'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const userTarget: PolicyTarget = { kind: 'user', id: '123456789012345678' }
    const directMessageTarget: PolicyTarget = {
      kind: 'channel',
      id: 'D1',
      channelType: 'dm',
      userId: '123456789012345678',
    }

    // when
    const userDenied = engine.isDenied('discord', 'write', userTarget)
    const directMessageDenied = engine.isDenied('discord', 'write', directMessageTarget)

    // then
    expect(userDenied).toBe(true)
    expect(directMessageDenied).toBe(true)
  })

  it('inherits channel id denial from parentChannelId', () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelIds: ['C0SECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const target: PolicyTarget = {
      kind: 'message',
      id: '123.456',
      parentChannelId: 'C0SECRET',
    }

    // when
    const denied = engine.isDenied('slack', 'read', target)

    // then
    expect(denied).toBe(true)
    expect(() => engine.assertAllowed('slack', 'read', target)).toThrow('policy: read denied')
  })

  it('returns subset from filterTargets', () => {
    // given
    type ChannelFixture = {
      id: string
      channelType: ChannelType
    }
    const policyConfig = {
      teams: {
        read: {
          deny: {
            channelTypes: ['private'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const channels: ChannelFixture[] = [
      { id: 'public-channel', channelType: 'public' },
      { id: 'private-channel', channelType: 'private' },
    ]

    // when
    const filteredChannels = engine.filterTargets('teams', 'read', channels, (channel) => ({
      kind: 'channel',
      id: channel.id,
      channelType: channel.channelType,
    }))

    // then
    expect(filteredChannels).toEqual([{ id: 'public-channel', channelType: 'public' }])
  })

  it('keeps isDenied symmetric with assertAllowed for read and write', () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelIds: ['C0SECRET'],
          },
        },
        write: {
          deny: {
            channelIds: ['C0SECRET'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)
    const target: PolicyTarget = { kind: 'channel', id: 'C0SECRET', channelType: 'private' }

    // when
    const readDenied = engine.isDenied('slack', 'read', target)
    const writeDenied = engine.isDenied('slack', 'write', target)

    // then
    expect(readDenied).toBe(true)
    expect(writeDenied).toBe(true)
    expect(() => engine.assertAllowed('slack', 'read', target)).toThrow('policy: read denied')
    expect(() => engine.assertAllowed('slack', 'write', target)).toThrow('policy: write denied')
  })

  it('returns cached singleton from getPolicyEngine', async () => {
    // given
    process.env.AGENT_MESSENGER_POLICY_FILE = join(
      tmpdir(),
      `agent-messenger-missing-policy-${Bun.randomUUIDv7()}.json`,
    )

    // when
    const firstEngine = await getPolicyEngine()
    const secondEngine = await getPolicyEngine()

    // then
    expect(firstEngine).toBe(secondEngine)
    expect(firstEngine.isDenied('slack', 'read', { kind: 'channel', id: 'C1', channelType: 'public' })).toBe(false)
  })
})
