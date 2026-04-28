import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { Command } from 'commander'

import { loadPolicy as loadPolicyFile } from '@/policy/loader'
import type { PolicyConfig } from '@/policy/types'
import { warn } from '@/shared/utils/stderr'

import { resolvePolicyPath } from './validate'

type SpawnEditor = (policyPath: string) => Promise<number>
type LoadPolicy = (policyPath: string) => Promise<PolicyConfig>

type EditDependencies = {
  spawnEditor?: SpawnEditor
  loadPolicy?: LoadPolicy
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function defaultSpawnEditor(policyPath: string): Promise<number> {
  const editor = process.env.EDITOR ?? 'vi'

  return new Promise((resolveExitCode, reject) => {
    const childProcess = spawn('sh', ['-c', '"$EDITOR" "$0"', policyPath], {
      env: { ...process.env, EDITOR: editor },
      stdio: 'inherit',
    })

    childProcess.on('error', reject)
    childProcess.on('exit', (code) => {
      resolveExitCode(code ?? 1)
    })
  })
}

export async function runEdit(dependencies: EditDependencies = {}): Promise<void> {
  const policyPath = resolvePolicyPath()
  const spawnEditor = dependencies.spawnEditor ?? defaultSpawnEditor
  const loadPolicy = dependencies.loadPolicy ?? loadPolicyFile

  if (!(await fileExists(policyPath))) {
    await mkdir(dirname(policyPath), { recursive: true })
    await writeFile(policyPath, '{}', { mode: 0o600 })
  }

  const exitCode = await spawnEditor(policyPath)
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  try {
    await loadPolicy(policyPath)
  } catch {
    warn('policy: file saved but contains invalid configuration; run validate for details')
  }
}

export const editCommand = new Command('edit').description('Edit access control policy').action(() => runEdit())
