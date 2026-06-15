import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'bun:test'

describe('linejs login wrappers', () => {
  it('passes E2EE option through password login', async () => {
    const source = await readFile(new URL('./login.js', import.meta.url), 'utf8')

    expect(source).toContain('e2ee: opts.e2ee')
  })
})
