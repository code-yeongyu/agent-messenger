import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ZodError } from 'zod'

import { loadPolicy } from './loader'

describe('loadPolicy', () => {
  let originalPolicyFile: string | undefined
  let testDirectory: string

  beforeEach(async () => {
    originalPolicyFile = process.env.AGENT_MESSENGER_POLICY_FILE
    testDirectory = join(tmpdir(), `agent-messenger-policy-${Bun.randomUUIDv7()}`)
    await mkdir(testDirectory, { recursive: true })
  })

  afterEach(async () => {
    if (originalPolicyFile === undefined) {
      delete process.env.AGENT_MESSENGER_POLICY_FILE
    } else {
      process.env.AGENT_MESSENGER_POLICY_FILE = originalPolicyFile
    }

    await rm(testDirectory, { recursive: true, force: true })
  })

  it('returns empty config when file is missing', async () => {
    // given
    const policyFile = join(testDirectory, 'missing-policy.json')

    // when
    const policy = await loadPolicy(policyFile)

    // then
    expect(policy).toEqual({})
  })

  it('returns empty config when file contains empty object', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    await writeFile(policyFile, '{}')

    // when
    const policy = await loadPolicy(policyFile)

    // then
    expect(policy).toEqual({})
  })

  it('parses valid JSON policy files', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    await writeFile(
      policyFile,
      JSON.stringify({
        slack: {
          read: {
            deny: {
              channelIds: ['C0SECRET'],
            },
          },
        },
      }),
    )

    // when
    const policy = await loadPolicy(policyFile)

    // then
    expect(policy.slack?.read?.deny?.channelIds).toEqual(['C0SECRET'])
    expect(policy.slack?.write).toEqual({})
  })

  it('throws SyntaxError when JSON is invalid', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    await writeFile(policyFile, '{')

    // when
    let caughtError: unknown

    try {
      await loadPolicy(policyFile)
    } catch (error) {
      caughtError = error
    }

    // then
    expect(caughtError).toBeInstanceOf(SyntaxError)
  })

  it('throws ZodError when schema is invalid', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    await writeFile(
      policyFile,
      JSON.stringify({
        slack: {
          read: {
            deny: {
              channelTypes: ['secret'],
            },
          },
        },
      }),
    )

    // when
    let caughtError: unknown

    try {
      await loadPolicy(policyFile)
    } catch (error) {
      caughtError = error
    }

    // then
    expect(caughtError).toBeInstanceOf(ZodError)
  })

  it('uses env var override when path is omitted', async () => {
    // given
    const policyFile = join(testDirectory, 'env-policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile
    await writeFile(
      policyFile,
      JSON.stringify({
        discord: {
          write: {
            deny: {
              userIds: ['123456789012345678'],
            },
          },
        },
      }),
    )

    // when
    const policy = await loadPolicy()

    // then
    expect(policy.discord?.write?.deny?.userIds).toEqual(['123456789012345678'])
    expect(policy.discord?.read).toEqual({})
  })

  it('reads chmod-protected policy files', async () => {
    // given
    const policyFile = join(testDirectory, 'protected-policy.json')
    await writeFile(
      policyFile,
      JSON.stringify({
        teams: {
          read: {
            deny: {
              channelTypes: ['channel'],
            },
          },
        },
      }),
    )
    await chmod(policyFile, 0o600)

    // when
    const policy = await loadPolicy(policyFile)

    // then
    expect(policy.teams?.read?.deny?.channelTypes).toEqual(['channel'])
    expect(policy.teams?.write).toEqual({})
  })
})
