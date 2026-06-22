import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ChromiumCookieReader } from '@/shared/chromium'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const tempDir = mkdtempSync(join(tmpdir(), 'cookie-reader-node-test-'))
const dbPath = join(tempDir, 'Cookies')

try {
  const db = new DatabaseSync(dbPath)
  db.exec('CREATE TABLE cookies (name TEXT, value TEXT, host_key TEXT, last_access_utc INTEGER)')
  const insert = db.prepare('INSERT INTO cookies (name, value, host_key, last_access_utc) VALUES (?, ?, ?, ?)')
  insert.run('d', 'xoxd-newer', '.slack.com', 200)
  insert.run('d', 'xoxd-older', '.slack.com', 100)
  insert.run('other', 'ignored', '.example.com', 300)
  db.close()

  if (typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined') {
    fail('Expected Node.js runtime (node:sqlite), but Bun was detected')
  }

  const reader = new ChromiumCookieReader()

  const first = await reader.queryFirst<{ value: string }>(
    dbPath,
    "SELECT value FROM cookies WHERE name = 'd' AND host_key LIKE ? ORDER BY last_access_utc DESC LIMIT 1",
    ['%slack.com%'],
  )
  if (first?.value !== 'xoxd-newer') fail(`queryFirst expected xoxd-newer, got ${String(first?.value)}`)

  const all = await reader.queryAll<{ value: string }>(
    dbPath,
    "SELECT value FROM cookies WHERE name = 'd' ORDER BY last_access_utc DESC",
  )
  if (all.length !== 2) fail(`queryAll expected 2 rows, got ${all.length}`)
  if (all[0]?.value !== 'xoxd-newer') fail('queryAll expected newest-first ordering')

  const none = await reader.queryFirst(dbPath, "SELECT value FROM cookies WHERE host_key = 'no.match'")
  if (none !== null) fail(`no-row queryFirst expected null, got ${String(none)}`)

  console.log('ok')
} finally {
  rmSync(tempDir, { recursive: true })
}
