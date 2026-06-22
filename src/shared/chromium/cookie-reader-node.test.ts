import { expect, it } from 'bun:test'
import { execSync } from 'node:child_process'

it('ChromiumCookieReader works in Node.js (node:sqlite)', () => {
  const result = execSync('bun tsx src/shared/chromium/cookie-reader-node-test.ts', {
    cwd: process.cwd(),
    encoding: 'utf-8',
  })
  expect(result.trim()).toBe('ok')
})
