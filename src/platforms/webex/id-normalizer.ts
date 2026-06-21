import { fromRestId } from 'webex-message-handler'
import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  MembershipActivity,
  RoomActivity,
} from 'webex-message-handler'

import type { WebexMembership, WebexMessage, WebexPerson } from './types'

export { fromRestId }

// Superset of webex-message-handler's toRestId union, which omits ATTACHMENT_ACTION
// (the resource type behind GET /v1/attachment/actions).
export type WebexRestIdType = 'MESSAGE' | 'PEOPLE' | 'ROOM' | 'ATTACHMENT_ACTION'

export interface DecodedWebexId {
  cluster: string
  type: string
  uuid: string
}

export function toRef(id: string): string {
  // fromRestId throws on values that are not base64-encoded ciscospark ids; fail
  // open so a non-REST id (legacy/sentinel) yields the id itself instead of crashing.
  if (!id || !decodeWebexId(id)) return id
  return fromRestId(id)
}

// Webex REST ids are base64(url) of `ciscospark://<cluster>/<TYPE>/<uuid>`; room
// cluster correction needs all three parts, not just the trailing ref value.
export function decodeWebexId(restId: string): DecodedWebexId | null {
  if (!restId) return null
  const decoded = Buffer.from(restId, 'base64').toString('utf-8')
  const match = decoded.match(/^ciscospark:\/\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { cluster: match[1], type: match[2], uuid: match[3] }
}

/**
 * Encode a raw Mercury UUID as a Webex REST ID. Empty input is returned unchanged
 * so an absent ID never becomes a bogus `ciscospark://us/{TYPE}/` value.
 *
 * Webex REST IDs are unpadded base64url. Padded base64 (trailing `=`) would not
 * equal the ID the REST API returns for the same resource (e.g. the bot's own
 * `/people/me` id), silently breaking equality checks such as mention detection.
 */
export function toRestId(uuid: string, type: WebexRestIdType): string {
  if (!uuid) return uuid
  return Buffer.from(`ciscospark://us/${type}/${uuid}`).toString('base64url')
}

export function normalizeMessage(message: DecryptedMessage): DecryptedMessage {
  const id = toRestId(message.id, 'MESSAGE')
  const parentId = message.parentId ? toRestId(message.parentId, 'MESSAGE') : message.parentId
  const roomId = toRestId(message.roomId, 'ROOM')
  const personId = toRestId(message.personId, 'PEOPLE')
  const mentionedPeople = message.mentionedPeople.map((person) => toRestId(person, 'PEOPLE'))
  return {
    ...message,
    id,
    ref: toRef(id),
    parentId,
    parentRef: parentId ? toRef(parentId) : parentId,
    roomId,
    roomRef: toRef(roomId),
    personId,
    personRef: toRef(personId),
    mentionedPeople,
    mentionedPeopleRefs: mentionedPeople.map(toRef),
  }
}

export function normalizeDeletedMessage(message: DeletedMessage): DeletedMessage {
  const messageId = toRestId(message.messageId, 'MESSAGE')
  const roomId = toRestId(message.roomId, 'ROOM')
  const personId = toRestId(message.personId, 'PEOPLE')
  return {
    messageId,
    messageRef: toRef(messageId),
    roomId,
    roomRef: toRef(roomId),
    personId,
    personRef: toRef(personId),
  }
}

export function normalizeMembership(activity: MembershipActivity): MembershipActivity {
  // `id` stays raw: it is a Mercury activity UUID, not a REST membership ID, so
  // its ref is the id itself rather than a decoded REST id.
  const actorId = toRestId(activity.actorId, 'PEOPLE')
  const personId = toRestId(activity.personId, 'PEOPLE')
  const roomId = toRestId(activity.roomId, 'ROOM')
  return {
    ...activity,
    ref: activity.id,
    actorId,
    actorRef: toRef(actorId),
    personId,
    personRef: toRef(personId),
    roomId,
    roomRef: toRef(roomId),
  }
}

export function normalizeAttachmentAction(action: AttachmentAction): AttachmentAction {
  const id = toRestId(action.id, 'ATTACHMENT_ACTION')
  const messageId = action.messageId ? toRestId(action.messageId, 'MESSAGE') : action.messageId
  const personId = toRestId(action.personId, 'PEOPLE')
  const roomId = toRestId(action.roomId, 'ROOM')
  return {
    ...action,
    id,
    ref: toRef(id),
    messageId,
    messageRef: toRef(messageId),
    personId,
    personRef: toRef(personId),
    roomId,
    roomRef: toRef(roomId),
  }
}

export function normalizeRoomActivity(activity: RoomActivity): RoomActivity {
  // `id` stays raw: the Mercury conversation activity UUID has no consumer-facing
  // REST resource, so its ref is the id itself (the comparable REST id is `roomId`).
  const roomId = toRestId(activity.roomId, 'ROOM')
  const actorId = toRestId(activity.actorId, 'PEOPLE')
  return {
    ...activity,
    ref: activity.id,
    roomId,
    roomRef: toRef(roomId),
    actorId,
    actorRef: toRef(actorId),
  }
}

// SDK REST responses (people/messages/memberships) already carry REST-encoded ids,
// so unlike the event normalizers above we only attach raw uuid refs — no re-encoding.
export function normalizeSdkPerson(person: WebexPerson): WebexPerson {
  return {
    ...person,
    ref: toRef(person.id),
    orgRef: toRef(person.orgId),
  }
}

export function normalizeSdkMessage(message: WebexMessage): WebexMessage {
  return {
    ...message,
    ref: toRef(message.id),
    roomRef: toRef(message.roomId),
    personRef: toRef(message.personId),
    parentRef: message.parentId ? toRef(message.parentId) : message.parentId,
    mentionedPeopleRefs: message.mentionedPeople?.map(toRef),
  }
}

export function normalizeSdkMembership(membership: WebexMembership): WebexMembership {
  return {
    ...membership,
    ref: toRef(membership.id),
    roomRef: toRef(membership.roomId),
    personRef: toRef(membership.personId),
  }
}
