import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export interface ReadonlyStatement {
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

export interface ReadonlyDatabase {
  prepare(sql: string): ReadonlyStatement
  close(): void
}

type ReadonlyDatabaseConstructor = new (path: string, options: { readOnly: boolean }) => ReadonlyDatabase

// Uses the runtime's built-in driver (bun:sqlite on Bun, node:sqlite on Node >= 22.13)
// to avoid a native addon dependency.
//
// Runtime quirks callers must respect (both drivers behave this way):
// - BLOB columns are returned as Uint8Array, not Buffer. Wrap with Buffer.from()
//   before any Buffer-specific call (e.g. .toString('utf8'), node:crypto helpers).
// - node:sqlite throws ERR_OUT_OF_RANGE when reading an INTEGER above
//   Number.MAX_SAFE_INTEGER, so never SELECT raw microsecond timestamps such as
//   Chromium's *_utc columns; use them only in WHERE / ORDER BY clauses.
export function openReadonlyDatabase(path: string): ReadonlyDatabase {
  if (typeof globalThis.Bun !== 'undefined') {
    const { Database } = require('bun:sqlite')
    return new Database(path, { readonly: true }) as ReadonlyDatabase
  }

  let DatabaseSync: ReadonlyDatabaseConstructor
  // node:sqlite emits a one-time ExperimentalWarning to stderr on load
  // (Node < 24.15) that clutters the CLI's output. Suppress just that warning
  // while loading the module, then restore the original handler.
  const originalEmitWarning = process.emitWarning
  const filteredEmitWarning = (...args: unknown[]): void => {
    const [warning, second] = args
    const name =
      warning instanceof Error
        ? warning.name
        : typeof second === 'string'
          ? second
          : (second as { type?: string } | undefined)?.type
    const message = warning instanceof Error ? warning.message : String(warning)
    if (name === 'ExperimentalWarning' && message.includes('SQLite')) return
    ;(originalEmitWarning as (...forwarded: unknown[]) => void).apply(process, args)
  }
  process.emitWarning = filteredEmitWarning as typeof process.emitWarning
  try {
    DatabaseSync = require('node:sqlite').DatabaseSync
  } catch {
    throw new Error(
      'SQLite support requires Node.js >= 22.13.0 (the built-in node:sqlite module) or Bun. Please upgrade Node.js.',
    )
  } finally {
    process.emitWarning = originalEmitWarning
  }

  return new DatabaseSync(path, { readOnly: true })
}
