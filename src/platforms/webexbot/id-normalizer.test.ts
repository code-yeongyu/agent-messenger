import { describe, expect, it } from 'bun:test'

import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  MembershipActivity,
  MercuryActivity,
  RoomActivity,
} from 'webex-message-handler'

import {
  fromRestId,
  normalizeAttachmentAction,
  normalizeDeletedMessage,
  normalizeMembership,
  normalizeMessage,
  normalizeRoomActivity,
  toRestId,
} from './id-normalizer'

const RAW: MercuryActivity = {
  id: 'activity-uuid',
  verb: 'post',
  actor: { id: 'person-uuid', objectType: 'person', emailAddress: 'user@example.com' },
  object: { id: 'object-uuid', objectType: 'comment', displayName: 'hi' },
  target: { id: 'room-uuid', objectType: 'conversation' },
  published: '2024-01-01T00:00:00Z',
}

describe('toRestId / fromRestId', () => {
  it('encodes a uuid into a ciscospark REST id round-trippable to the uuid', () => {
    const restId = toRestId('abc-123', 'PEOPLE')
    expect(Buffer.from(restId, 'base64').toString('utf-8')).toBe('ciscospark://us/PEOPLE/abc-123')
    expect(fromRestId(restId)).toBe('abc-123')
  })

  it('supports ATTACHMENT_ACTION which the upstream helper omits', () => {
    expect(Buffer.from(toRestId('a-1', 'ATTACHMENT_ACTION'), 'base64').toString('utf-8')).toBe(
      'ciscospark://us/ATTACHMENT_ACTION/a-1',
    )
  })

  it('returns empty input unchanged', () => {
    expect(toRestId('', 'MESSAGE')).toBe('')
  })
})

describe('normalizeMessage', () => {
  const message: DecryptedMessage = {
    id: 'msg-uuid',
    parentId: 'parent-uuid',
    roomId: 'room-uuid',
    personId: 'person-uuid',
    personEmail: 'user@example.com',
    text: 'hello',
    html: '<p>hello</p>',
    created: '2024-01-01T00:00:00Z',
    roomType: 'group',
    mentionedPeople: ['mention-uuid-1', 'mention-uuid-2'],
    mentionedGroups: ['all'],
    files: ['https://files.example.com/a.png'],
    raw: RAW,
  }

  it('encodes message, room, person and mention ids to REST form', () => {
    const result = normalizeMessage(message)

    expect(result.id).toBe(toRestId('msg-uuid', 'MESSAGE'))
    expect(result.parentId).toBe(toRestId('parent-uuid', 'MESSAGE'))
    expect(result.roomId).toBe(toRestId('room-uuid', 'ROOM'))
    expect(result.personId).toBe(toRestId('person-uuid', 'PEOPLE'))
    expect(result.mentionedPeople).toEqual([toRestId('mention-uuid-1', 'PEOPLE'), toRestId('mention-uuid-2', 'PEOPLE')])
  })

  it('leaves non-id fields and raw untouched', () => {
    const result = normalizeMessage(message)

    expect(result.mentionedGroups).toEqual(['all'])
    expect(result.files).toEqual(['https://files.example.com/a.png'])
    expect(result.personEmail).toBe('user@example.com')
    expect(result.text).toBe('hello')
    expect(result.raw).toBe(RAW)
  })

  it('returns a new object without mutating the input', () => {
    const result = normalizeMessage(message)

    expect(result).not.toBe(message)
    expect(message.personId).toBe('person-uuid')
  })

  it('preserves an absent parentId', () => {
    const { parentId: _omit, ...withoutParent } = message
    const result = normalizeMessage(withoutParent)

    expect(result.parentId).toBeUndefined()
  })
})

describe('normalizeDeletedMessage', () => {
  it('encodes messageId, roomId and personId to REST form', () => {
    const deleted: DeletedMessage = {
      messageId: 'msg-uuid',
      roomId: 'room-uuid',
      personId: 'person-uuid',
    }

    expect(normalizeDeletedMessage(deleted)).toEqual({
      messageId: toRestId('msg-uuid', 'MESSAGE'),
      roomId: toRestId('room-uuid', 'ROOM'),
      personId: toRestId('person-uuid', 'PEOPLE'),
    })
  })
})

describe('normalizeMembership', () => {
  it('encodes person and room ids but leaves the activity id raw', () => {
    const membership: MembershipActivity = {
      id: 'activity-uuid',
      actorId: 'actor-uuid',
      personId: 'member-uuid',
      roomId: 'room-uuid',
      action: 'add',
      created: '2024-01-01T00:00:00Z',
      raw: RAW,
    }

    const result = normalizeMembership(membership)

    expect(result.id).toBe('activity-uuid')
    expect(result.actorId).toBe(toRestId('actor-uuid', 'PEOPLE'))
    expect(result.personId).toBe(toRestId('member-uuid', 'PEOPLE'))
    expect(result.roomId).toBe(toRestId('room-uuid', 'ROOM'))
    expect(result.raw).toBe(RAW)
  })
})

describe('normalizeAttachmentAction', () => {
  it('encodes the action id as ATTACHMENT_ACTION and the resource ids to REST form', () => {
    const action: AttachmentAction = {
      id: 'action-uuid',
      messageId: 'msg-uuid',
      personId: 'person-uuid',
      personEmail: 'user@example.com',
      roomId: 'room-uuid',
      inputs: { choice: 'yes' },
      created: '2024-01-01T00:00:00Z',
      raw: RAW,
    }

    const result = normalizeAttachmentAction(action)

    expect(result.id).toBe(toRestId('action-uuid', 'ATTACHMENT_ACTION'))
    expect(result.messageId).toBe(toRestId('msg-uuid', 'MESSAGE'))
    expect(result.personId).toBe(toRestId('person-uuid', 'PEOPLE'))
    expect(result.roomId).toBe(toRestId('room-uuid', 'ROOM'))
    expect(result.inputs).toEqual({ choice: 'yes' })
  })

  it('preserves an empty messageId', () => {
    const action: AttachmentAction = {
      id: 'action-uuid',
      messageId: '',
      personId: 'person-uuid',
      personEmail: 'user@example.com',
      roomId: 'room-uuid',
      inputs: {},
      created: '2024-01-01T00:00:00Z',
      raw: RAW,
    }

    expect(normalizeAttachmentAction(action).messageId).toBe('')
  })
})

describe('normalizeRoomActivity', () => {
  it('encodes room and actor ids but leaves the activity id raw', () => {
    const room: RoomActivity = {
      id: 'activity-uuid',
      roomId: 'room-uuid',
      actorId: 'actor-uuid',
      action: 'created',
      created: '2024-01-01T00:00:00Z',
      raw: RAW,
    }

    const result = normalizeRoomActivity(room)

    expect(result.id).toBe('activity-uuid')
    expect(result.roomId).toBe(toRestId('room-uuid', 'ROOM'))
    expect(result.actorId).toBe(toRestId('actor-uuid', 'PEOPLE'))
    expect(result.raw).toBe(RAW)
  })
})
