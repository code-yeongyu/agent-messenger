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

// Uses the runtime's built-in driver (bun:sqlite on Bun, node:sqlite on Node >= 22.5)
// to avoid a native addon dependency.
export function openReadonlyDatabase(path: string): ReadonlyDatabase {
  if (typeof globalThis.Bun !== 'undefined') {
    const { Database } = require('bun:sqlite')
    return new Database(path, { readonly: true }) as ReadonlyDatabase
  }

  let DatabaseSync: ReadonlyDatabaseConstructor
  try {
    DatabaseSync = require('node:sqlite').DatabaseSync
  } catch {
    throw new Error(
      'SQLite support requires Node.js >= 22.5 (the built-in node:sqlite module) or Bun. Please upgrade Node.js.',
    )
  }

  return new DatabaseSync(path, { readOnly: true })
}
