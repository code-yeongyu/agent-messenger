import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { decideSync, shortSha } from './check-upstream-sync.mjs'

describe('upstream sync detector', () => {
  it('skips when the upstream branch is already merged', () => {
    assert.deepEqual(decideSync({ alreadyMerged: true }), {
      proceed: false,
      reason: 'already-merged',
    })
  })

  it('proceeds when upstream is not merged into HEAD', () => {
    assert.deepEqual(decideSync({ alreadyMerged: false }), {
      proceed: true,
      reason: 'upstream-not-merged',
    })
  })

  it('allows a forced run even when upstream is already merged', () => {
    assert.deepEqual(decideSync({ force: true, alreadyMerged: true }), {
      proceed: true,
      reason: 'forced',
    })
  })

  it('uses a stable short sha for branch names and summaries', () => {
    assert.equal(shortSha('58ea10a2bbb29caeaba0a49c3a5fa6871bab3d34'), '58ea10a2bbb2')
  })
})
