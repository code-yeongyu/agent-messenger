import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { PolicyConfigSchema } from './types'
import type { PolicyConfig } from './types'

const POLICY_FILE_ENV = 'AGENT_MESSENGER_POLICY_FILE'

function defaultPolicyPath(): string {
  return join(homedir(), '.config', 'agent-messenger', 'policy.json')
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}

export async function loadPolicy(policyPath?: string): Promise<PolicyConfig> {
  const resolvedPath = policyPath ?? process.env[POLICY_FILE_ENV] ?? defaultPolicyPath()

  try {
    const policyJson = await readFile(resolvedPath, 'utf8')
    return PolicyConfigSchema.parse(JSON.parse(policyJson))
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      return PolicyConfigSchema.parse({})
    }

    throw error
  }
}
