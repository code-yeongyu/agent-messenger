import { afterEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import { runDoctor } from './doctor'

const STUB = join(import.meta.dir, '..', 'test-stub-imsg.mjs')
const saved: Record<string, string | undefined> = {}

function setMode(mode: string, bin = STUB): void {
  saved.IMSG_STUB_MODE = process.env.IMSG_STUB_MODE
  saved.AGENT_IMESSAGE_BIN = process.env.AGENT_IMESSAGE_BIN
  process.env.IMSG_STUB_MODE = mode
  process.env.AGENT_IMESSAGE_BIN = bin
}

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('runDoctor', () => {
  it('reports imsg_not_found when the binary is missing', async () => {
    setMode('ok', '/nonexistent/imsg-xyz')
    const report = await runDoctor({})
    expect(report.ok).toBe(false)
    expect(report.code).toBe('imsg_not_found')
    expect(report.suggestion).toContain('brew install')
  })

  it('reports full_disk_access denied with Settings guidance', async () => {
    setMode('fda_denied')
    const report = await runDoctor({})
    expect(report.ok).toBe(false)
    expect(report.full_disk_access).toBe('denied')
    expect(report.code).toBe('full_disk_access')
    expect(report.suggestion).toContain('Full Disk Access')
  })

  it('reports healthy with version, FDA ok, and bridge note', async () => {
    setMode('ok')
    const report = await runDoctor({})
    expect(report.ok).toBe(true)
    expect(report.imsg).toBe('found')
    expect(report.imsg_version).toBe('0.11.1')
    expect(report.full_disk_access).toBe('ok')
    expect(report.bridge).toBe('disabled')
    expect(report.warnings.some((w) => w.includes('Private API bridge'))).toBe(true)
  })

  it('does not mislabel a non-FDA connect failure as Full Disk Access denied', async () => {
    setMode('connect_rpc_fail')
    const report = await runDoctor({})
    expect(report.ok).toBe(false)
    expect(report.full_disk_access).toBe('unknown')
    expect(report.code).toBe('rpc_error')
  })

  it('honors an explicit --bin override (verifies the supplied binary, not the default)', async () => {
    setMode('ok', '/nonexistent/default-imsg')
    const report = await runDoctor({ bin: STUB })
    expect(report.ok).toBe(true)
    expect(report.binary_path).toBe(STUB)
  })

  it('fails on an invalid --bin even when the default/env binary is valid', async () => {
    setMode('ok', STUB)
    const report = await runDoctor({ bin: '/nonexistent/custom-imsg' })
    expect(report.ok).toBe(false)
    expect(report.code).toBe('imsg_not_found')
    expect(report.binary_path).toBe('/nonexistent/custom-imsg')
  })

  it('runs a test-chat send when requested', async () => {
    setMode('ok')
    const report = await runDoctor({ testChat: 42 })
    expect(report.test_chat).toBe('sent')
  })
})
