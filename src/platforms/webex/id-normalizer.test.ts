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
  normalizeSdkMembership,
  normalizeSdkMessage,
  normalizeSdkPerson,
  toRestId,
  toRef,
} from './id-normalizer'
import type { WebexMembership, WebexMessage, WebexPerson } from './types'

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

describe('normalizeSdkPerson', () => {
  const person: WebexPerson = {
    id: restId('PEOPLE', 'person-uuid'),
    ref: '',
    emails: ['user@example.com'],
    displayName: 'User',
    orgId: restId('ORGANIZATION', 'org-uuid'),
    orgRef: '',
    type: 'person',
    created: '2024-01-01T00:00:00Z',
  }

  it('decodes the bot identity id and orgId into raw uuid refs', () => {
    const result = normalizeSdkPerson(person)

    expect(result.ref).toBe('person-uuid')
    expect(result.orgRef).toBe('org-uuid')
  })

  it('does not re-encode the already-REST ids', () => {
    const result = normalizeSdkPerson(person)

    expect(result.id).toBe(restId('PEOPLE', 'person-uuid'))
    expect(result.orgId).toBe(restId('ORGANIZATION', 'org-uuid'))
  })

  it('leaves empty ids and refs empty', () => {
    const result = normalizeSdkPerson({ ...person, id: '', orgId: '' })

    expect(result.ref).toBe('')
    expect(result.orgRef).toBe('')
  })

  it('returns a new object without mutating the input', () => {
    const result = normalizeSdkPerson(person)

    expect(result).not.toBe(person)
    expect(person.ref).toBe('')
  })
})

describe('normalizeSdkMessage', () => {
  const message: WebexMessage = {
    id: restId('MESSAGE', 'msg-uuid'),
    ref: '',
    roomId: restId('ROOM', 'room-uuid'),
    roomRef: '',
    roomType: 'group',
    text: 'hello',
    personId: restId('PEOPLE', 'person-uuid'),
    personRef: '',
    personEmail: 'user@example.com',
    created: '2024-01-01T00:00:00Z',
    parentId: restId('MESSAGE', 'parent-uuid'),
    mentionedPeople: [restId('PEOPLE', 'mention-1'), restId('PEOPLE', 'mention-2')],
  }

  it('decodes id, roomId, personId and parentId into raw uuid refs', () => {
    const result = normalizeSdkMessage(message)

    expect(result.ref).toBe('msg-uuid')
    expect(result.roomRef).toBe('room-uuid')
    expect(result.personRef).toBe('person-uuid')
    expect(result.parentRef).toBe('parent-uuid')
  })

  it('adds a mentionedPeopleRefs array of raw uuids', () => {
    const result = normalizeSdkMessage(message)

    expect(result.mentionedPeopleRefs).toEqual(['mention-1', 'mention-2'])
  })

  it('omits parentRef when parentId is absent', () => {
    const { parentId: _omit, ...withoutParent } = message
    const result = normalizeSdkMessage(withoutParent)

    expect(result.parentRef).toBeUndefined()
  })

  it('omits mentionedPeopleRefs when mentionedPeople is absent', () => {
    const { mentionedPeople: _omit, ...withoutMentions } = message
    const result = normalizeSdkMessage(withoutMentions)

    expect(result.mentionedPeopleRefs).toBeUndefined()
  })

  it('does not re-encode the already-REST ids', () => {
    const result = normalizeSdkMessage(message)

    expect(result.id).toBe(restId('MESSAGE', 'msg-uuid'))
    expect(result.roomId).toBe(restId('ROOM', 'room-uuid'))
  })
})

describe('normalizeSdkMembership', () => {
  const membership: WebexMembership = {
    id: restId('MEMBERSHIP', 'membership-uuid'),
    ref: '',
    roomId: restId('ROOM', 'room-uuid'),
    roomRef: '',
    personId: restId('PEOPLE', 'person-uuid'),
    personRef: '',
    personEmail: 'user@example.com',
    personDisplayName: 'User',
    isModerator: false,
    created: '2024-01-01T00:00:00Z',
  }

  it('decodes id, roomId and personId into raw uuid refs', () => {
    const result = normalizeSdkMembership(membership)

    expect(result.ref).toBe('membership-uuid')
    expect(result.roomRef).toBe('room-uuid')
    expect(result.personRef).toBe('person-uuid')
  })

  it('does not re-encode the already-REST ids', () => {
    const result = normalizeSdkMembership(membership)

    expect(result.id).toBe(restId('MEMBERSHIP', 'membership-uuid'))
    expect(result.personId).toBe(restId('PEOPLE', 'person-uuid'))
  })
})

describe('SDK and event refs agree for the same person', () => {
  it('matches the bot identity ref against an event mention ref so self/mention detection holds', () => {
    const personUuid = 'bot-person-uuid'

    // given: the bot identity from a REST response (testAuth path)
    const bot = normalizeSdkPerson({
      id: restId('PEOPLE', personUuid),
      ref: '',
      emails: ['bot@webex.bot'],
      displayName: 'Bot',
      orgId: restId('ORGANIZATION', 'org-uuid'),
      orgRef: '',
      type: 'bot',
      created: '2024-01-01T00:00:00Z',
    })

    // when: an event carries the same person as a raw Mercury uuid
    const event = normalizeMessage({
      id: 'msg-uuid',
      roomId: 'room-uuid',
      personId: personUuid,
      personEmail: 'bot@webex.bot',
      text: 'hi',
      created: '2024-01-01T00:00:00Z',
      mentionedPeople: [personUuid],
      mentionedGroups: [],
      files: [],
      raw: RAW,
    })

    // then: both paths decode to the same raw uuid ref
    expect(bot.ref).toBe(personUuid)
    expect(event.personRef).toBe(personUuid)
    expect(event.mentionedPeopleRefs.includes(bot.ref)).toBe(true)
  })
})
