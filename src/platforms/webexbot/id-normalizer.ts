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

/**
 * Encode a raw Mercury UUID as a base64 `ciscospark://us/{TYPE}/{uuid}` Webex
 * REST ID. Empty input is returned unchanged so an absent ID never becomes a
 * bogus `ciscospark://us/{TYPE}/` value.
 */
export function toRestId(uuid: string, type: WebexRestIdType): string {
  if (!uuid) return uuid
  return Buffer.from(`ciscospark://us/${type}/${uuid}`).toString('base64')
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
