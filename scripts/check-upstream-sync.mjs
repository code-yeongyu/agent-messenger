#!/usr/bin/env node
/**
 * Detect whether an upstream branch has commits that are not merged into HEAD.
 * Used by .github/workflows/upstream-agent-merge.yml before starting Codex.
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const DEFAULT_REMOTE = 'upstream'
const DEFAULT_BRANCH = 'main'
const DEFAULT_PIN_PATH = '.github/upstream.json'

function log(message) {
  process.stderr.write(`[check-upstream-sync] ${message}\n`)
}

function run(bin, args) {
  return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function tryRun(bin, args) {
  try {
    return { ok: true, stdout: run(bin, args) }
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout?.toString === 'function' ? error.stdout.toString().trim() : '',
      code: typeof error.status === 'number' ? error.status : 1,
    }
  }
}

export function shortSha(sha) {
  return sha.slice(0, 12)
}

export function decideSync({ force = false, alreadyMerged = false } = {}) {
  if (force) {
    return { proceed: true, reason: 'forced' }
  }
  if (alreadyMerged) {
    return { proceed: false, reason: 'already-merged' }
  }
  return { proceed: true, reason: 'upstream-not-merged' }
}

function readCurrentPin(pinPath) {
  try {
    const parsed = JSON.parse(readFileSync(pinPath, 'utf8'))
    return {
      repo: typeof parsed.repo === 'string' ? parsed.repo : '',
      branch: typeof parsed.branch === 'string' ? parsed.branch : '',
      sha: typeof parsed.sha === 'string' ? parsed.sha : '',
      syncedAt: typeof parsed.synced_at === 'string' ? parsed.synced_at : '',
    }
  } catch {
    return { repo: '', branch: '', sha: '', syncedAt: '' }
  }
}

function parseArgs(argv) {
  const args = {
    force: false,
    remote: DEFAULT_REMOTE,
    branch: DEFAULT_BRANCH,
    pinPath: DEFAULT_PIN_PATH,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--force') {
      args.force = true
    } else if (arg === '--remote') {
      i += 1
      args.remote = argv[i] ?? ''
    } else if (arg.startsWith('--remote=')) {
      args.remote = arg.slice('--remote='.length)
    } else if (arg === '--branch') {
      i += 1
      args.branch = argv[i] ?? ''
    } else if (arg.startsWith('--branch=')) {
      args.branch = arg.slice('--branch='.length)
    } else if (arg === '--pin-path') {
      i += 1
      args.pinPath = argv[i] ?? ''
    } else if (arg.startsWith('--pin-path=')) {
      args.pinPath = arg.slice('--pin-path='.length)
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: node scripts/check-upstream-sync.mjs [--force] [--remote upstream] [--branch main]\n',
      )
      process.exit(0)
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (!args.remote) {
    throw new Error('--remote must not be empty')
  }
  if (!args.branch) {
    throw new Error('--branch must not be empty')
  }
  return args
}

function emit(outputs) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`)
  process.stdout.write(`${lines.join('\n')}\n`)
  const file = process.env.GITHUB_OUTPUT
  if (file) {
    appendFileSync(file, `${lines.join('\n')}\n`)
  }
}

function resolveUpstreamSha(remote, branch) {
  run('git', ['fetch', '--quiet', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`])
  return run('git', ['rev-parse', `refs/remotes/${remote}/${branch}`])
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const pin = readCurrentPin(args.pinPath)
  const currentBranch = run('git', ['branch', '--show-current'])
  const upstreamSha = resolveUpstreamSha(args.remote, args.branch)
  const ancestor = tryRun('git', ['merge-base', '--is-ancestor', upstreamSha, 'HEAD'])
  const decision = decideSync({ force: args.force, alreadyMerged: ancestor.ok })

  log(`upstream ${args.remote}/${args.branch}: ${upstreamSha}`)
  log(`current branch: ${currentBranch}`)
  log(`decision: ${decision.reason}`)

  emit({
    proceed: String(decision.proceed),
    reason: decision.reason,
    remote: args.remote,
    branch: args.branch,
    current_branch: currentBranch,
    current_sha: pin.sha,
    current_synced_at: pin.syncedAt,
    sha: upstreamSha,
    short_sha: shortSha(upstreamSha),
  })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    log(`fatal: ${error instanceof Error ? error.message : String(error)}`)
    const file = process.env.GITHUB_OUTPUT
    if (file) {
      appendFileSync(file, 'proceed=false\nreason=detect-failed\n')
    }
    process.stdout.write('proceed=false\nreason=detect-failed\n')
    process.exitCode = 1
  }
}
