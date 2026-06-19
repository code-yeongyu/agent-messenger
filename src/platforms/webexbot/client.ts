import { WebexClient } from '../webex/client'
import type { WebexMembership, WebexMessage, WebexPerson, WebexSpace } from '../webex/types'
import { WebexBotError } from './types'

interface DecodedWebexId {
  cluster: string
  type: string
  uuid: string
}

// Webex REST ids are base64(url) of `ciscospark://<cluster>/<TYPE>/<uuid>`; the
// cluster correction needs all three parts, not just the <uuid> `fromRestId` returns.
function decodeWebexId(restId: string): DecodedWebexId | null {
  if (!restId) return null
  const decoded = Buffer.from(restId, 'base64').toString('utf-8')
  const match = decoded.match(/^ciscospark:\/\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { cluster: match[1], type: match[2], uuid: match[3] }
}

export class WebexBotClient {
  private client = new WebexClient()
  private token: string | null = null

  // The listener flattens room ids to `ciscospark://us/ROOM/<uuid>`, but team/group
  // rooms live on `ciscospark://urn:TEAM:<cluster>/ROOM/<uuid>` — a cluster the bare
  // uuid cannot recover. Cache the real clustered id per uuid and dedupe concurrent
  // lookups so a burst of calls triggers a single `listSpaces`.
  private clusteredRoomIds = new Map<string, string>()
  private roomIdLookups = new Map<string, Promise<string>>()

  async login(credentials?: { token: string }): Promise<this> {
    if (credentials) {
      if (!credentials.token) {
        throw new WebexBotError('Token is required', 'missing_token')
      }
      this.token = credentials.token
      await this.client.login({ token: credentials.token })
      return this
    }

    const { WebexBotCredentialManager } = await import('./credential-manager')
    const credManager = new WebexBotCredentialManager()
    const creds = await credManager.getCredentials()
    if (!creds?.token) {
      throw new WebexBotError('No Webex bot credentials found. Run "auth set <token>" first.', 'no_credentials')
    }
    return this.login({ token: creds.token })
  }

  getToken(): string {
    if (!this.token) {
      throw new WebexBotError('Not authenticated. Call .login() first.', 'not_authenticated')
    }
    return this.token
  }

  async testAuth(): Promise<WebexPerson> {
    return this.client.testAuth()
  }

  async listSpaces(options?: { type?: string; max?: number }): Promise<WebexSpace[]> {
    return this.client.listSpaces(options)
  }

  async getSpace(spaceId: string): Promise<WebexSpace> {
    return this.client.getSpace(await this.resolveRoomId(spaceId))
  }

  async sendMessage(
    roomId: string,
    text: string,
    options?: { markdown?: boolean; parentId?: string; files?: string[] },
  ): Promise<WebexMessage> {
    return this.client.sendMessage(await this.resolveRoomId(roomId), text, options)
  }

  async sendDirectMessage(personEmail: string, text: string, options?: { markdown?: boolean }): Promise<WebexMessage> {
    return this.client.sendDirectMessage(personEmail, text, options)
  }

  async listMessages(roomId: string, options?: { max?: number; parentId?: string }): Promise<WebexMessage[]> {
    const resolvedRoomId = await this.resolveRoomId(roomId)
    const space = await this.client.getSpace(resolvedRoomId)
    const messageOptions = space.type === 'group' ? { ...options, mentionedPeople: 'me' } : options
    return this.client.listMessages(resolvedRoomId, messageOptions)
  }

  async listReplies(roomId: string, parentId: string, options?: { max?: number }): Promise<WebexMessage[]> {
    return this.client.listMessages(await this.resolveRoomId(roomId), { ...options, parentId })
  }

  async getMessage(messageId: string): Promise<WebexMessage> {
    // MESSAGE ids carry their parent room's cluster, which the bare-UUID normalizer
    // also flattens to `us`. Correcting that needs the room context, which a lone
    // messageId does not provide; room-keyed calls (the reported failures) are
    // corrected via resolveRoomId instead.
    return this.client.getMessage(messageId)
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.client.deleteMessage(messageId)
  }

  async editMessage(
    messageId: string,
    roomId: string,
    text: string,
    options?: { markdown?: boolean },
  ): Promise<WebexMessage> {
    return this.client.editMessage(messageId, await this.resolveRoomId(roomId), text, options)
  }

  async listPeople(options?: { email?: string; displayName?: string; max?: number }): Promise<WebexPerson[]> {
    return this.client.listPeople(options)
  }

  async getPerson(personId: string): Promise<WebexPerson> {
    return this.client.getPerson(personId)
  }

  async listMyMemberships(options?: { max?: number }): Promise<WebexMembership[]> {
    return this.client.listMyMemberships(options)
  }

  async listMemberships(roomId: string, options?: { max?: number }): Promise<WebexMembership[]> {
    return this.client.listMemberships(await this.resolveRoomId(roomId), options)
  }

  async uploadFile(
    roomId: string,
    file: { content: Blob; filename: string },
    options?: { text?: string; markdown?: boolean; parentId?: string },
  ): Promise<WebexMessage> {
    return this.client.uploadFile(await this.resolveRoomId(roomId), file, options)
  }

  async downloadContent(contentRef: string): Promise<{ data: ArrayBuffer; filename: string; contentType: string }> {
    return this.client.downloadContent(contentRef)
  }

  private async resolveRoomId(roomId: string): Promise<string> {
    const decoded = decodeWebexId(roomId)
    // Already cluster-qualified or undecodable: nothing to correct.
    if (!decoded || decoded.cluster.startsWith('urn:')) return roomId

    const { uuid } = decoded
    const cached = this.clusteredRoomIds.get(uuid)
    if (cached) return cached

    const inFlight = this.roomIdLookups.get(uuid)
    if (inFlight) return inFlight

    const lookup = this.lookupRoomId(uuid, roomId)
    this.roomIdLookups.set(uuid, lookup)
    try {
      return await lookup
    } finally {
      this.roomIdLookups.delete(uuid)
    }
  }

  private async lookupRoomId(uuid: string, fallback: string): Promise<string> {
    try {
      // Page through every room the bot belongs to (largest page size, following
      // `Link` pages), stopping as soon as the trailing UUID matches.
      for await (const room of this.client.iterateSpaces({ max: 1000 })) {
        if (decodeWebexId(room.id)?.uuid === uuid) {
          this.clusteredRoomIds.set(uuid, room.id)
          return room.id
        }
      }
    } catch {
      // Network/auth failure: fail open to the un-corrected id rather than block the call.
      return fallback
    }

    console.warn(
      `[webexbot] Could not resolve clustered room id for ${uuid}; falling back to the un-clustered id. ` +
        'Room-scoped calls may fail if this room lives on a non-default Webex cluster.',
    )
    return fallback
  }
}
