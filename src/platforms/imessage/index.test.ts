import { describe, expect, it } from 'bun:test'

import * as imessage from './index'

describe('imessage SDK barrel', () => {
  it('exports client, rpc, credential manager, error, helper', () => {
    expect(typeof imessage.ImsgClient).toBe('function')
    expect(typeof imessage.ImsgRpc).toBe('function')
    expect(typeof imessage.IMessageCredentialManager).toBe('function')
    expect(typeof imessage.IMessageError).toBe('function')
    expect(typeof imessage.createAccountId).toBe('function')
  })
})
