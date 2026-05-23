import { guessMimeFromFilename } from './media-upload'

export type AttachmentInput = {
  data: Uint8Array | Buffer
  filename: string
  mime?: string
}

export type SingleAttachmentKind = 'photo' | 'video' | 'audio' | 'file'

export type ResolvedAttachment = {
  kind: SingleAttachmentKind
  mime: string
  data: Uint8Array | Buffer
  filename: string
}

export type AttachmentPlan =
  | { kind: 'single'; resolved: ResolvedAttachment }
  | { kind: 'multiphoto'; items: readonly AttachmentInput[] }
  | { kind: 'sequential'; resolved: readonly ResolvedAttachment[] }

export function resolveAttachment(input: AttachmentInput): ResolvedAttachment {
  const mime = input.mime ?? guessMimeFromFilename(input.filename)
  const kind: SingleAttachmentKind = mime.startsWith('image/')
    ? 'photo'
    : mime.startsWith('video/')
      ? 'video'
      : mime.startsWith('audio/')
        ? 'audio'
        : 'file'
  return { kind, mime, data: input.data, filename: input.filename }
}

export function planAttachments(items: readonly AttachmentInput[]): AttachmentPlan {
  if (items.length === 0) {
    throw new Error('sendAttachment received an empty attachments array')
  }
  if (items.length === 1) {
    return { kind: 'single', resolved: resolveAttachment(items[0]!) }
  }
  const resolved = items.map(resolveAttachment)
  // MULTIPHOTO (message_type 27) is image-only by KakaoTalk's wire protocol.
  if (resolved.every((r) => r.kind === 'photo')) {
    return { kind: 'multiphoto', items: items.slice() }
  }
  return { kind: 'sequential', resolved }
}
