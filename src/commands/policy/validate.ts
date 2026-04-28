import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { Command } from 'commander'

import { loadPolicy } from '@/policy/loader'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

const POLICY_FILE_ENV = 'AGENT_MESSENGER_POLICY_FILE'

type ValidateOptions = {
  file?: string
}

function defaultPolicyPath(): string {
  return join(homedir(), '.config', 'agent-messenger', 'policy.json')
}

export function resolvePolicyPath(policyPath?: string): string {
  return resolve(policyPath ?? process.env[POLICY_FILE_ENV] ?? defaultPolicyPath())
}

export async function runValidate(options: ValidateOptions): Promise<void> {
  const policyPath = resolvePolicyPath(options.file)

  try {
    await loadPolicy(policyPath)
    console.log(formatOutput({ valid: true, path: policyPath }))
  } catch {
    handleError(new Error('policy: invalid configuration'))
  }
}

export const validateCommand = new Command('validate')
  .description('Validate access control policy')
  .option('--file <path>', 'Policy file path')
  .action(runValidate)
