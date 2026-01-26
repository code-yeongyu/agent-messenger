import type {
  ChannelRef,
  FileRef,
  MessageRef,
  SlackChannel,
  SlackFile,
  SlackMessage,
  SlackUser,
  UserRef,
} from '../types'

export class RefManager {
  private channelRefs = new Map<string, SlackChannel>()
  private messageRefs = new Map<string, SlackMessage>()
  private userRefs = new Map<string, SlackUser>()
  private fileRefs = new Map<string, SlackFile>()

  private channelCounter = 1
  private messageCounter = 1
  private userCounter = 1
  private fileCounter = 1

  assignChannelRef(channel: SlackChannel): ChannelRef {
    const ref = `@c${this.channelCounter}` as ChannelRef
    this.channelRefs.set(ref, channel)
    this.channelCounter++
    return ref
  }

  assignMessageRef(message: SlackMessage): MessageRef {
    const ref = `@m${this.messageCounter}` as MessageRef
    this.messageRefs.set(ref, message)
    this.messageCounter++
    return ref
  }

  assignUserRef(user: SlackUser): UserRef {
    const ref = `@u${this.userCounter}` as UserRef
    this.userRefs.set(ref, user)
    this.userCounter++
    return ref
  }

  assignFileRef(file: SlackFile): FileRef {
    const ref = `@f${this.fileCounter}` as FileRef
    this.fileRefs.set(ref, file)
    this.fileCounter++
    return ref
  }

  resolveRef(ref: string): { type: 'channel' | 'message' | 'user' | 'file'; id: string } | null {
    if (ref.startsWith('@c')) {
      const channel = this.channelRefs.get(ref as ChannelRef)
      return channel ? { type: 'channel', id: channel.id } : null
    }
    if (ref.startsWith('@m')) {
      const message = this.messageRefs.get(ref as MessageRef)
      return message ? { type: 'message', id: message.ts } : null
    }
    if (ref.startsWith('@u')) {
      const user = this.userRefs.get(ref as UserRef)
      return user ? { type: 'user', id: user.id } : null
    }
    if (ref.startsWith('@f')) {
      const file = this.fileRefs.get(ref as FileRef)
      return file ? { type: 'file', id: file.id } : null
    }
    return null
  }

  getChannelByRef(ref: ChannelRef): SlackChannel | null {
    return this.channelRefs.get(ref) || null
  }

  getMessageByRef(ref: MessageRef): SlackMessage | null {
    return this.messageRefs.get(ref) || null
  }

  getUserByRef(ref: UserRef): SlackUser | null {
    return this.userRefs.get(ref) || null
  }

  getFileByRef(ref: FileRef): SlackFile | null {
    return this.fileRefs.get(ref) || null
  }

  clear(): void {
    this.channelRefs.clear()
    this.messageRefs.clear()
    this.userRefs.clear()
    this.fileRefs.clear()
    this.channelCounter = 1
    this.messageCounter = 1
    this.userCounter = 1
    this.fileCounter = 1
  }

  serialize(): string {
    const refs: Record<string, string> = {}

    for (const [ref, channel] of this.channelRefs) {
      refs[ref] = channel.id
    }
    for (const [ref, message] of this.messageRefs) {
      refs[ref] = message.ts
    }
    for (const [ref, user] of this.userRefs) {
      refs[ref] = user.id
    }
    for (const [ref, file] of this.fileRefs) {
      refs[ref] = file.id
    }

    return JSON.stringify(refs)
  }
}
