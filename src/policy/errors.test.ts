import { describe, expect, it } from 'bun:test'

import { PolicyDeniedError } from './errors'

describe('PolicyDeniedError', () => {
  it('creates read denial errors', () => {
    // given
    const direction = 'read'

    // when
    const error = new PolicyDeniedError(direction)

    // then
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(error.code).toBe('POLICY_DENIED')
    expect(error.direction).toBe(direction)
    expect(error.message).toMatch(/^policy: read denied$/)
  })

  it('creates write denial errors', () => {
    // given
    const direction = 'write'

    // when
    const error = new PolicyDeniedError(direction)

    // then
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(error.code).toBe('POLICY_DENIED')
    expect(error.direction).toBe(direction)
    expect(error.message).toMatch(/^policy: write denied$/)
  })
})
