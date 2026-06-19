import { describe, expect, it } from 'bun:test'

import { parseEvents } from './listen'

describe('webexbot listen parseEvents', () => {
  it('returns defaults when no filter is given', () => {
    const events = parseEvents(undefined)
    expect(events).toContain('message_created')
    expect(events).toContain('error')
  })

  it('accepts known event names', () => {
    expect(parseEvents('message_created,disconnected')).toEqual(['message_created', 'disconnected'])
  })

  it('throws on unknown event names and lists supported events', () => {
    expect(() => parseEvents('message_created,mesage_deleted')).toThrow(/Unknown event\(s\): mesage_deleted/)
    expect(() => parseEvents('bogus')).toThrow(/Supported events:/)
  })
})
