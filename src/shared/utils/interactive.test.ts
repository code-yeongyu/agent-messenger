import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { hasTTY, isInteractive } from './interactive'

describe('isInteractive', () => {
  let originalStdinTTY: boolean | undefined
  let originalStdoutTTY: boolean | undefined

  beforeEach(() => {
    originalStdinTTY = process.stdin.isTTY
    originalStdoutTTY = process.stdout.isTTY
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTTY, writable: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutTTY, writable: true, configurable: true })
  })

  function setTTY(stdin: boolean | undefined, stdout: boolean | undefined): void {
    Object.defineProperty(process.stdin, 'isTTY', { value: stdin, writable: true, configurable: true })
    Object.defineProperty(process.stdout, 'isTTY', { value: stdout, writable: true, configurable: true })
  }

  it('returns true when both stdin and stdout are TTY', () => {
    setTTY(true, true)
    expect(isInteractive()).toBe(true)
  })

  it('returns false when stdin is not a TTY (piped input)', () => {
    setTTY(undefined, true)
    expect(isInteractive()).toBe(false)
  })

  it('returns false when stdout is not a TTY (piped output)', () => {
    setTTY(true, undefined)
    expect(isInteractive()).toBe(false)
  })

  it('returns false when neither is a TTY', () => {
    setTTY(undefined, undefined)
    expect(isInteractive()).toBe(false)
  })

  it('returns false when stdin/stdout isTTY is explicitly false', () => {
    setTTY(false, false)
    expect(isInteractive()).toBe(false)
  })
})

describe('hasTTY', () => {
  it('returns a boolean reflecting whether a controlling TTY can be opened', () => {
    const result = hasTTY()
    expect(typeof result).toBe('boolean')
  })
})
