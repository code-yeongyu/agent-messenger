import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runEdit } from './edit'

describe('policy edit', () => {
  let originalPolicyFile: string | undefined
  let originalEditor: string | undefined
  let testDirectory: string
  let processExitSpy: ReturnType<typeof spyOn>
  let stderrWriteSpy: ReturnType<typeof spyOn>

  beforeEach(async () => {
    originalPolicyFile = process.env.AGENT_MESSENGER_POLICY_FILE
    originalEditor = process.env.EDITOR
    testDirectory = join(tmpdir(), `agent-messenger-policy-edit-${Bun.randomUUIDv7()}`)
    await mkdir(testDirectory, { recursive: true })
    processExitSpy = spyOn(process, 'exit').mockImplementation((_code?: string | number | null) => undefined as never)
    stderrWriteSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    if (originalPolicyFile === undefined) {
      delete process.env.AGENT_MESSENGER_POLICY_FILE
    } else {
      process.env.AGENT_MESSENGER_POLICY_FILE = originalPolicyFile
    }

    if (originalEditor === undefined) {
      delete process.env.EDITOR
    } else {
      process.env.EDITOR = originalEditor
    }

    processExitSpy.mockRestore()
    stderrWriteSpy.mockRestore()
    await rm(testDirectory, { recursive: true, force: true })
  })

  it('creates missing policy file with private mode before editing', async () => {
    // given
    const policyFile = join(testDirectory, 'nested', 'policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile

    // when
    await runEdit({ spawnEditor: async () => 0 })

    // then
    expect(await Bun.file(policyFile).text()).toBe('{}')
    expect((await stat(policyFile)).mode & 0o777).toBe(0o600)
  })

  it('validates policy file when editor exits successfully', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile
    await writeFile(policyFile, '{}')
    let validated = false

    // when
    await runEdit({
      spawnEditor: async () => {
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
        return 0
      },
      loadPolicy: async (validatedPath) => {
        validated = validatedPath === policyFile
        return {}
      },
    })

    // then
    expect(validated).toBe(true)
    expect(processExitSpy).not.toHaveBeenCalled()
  })

  it('exits with editor code when editor exits non-zero', async () => {
    // given
    const policyFile = join(testDirectory, 'policy.json')
    process.env.AGENT_MESSENGER_POLICY_FILE = policyFile
    await writeFile(policyFile, '{}')

    // when
    await runEdit({ spawnEditor: async () => 37 })

    // then
    expect(processExitSpy).toHaveBeenCalledWith(37)
  })
})
