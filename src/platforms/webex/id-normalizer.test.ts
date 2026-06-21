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
  toRef,
} from './id-normalizer'

const RAW: MercuryActivity = {
  id: 'activity-uuid',
  verb: 'post',
  actor: { id: 'person-uuid', objectType: 'person', emailAddress: 'user@example.com' },
  object: { id: 'object-uuid', objectType: 'comment', displayName: 'hi' },
  target: { id: 'room-uuid', objectType: 'conversation' },
  published: '2024-01-01T00:00:00Z',
}

const restId = (type: string, ref: string) => Buffer.from(`ciscospark://us/${type}/${ref}`).toString('base64url')

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

  it('emits unpadded base64url ids matching the Webex REST API', () => {
    // 36-char UUID -> 59-byte URI, which exposes the padding bug; a URI length
    // that is a multiple of 3 produces no padding and would hide the regression.
    const uuid = '12345678-1234-1234-1234-1234567890ab'
    const restId = toRestId(uuid, 'PEOPLE')

    expect(restId).toBe(Buffer.from(`ciscospark://us/PEOPLE/${uuid}`).toString('base64url'))
    expect(restId).not.toContain('=')
    expect(restId).not.toMatch(/[+/]/)
    expect(fromRestId(restId)).toBe(uuid)
  })

  it('returns empty input unchanged', () => {
    expect(toRestId('', 'MESSAGE')).toBe('')
  })
})

describe('toRef', () => {
  it('returns a room uuid ref', () => {
    const uuid = '12345678-1234-1234-1234-1234567890ab'

    expect(toRef(toRestId(uuid, 'ROOM'))).toBe(uuid)
  })

  it('returns a person uuid ref', () => {
    const uuid = '22222222-2222-2222-2222-222222222222'

    expect(toRef(toRestId(uuid, 'PEOPLE'))).toBe(uuid)
  })

  it('returns a legacy person email ref', () => {
    expect(toRef(toRestId('legacy@example.com', 'PEOPLE'))).toBe('legacy@example.com')
  })

  it('returns an organization uuid ref', () => {
    const uuid = '33333333-3333-3333-3333-333333333333'

    expect(toRef(restId('ORGANIZATION', uuid))).toBe(uuid)
  })

  it('returns a membership person-room pair ref', () => {
    const membershipRef = '44444444-4444-4444-4444-444444444444:55555555-5555-5555-5555-555555555555'

    expect(toRef(restId('MEMBERSHIP', membershipRef))).toBe(membershipRef)
  })

  it('returns empty input unchanged', () => {
    expect(toRef('')).toBe('')
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

  it('adds a raw uuid ref alongside every id', () => {
    const result = normalizeMessage(message)

    expect(result.ref).toBe('msg-uuid')
    expect(result.parentRef).toBe('parent-uuid')
    expect(result.roomRef).toBe('room-uuid')
    expect(result.personRef).toBe('person-uuid')
    expect(result.mentionedPeopleRefs).toEqual(['mention-uuid-1', 'mention-uuid-2'])
  })

  it('omits parentRef when parentId is absent', () => {
    const { parentId: _omit, ...withoutParent } = message
    const result = normalizeMessage(withoutParent)

    expect(result.parentRef).toBeUndefined()
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
      messageRef: 'msg-uuid',
      roomId: toRestId('room-uuid', 'ROOM'),
      roomRef: 'room-uuid',
      personId: toRestId('person-uuid', 'PEOPLE'),
      personRef: 'person-uuid',
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

  it('sets ref to the raw activity id and adds refs for the rest', () => {
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

    expect(result.ref).toBe('activity-uuid')
    expect(result.actorRef).toBe('actor-uuid')
    expect(result.personRef).toBe('member-uuid')
    expect(result.roomRef).toBe('room-uuid')
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

  it('adds a raw uuid ref alongside every id', () => {
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

    expect(result.ref).toBe('action-uuid')
    expect(result.messageRef).toBe('msg-uuid')
    expect(result.personRef).toBe('person-uuid')
    expect(result.roomRef).toBe('room-uuid')
  })

  it('preserves an empty messageId and its ref', () => {
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

    const result = normalizeAttachmentAction(action)
    expect(result.messageId).toBe('')
    expect(result.messageRef).toBe('')
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

  it('sets ref to the raw activity id and adds refs for the rest', () => {
    const room: RoomActivity = {
      id: 'activity-uuid',
      roomId: 'room-uuid',
      actorId: 'actor-uuid',
      action: 'created',
      created: '2024-01-01T00:00:00Z',
      raw: RAW,
    }

    const result = normalizeRoomActivity(room)

    expect(result.ref).toBe('activity-uuid')
    expect(result.roomRef).toBe('room-uuid')
    expect(result.actorRef).toBe('actor-uuid')
  })
})
