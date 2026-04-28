import { describe, expect, it } from 'bun:test'

import {
  ChannelTypeSchema,
  PolicyConfigSchema,
  PolicyRulesSchema,
} from './types'
import type { ChannelType, PolicyConfig } from './types'

describe('PolicyConfigSchema', () => {
  it('accepts valid configs', () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelTypes: ['dm', 'mpim'],
            channelIds: ['C0SECRET'],
          },
        },
        write: {
          deny: {
            channelTypes: ['private'],
            userIds: ['U123'],
          },
        },
      },
      discord: {
        read: {
          deny: {
            channelTypes: ['channel'],
          },
        },
      },
      teams: {
        write: {
          deny: {
            channelIds: ['19:secret@thread.tacv2'],
          },
        },
      },
    } satisfies PolicyConfig

    // when
    const parsedConfig = PolicyConfigSchema.parse(policyConfig)

    // then
    expect(parsedConfig).toEqual({
      slack: policyConfig.slack,
      discord: {
        ...policyConfig.discord,
        write: {},
      },
      teams: {
        read: {},
        ...policyConfig.teams,
      },
    })
  })

  it('rejects invalid channelTypes', () => {
    // given
    const policyConfig = {
      slack: {
        read: {
          deny: {
            channelTypes: ['secret'],
          },
        },
      },
    }

    // when
    const parseConfig = () => PolicyConfigSchema.parse(policyConfig)

    // then
    expect(parseConfig).toThrow()
  })

  it('applies empty defaults', () => {
    // given
    const policyConfig = undefined

    // when
    const parsedConfig = PolicyConfigSchema.parse(policyConfig)
    const parsedRules = PolicyRulesSchema.parse(policyConfig)

    // then
    expect(parsedConfig).toEqual({})
    expect(parsedRules).toEqual({})
  })

  it('accepts partial deny rules', () => {
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
            userIds: ['U123'],
          },
        },
      },
    } satisfies PolicyConfig

    // when
    const parsedConfig = PolicyConfigSchema.parse(policyConfig)

    // then
    expect(parsedConfig).toEqual(policyConfig)
  })
})

describe('ChannelTypeSchema', () => {
  it('accepts supported channel types', () => {
    // given
    const channelTypes: ChannelType[] = ['dm', 'mpim', 'private', 'public', 'channel']

    // when
    const parsedChannelTypes = channelTypes.map((channelType) => ChannelTypeSchema.parse(channelType))

    // then
    expect(parsedChannelTypes).toEqual(channelTypes)
  })
})
