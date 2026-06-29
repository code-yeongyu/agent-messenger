import { describe, expect, it } from 'bun:test'

import { resolveChatTarget } from './shared'

describe('resolveChatTarget', () => {
  it('treats a digits-only ref as a chat id (rowid)', () => {
    expect(resolveChatTarget('42')).toEqual({ chatId: 42 })
  })

  it('passes a portable guid/identifier through as chat_guid', () => {
    expect(resolveChatTarget('iMessage;-;+15551234567')).toEqual({ chatGuid: 'iMessage;-;+15551234567' })
    expect(resolveChatTarget('iMessage;+;chat99')).toEqual({ chatGuid: 'iMessage;+;chat99' })
  })

  it('treats a non-numeric, non-guid ref as a recipient handle', () => {
    expect(resolveChatTarget('+15551234567')).toEqual({ to: '+15551234567' })
    expect(resolveChatTarget('jane@icloud.com')).toEqual({ to: 'jane@icloud.com' })
  })
})
