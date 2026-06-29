import { describe, expect, it } from 'bun:test'

import { IMessageError } from '../types'
import { parseRowId } from './message'

describe('parseRowId', () => {
  it('parses a non-negative integer', () => {
    expect(parseRowId('9000')).toBe(9000)
    expect(parseRowId('0')).toBe(0)
  })

  it('returns undefined when absent', () => {
    expect(parseRowId(undefined)).toBeUndefined()
  })

  it('rejects non-integers', () => {
    expect(() => parseRowId('abc')).toThrow(IMessageError)
    expect(() => parseRowId('-5')).toThrow(IMessageError)
  })
})
