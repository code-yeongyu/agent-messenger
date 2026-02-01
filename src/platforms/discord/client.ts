import { readFile } from 'node:fs/promises'
import { getDiscordHeaders, humanDelay } from './super-properties'
import type {
  DiscordChannel,
  DiscordDMChannel,
  DiscordFile,
  DiscordGuild,
  DiscordGuildMember,
  DiscordMention,
  DiscordMessage,
  DiscordMessageSearchResponse,
  DiscordReadState,
  DiscordRelationship,
  DiscordUser,
  DiscordUserNote,
  DiscordUserProfile,
} from './types'

export class DiscordError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'DiscordError'
    this.code = code
  }
}

interface RateLimitBucket {
  remaining: number
  resetAt: number
  bucketHash: string
}

const BASE_URL = 'https://discord.com/api/v10'
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 100

export class DiscordClient {
  private token: string
  private buckets: Map<string, RateLimitBucket> = new Map()
  private globalRateLimitUntil: number = 0

  constructor(token: string) {
    if (!token) {
      throw new DiscordError('Token is required', 'missing_token')
    }
    this.token = token
  }

  private getBucketKey(method: string, path: string): string {
    const normalized = path
      .replace(/\/channels\/\d+/, '/channels/{channel_id}')
      .replace(/\/guilds\/\d+/, '/guilds/{guild_id}')
      .replace(/\/users\/\d+/, '/users/{user_id}')
      .replace(/\/messages\/\d+/, '/messages/{message_id}')
    return `${method}:${normalized}`
  }

  private async waitForRateLimit(bucketKey: string): Promise<void> {
    const now = Date.now()

    if (this.globalRateLimitUntil > now) {
      await this.sleep(this.globalRateLimitUntil - now)
    }

    const bucket = this.buckets.get(bucketKey)
    if (bucket && bucket.remaining === 0 && bucket.resetAt * 1000 > now) {
      await this.sleep(bucket.resetAt * 1000 - now)
    }
  }

  private updateBucket(bucketKey: string, response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')
    const bucketHash = response.headers.get('X-RateLimit-Bucket')

    if (remaining !== null && reset !== null && bucketHash !== null) {
      this.buckets.set(bucketKey, {
        remaining: parseInt(remaining, 10),
        resetAt: parseFloat(reset),
        bucketHash,
      })
    }
  }

