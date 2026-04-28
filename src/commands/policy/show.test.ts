import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runShow } from './show'

describe('policy show', () => {
  let originalPolicyFile: string | undefined
  let testDirectory: string
  let consoleLogSpy: ReturnType<typeof spyOn>
  let processExitSpy: ReturnType<typeof spyOn>
  let stderrWriteSpy: ReturnType<typeof spyOn>

  beforeEach(async () => {
    originalPolicyFile = process.env.AGENT_MESSENGER_POLICY_FILE
    testDirectory = join(tmpdir(), `agent-messenger-policy-show-${Bun.randomUUIDv7()}`)
    await mkdir(testDirectory, { recursive: true })
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: string | number | null) => undefined as never)
    stderrWriteSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    if (originalPolicyFile === undefined) {
      delete process.env.AGENT_MESSENGER_POLICY_FILE
    } else {
      process.env.AGENT_MESSENGER_POLICY_FILE = originalPolicyFile
    }

    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
    stderrWriteSpy.mockRestore()
    await rm(testDirectory, { recursive: true, force: true })
  })

  it('prints normalized JSON when policy file is valid', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile
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
    await runShow({ pretty: false })

    // then
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify({
        slack: {
          read: {
            deny: {
              channelIds: ['C0SECRET'],
            },
          },
          write: {},
        },
      }),
    )
  })

  it('prints empty object when policy file is missing', async () => {
    // given
    process.env.AGENT_MESSENGER_POLICY_FILE = join(testDirectory, 'missing-policy.json')

    // when
    await runShow({ pretty: false })

    // then
    expect(consoleLogSpy).toHaveBeenCalledWith('{}')
  })

  it('handles errors when policy file is invalid', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile
    await writeFile(policyFile, '{')

    // when
    await runShow({ pretty: false })

    // then
    expect(stderrWriteSpy).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
