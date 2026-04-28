import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PolicyEngine, getPolicyEngine, resetPolicyEngine } from './engine'
import { PolicyDeniedError } from './errors'
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

  it('returns false from hasRule for all kinds with empty config', () => {
    // given
    const engine = new PolicyEngine({})
    const ruleKinds = ['channelTypes', 'channelIds', 'userIds'] as const

    // when
    const hasRules = ruleKinds.map((ruleKind) => engine.hasRule('slack', 'read', ruleKind))

    // then
    expect(hasRules).toEqual([false, false, false])
  })

  it('returns true from hasRule only for channelTypes rule', () => {
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

    // when
    const hasChannelTypeRule = engine.hasRule('slack', 'read', 'channelTypes')
    const hasChannelIdRule = engine.hasRule('slack', 'read', 'channelIds')
    const hasUserIdRule = engine.hasRule('slack', 'read', 'userIds')

    // then
    expect(hasChannelTypeRule).toBe(true)
    expect(hasChannelIdRule).toBe(false)
    expect(hasUserIdRule).toBe(false)
  })

  it('returns true from hasRule only for userIds rule', () => {
    // given
    const policyConfig = {
      slack: {
        write: {
          deny: {
            userIds: ['U1'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const hasChannelTypeRule = engine.hasRule('slack', 'write', 'channelTypes')
    const hasChannelIdRule = engine.hasRule('slack', 'write', 'channelIds')
    const hasUserIdRule = engine.hasRule('slack', 'write', 'userIds')

    // then
    expect(hasChannelTypeRule).toBe(false)
    expect(hasChannelIdRule).toBe(false)
    expect(hasUserIdRule).toBe(true)
  })

  it('returns true from hasRule only for channelIds rule', () => {
    // given
    const policyConfig = {
      discord: {
        read: {
          deny: {
            channelIds: ['C1'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const hasChannelTypeRule = engine.hasRule('discord', 'read', 'channelTypes')
    const hasChannelIdRule = engine.hasRule('discord', 'read', 'channelIds')
    const hasUserIdRule = engine.hasRule('discord', 'read', 'userIds')

    // then
    expect(hasChannelTypeRule).toBe(false)
    expect(hasChannelIdRule).toBe(true)
    expect(hasUserIdRule).toBe(false)
  })

  it('returns false from hasRule for empty arrays', () => {
    // given
    const policyConfig = {
      teams: {
        write: {
          deny: {
            channelTypes: [],
            channelIds: [],
            userIds: [],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const hasChannelTypeRule = engine.hasRule('teams', 'write', 'channelTypes')
    const hasChannelIdRule = engine.hasRule('teams', 'write', 'channelIds')
    const hasUserIdRule = engine.hasRule('teams', 'write', 'userIds')

    // then
    expect(hasChannelTypeRule).toBe(false)
    expect(hasChannelIdRule).toBe(false)
    expect(hasUserIdRule).toBe(false)
  })

  it('keeps hasRule independent by platform and direction', () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            userIds: ['U1'],
          },
        },
      },
      discord: {
        write: {
          deny: {
            channelTypes: ['dm'],
          },
        },
      },
    } satisfies PolicyConfig
    const engine = new PolicyEngine(policyConfig)

    // when
    const hasSlackReadUserIdRule = engine.hasRule('slack', 'read', 'userIds')
    const hasSlackWriteUserIdRule = engine.hasRule('slack', 'write', 'userIds')
    const hasDiscordReadChannelTypeRule = engine.hasRule('discord', 'read', 'channelTypes')
    const hasDiscordWriteChannelTypeRule = engine.hasRule('discord', 'write', 'channelTypes')
    const hasTeamsReadUserIdRule = engine.hasRule('teams', 'read', 'userIds')

    // then
    expect(hasSlackReadUserIdRule).toBe(true)
    expect(hasSlackWriteUserIdRule).toBe(false)
    expect(hasDiscordReadChannelTypeRule).toBe(false)
    expect(hasDiscordWriteChannelTypeRule).toBe(true)
    expect(hasTeamsReadUserIdRule).toBe(false)
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