  private async handleRateLimitResponse(response: Response): Promise<number> {
    const retryAfter = response.headers.get('Retry-After')
    const isGlobal = response.headers.get('X-RateLimit-Global') === 'true'
    const waitMs = parseFloat(retryAfter || '1') * 1000

    if (isGlobal) {
      this.globalRateLimitUntil = Date.now() + waitMs
    }

    await this.sleep(waitMs)
    return waitMs
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BASE_URL}${path}`
    const bucketKey = this.getBucketKey(method, path)
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.waitForRateLimit(bucketKey)

      const headers = getDiscordHeaders(this.token)

      const options: RequestInit = {
        method,
        headers,
      }

      if (body !== undefined) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)
      this.updateBucket(bucketKey, response)

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await this.handleRateLimitResponse(response)
          continue
        }
        const errorBody = await response.json().catch(() => ({}))
        throw new DiscordError((errorBody as any).message || 'Rate limited', 'rate_limited')
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await this.sleep(BASE_BACKOFF_MS * 2 ** attempt)
        continue
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new DiscordError(
          (errorBody as any).message || `HTTP ${response.status}`,
          (errorBody as any).code?.toString() || `http_${response.status}`
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return response.json() as Promise<T>
    }

    throw lastError || new DiscordError('Request failed after retries', 'max_retries')
  }

  private async requestFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = `${BASE_URL}${path}`
    const bucketKey = this.getBucketKey('POST', path)

    await this.waitForRateLimit(bucketKey)

    const headers = getDiscordHeaders(this.token)
    delete headers['Content-Type']

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })

    this.updateBucket(bucketKey, response)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new DiscordError(
        (errorBody as any).message || `HTTP ${response.status}`,
        (errorBody as any).code?.toString() || `http_${response.status}`
      )
    }

    return response.json() as Promise<T>
  }

  async testAuth(): Promise<DiscordUser> {
    return this.request<DiscordUser>('GET', '/users/@me')
  }

  async listGuilds(): Promise<DiscordGuild[]> {
    return this.request<DiscordGuild[]>('GET', '/users/@me/guilds')
  }

  async getGuild(guildId: string): Promise<DiscordGuild> {
    return this.request<DiscordGuild>('GET', `/guilds/${guildId}`)
  }

  async listChannels(guildId: string): Promise<DiscordChannel[]> {
    return this.request<DiscordChannel[]>('GET', `/guilds/${guildId}/channels`)
  }

  async getChannel(channelId: string): Promise<DiscordChannel> {
    return this.request<DiscordChannel>('GET', `/channels/${channelId}`)
  }

  async sendMessage(
    channelId: string,
    content: string,
    options?: {
      replyTo?: string
    }
  ): Promise<DiscordMessage> {
    const body: Record<string, unknown> = { content }

    if (options?.replyTo) {
      body.message_reference = {
        message_id: options.replyTo,
      }
    }

    return this.request<DiscordMessage>('POST', `/channels/${channelId}/messages`, body)
  }

  async editMessage(
    channelId: string,
    messageId: string,
    content: string
  ): Promise<DiscordMessage> {
    return this.request<DiscordMessage>('PATCH', `/channels/${channelId}/messages/${messageId}`, {
      content,
    })
  }

  async getMessages(channelId: string, limit: number = 50): Promise<DiscordMessage[]> {
    return this.request<DiscordMessage[]>('GET', `/channels/${channelId}/messages?limit=${limit}`)
  }

  async searchMessages(
    guildId: string,
    options: {
      content?: string
      authorId?: string
      channelId?: string
      limit?: number
      offset?: number
    }
  ): Promise<DiscordMessageSearchResponse> {
    const params = new URLSearchParams()
    if (options.content) params.set('content', options.content)
    if (options.authorId) params.set('author_id', options.authorId)
    if (options.channelId) params.set('channel_id', options.channelId)
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    if (options.offset !== undefined) params.set('offset', String(options.offset))
    const query = params.toString()
    return this.request<DiscordMessageSearchResponse>(
      'GET',
      `/guilds/${guildId}/messages/search${query ? '?' + query : ''}`
    )
  }

  async getMessage(channelId: string, messageId: string): Promise<DiscordMessage> {
    return this.request<DiscordMessage>('GET', `/channels/${channelId}/messages/${messageId}`)
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    return this.request<void>('DELETE', `/channels/${channelId}/messages/${messageId}`)
  }

  async triggerTyping(channelId: string): Promise<void> {
    return this.request<void>('POST', `/channels/${channelId}/typing`)
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    const encodedEmoji = encodeURIComponent(emoji)
    return this.request<void>(
      'PUT',
      `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`
    )
  }

  async removeReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    const encodedEmoji = encodeURIComponent(emoji)
    return this.request<void>(
      'DELETE',
      `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`
    )
  }

  async listUsers(guildId: string): Promise<DiscordUser[]> {
    interface GuildMember {
      user: DiscordUser
    }
    const members = await this.request<GuildMember[]>(
      'GET',
      `/guilds/${guildId}/members?limit=1000`
    )
    return members.map((m) => m.user)
  }

  async getUser(userId: string): Promise<DiscordUser> {
    return this.request<DiscordUser>('GET', `/users/${userId}`)
  }

  async uploadFile(channelId: string, filePath: string): Promise<DiscordFile> {
    const fileBuffer = await readFile(filePath)
    const filename = filePath.split('/').pop() || 'file'

    const formData = new FormData()
    formData.append('files[0]', new Blob([fileBuffer]), filename)

    interface MessageWithAttachments extends DiscordMessage {
      attachments: DiscordFile[]
    }
    const message = await this.requestFormData<MessageWithAttachments>(
      `/channels/${channelId}/messages`,
      formData
    )

    return message.attachments[0]
  }

  async listFiles(channelId: string): Promise<DiscordFile[]> {
    interface MessageWithAttachments extends DiscordMessage {
      attachments: DiscordFile[]
    }
    const messages = await this.request<MessageWithAttachments[]>(
      'GET',
      `/channels/${channelId}/messages?limit=100`
    )

    const files: DiscordFile[] = []
    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        files.push(...msg.attachments)
      }
    }
    return files
  }

  async listDMChannels(): Promise<DiscordDMChannel[]> {
    return this.request<DiscordDMChannel[]>('GET', '/users/@me/channels')
  }

  async createDM(userId: string): Promise<DiscordDMChannel> {
    return this.request<DiscordDMChannel>('POST', '/users/@me/channels', {
      recipient_id: userId,
    })
  }

  async getMentions(options?: {
    limit?: number
    guildId?: string
    roles?: boolean
    everyone?: boolean
  }): Promise<DiscordMention[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.guildId) params.set('guild_id', options.guildId)
    if (options?.roles !== false) params.set('roles', 'true')
    if (options?.everyone !== false) params.set('everyone', 'true')
    const query = params.toString()
    return this.request<DiscordMention[]>('GET', `/users/@me/mentions${query ? '?' + query : ''}`)
  }

  async ackMessage(channelId: string, messageId: string): Promise<void> {
    return this.request<void>('POST', `/channels/${channelId}/messages/${messageId}/ack`, {
      token: null,
    })
  }

  async getReadStates(): Promise<DiscordReadState[]> {
    return this.request<DiscordReadState[]>('GET', '/users/@me/read-states')
  }

  async getRelationships(): Promise<DiscordRelationship[]> {
    return this.request<DiscordRelationship[]>('GET', '/users/@me/relationships')
  }

  async getUserNote(userId: string): Promise<DiscordUserNote | null> {
    try {
      return await this.request<DiscordUserNote>('GET', `/users/@me/notes/${userId}`)
    } catch (error) {
      if (error instanceof DiscordError && error.code === '10013') {
        return null
      }
      throw error
    }
  }

  async setUserNote(userId: string, note: string): Promise<void> {
    return this.request<void>('PUT', `/users/@me/notes/${userId}`, { note })
  }

  async searchMembers(
    guildId: string,
    query: string,
    limit: number = 10
  ): Promise<DiscordGuildMember[]> {
    const params = new URLSearchParams()
    params.set('query', query)
    params.set('limit', String(limit))
    return this.request<DiscordGuildMember[]>(
      'GET',
      `/guilds/${guildId}/members/search?${params.toString()}`
    )
  }

  async getUserProfile(userId: string): Promise<DiscordUserProfile> {
    return this.request<DiscordUserProfile>('GET', `/users/${userId}/profile`)
  }

  async createThread(
    channelId: string,
    name: string,
    options?: {
      autoArchiveDuration?: number
      rateLimitPerUser?: number
    }
  ): Promise<DiscordChannel> {
    const body: Record<string, unknown> = { name }
    if (options?.autoArchiveDuration !== undefined) {
      body.auto_archive_duration = options.autoArchiveDuration
    }
    if (options?.rateLimitPerUser !== undefined) {
      body.rate_limit_per_user = options.rateLimitPerUser
    }
    return this.request<DiscordChannel>('POST', `/channels/${channelId}/threads`, body)
  }

  async archiveThread(threadId: string, archived: boolean): Promise<DiscordChannel> {
    return this.request<DiscordChannel>('PATCH', `/channels/${threadId}`, { archived })
  }

  async pinMessage(channelId: string, messageId: string): Promise<void> {
    await this.request<void>('PUT', `/channels/${channelId}/pins/${messageId}`)
  }

  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    await this.request<void>('DELETE', `/channels/${channelId}/pins/${messageId}`)
  }

  async getPinnedMessages(channelId: string): Promise<DiscordMessage[]> {
    return this.request<DiscordMessage[]>('GET', `/channels/${channelId}/pins`)
  }
}
