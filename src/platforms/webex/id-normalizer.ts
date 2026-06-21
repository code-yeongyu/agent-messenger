import { fromRestId } from 'webex-message-handler'
import type {
  AttachmentAction,
  DecryptedMessage,
  DeletedMessage,
  MembershipActivity,
  RoomActivity,
} from 'webex-message-handler'

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
  if (!id) return id
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
  return {
    ...message,
    id: toRestId(message.id, 'MESSAGE'),
    parentId: message.parentId ? toRestId(message.parentId, 'MESSAGE') : message.parentId,
    roomId: toRestId(message.roomId, 'ROOM'),
    personId: toRestId(message.personId, 'PEOPLE'),
    mentionedPeople: message.mentionedPeople.map((id) => toRestId(id, 'PEOPLE')),
  }
}

export function normalizeDeletedMessage(message: DeletedMessage): DeletedMessage {
  return {
    messageId: toRestId(message.messageId, 'MESSAGE'),
    roomId: toRestId(message.roomId, 'ROOM'),
    personId: toRestId(message.personId, 'PEOPLE'),
  }
}

export function normalizeMembership(activity: MembershipActivity): MembershipActivity {
  // `id` stays raw: it is a Mercury activity UUID, not a REST membership ID.
  return {
    ...activity,
    actorId: toRestId(activity.actorId, 'PEOPLE'),
    personId: toRestId(activity.personId, 'PEOPLE'),
    roomId: toRestId(activity.roomId, 'ROOM'),
  }
}

export function normalizeAttachmentAction(action: AttachmentAction): AttachmentAction {
  return {
    ...action,
    id: toRestId(action.id, 'ATTACHMENT_ACTION'),
    messageId: action.messageId ? toRestId(action.messageId, 'MESSAGE') : action.messageId,
    personId: toRestId(action.personId, 'PEOPLE'),
    roomId: toRestId(action.roomId, 'ROOM'),
  }
}

export function normalizeRoomActivity(activity: RoomActivity): RoomActivity {
  // `id` stays raw: the Mercury conversation activity UUID has no
  // consumer-facing REST resource (the comparable REST ID is `roomId`).
  return {
    ...activity,
    roomId: toRestId(activity.roomId, 'ROOM'),
    actorId: toRestId(activity.actorId, 'PEOPLE'),
  }
}
