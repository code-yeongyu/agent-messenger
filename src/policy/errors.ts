import type { Direction } from './types'

export class PolicyDeniedError extends Error {
  readonly code = 'POLICY_DENIED' as const

  constructor(public readonly direction: Direction) {
    super(`policy: ${direction} denied`)
    this.name = 'PolicyDeniedError'
  }
}
