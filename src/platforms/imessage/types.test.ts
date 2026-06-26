import { describe, expect, it } from 'bun:test'

import { createAccountId, IMessageError, type IMessageErrorCode } from './types'

describe('createAccountId', () => {
  it('slugifies deterministically and is filesystem-safe', () => {
    expect(createAccountId('/opt/homebrew/bin/imsg')).toBe(createAccountId('/opt/homebrew/bin/imsg'))
    expect(createAccountId('My Mac')).toBe('my-mac')
  })

  it('falls back to default for empty input', () => {
    expect(createAccountId('   ')).toBe('default')
  })
})

describe('IMessageError', () => {
  const codes: IMessageErrorCode[] = [
    'imsg_not_found',
    'full_disk_access',
    'automation_denied',
    'rpc_error',
    'send_failed',
    'not_authenticated',
    'invalid_limit',
    'chat_not_found',
    'private_api_required',
    'imessage_error',
  ]

  it('is instantiable with every code and exposes .code', () => {
    for (const code of codes) {
      const err = new IMessageError('m', code)
      expect(err.code).toBe(code)
      expect(err).toBeInstanceOf(Error)
    }
  })

  it('toJSON includes suggestion/doctorCommand only when present', () => {
    expect(new IMessageError('m', 'rpc_error').toJSON()).toEqual({ error: 'm', code: 'rpc_error' })
    expect(new IMessageError('m', 'imsg_not_found', { suggestion: 's', doctorCommand: 'd' }).toJSON()).toEqual({
      error: 'm',
      code: 'imsg_not_found',
      suggestion: 's',
      doctorCommand: 'd',
    })
  })
})
