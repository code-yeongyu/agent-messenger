import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runValidate } from './validate'

describe('policy validate', () => {
  let originalPolicyFile: string | undefined
  let testDirectory: string
  let consoleLogSpy: ReturnType<typeof spyOn>
  let processExitSpy: ReturnType<typeof spyOn>
  let stderrWriteSpy: ReturnType<typeof spyOn>

  beforeEach(async () => {
    originalPolicyFile = process.env.AGENT_MESSENGER_POLICY_FILE
    testDirectory = join(tmpdir(), `agent-messenger-policy-validate-${Bun.randomUUIDv7()}`)
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

  it('prints valid result when policy file is valid', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    await writeFile(policyFile, '{}')

    // when
    await runValidate({ file: policyFile })

    // then
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify({
        valid: true,
        path: policyFile,
      }),
    )
  })

  it('handles invalid JSON with masked error message', async () => {
    // given
    const policyFile = join(testDirectory, 'invalid-json-policy.json')
    await writeFile(policyFile, '{')

    // when
    await runValidate({ file: policyFile })

    // then
    expect(stderrWriteSpy).toHaveBeenCalledWith(JSON.stringify({ error: 'policy: invalid configuration' }) + '\n')
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('handles Zod validation errors with masked error message', async () => {
    // given
    const policyFile = join(testDirectory, 'invalid-schema-policy.json')
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
    await runValidate({ file: policyFile })

    // then
    expect(stderrWriteSpy).toHaveBeenCalledWith(JSON.stringify({ error: 'policy: invalid configuration' }) + '\n')
    expect(String(stderrWriteSpy.mock.calls[0]?.[0])).not.toContain('channelTypes')
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
