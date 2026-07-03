import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { TeamsCredentialManager } from './credential-manager'
import type {
  TeamsAccountType,
  TeamsChannel,
  TeamsChat,
  TeamsChatType,
  TeamsFile,
  TeamsMessage,
  TeamsRegion,
  TeamsTeam,
  TeamsUser,
} from './types'
import { TeamsError } from './types'

interface RateLimitBucket {
  remaining: number
  resetAt: number
}

const PERSONAL_MSG_API_BASE = 'https://msgapi.teams.live.com/v1'
const CSA_API_BASE = 'https://teams.microsoft.com/api'
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 100
const DEFAULT_REGION: TeamsRegion = 'amer'
const REGIONS: TeamsRegion[] = ['amer', 'emea', 'apac']

// Personal (Teams for Life) skypetokens carry a consumer `skypeid` (e.g.
// "live:..." or "8:live:..."); work/school tokens carry an org identity. Used
// only to guess the account type when a caller logs in with a bare token.
function isPersonalToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
      skypeid?: string
    }
    const skypeId = payload.skypeid ?? ''
    return skypeId.includes('live:') || skypeId.startsWith('8:live:')
  } catch {
    return false
  }
}

function stripHtml(content: string | undefined): string | undefined {
  if (content === undefined) return undefined
  const stripped = content.replace(/<[^>]*>/g, '')
  return stripped
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// groupId => Teams/channel thread (handled by listTeams). "48:notes"/
// streamofnotes => the user's self ("to me") chat. Anything else without a
// non-chat threadType is a normal 1:1 (no topic) or group (has topic) chat.
function classifyChat(
  id: string,
  tp?: { topic?: string; threadType?: string; groupId?: string },
): TeamsChatType | null {
  if (tp?.groupId) return null
  if (id === '48:notes' || tp?.threadType === 'streamofnotes') return 'self'
  if (tp?.threadType && tp.threadType !== 'chat') return null
  return tp?.topic ? 'group' : 'oneOnOne'
}

export class TeamsClient {
  private token: string | null = null
  private tokenExpiresAt?: Date
  private isPersonalAccount: boolean = false
  private region: TeamsRegion = DEFAULT_REGION
  private regionDiscovered: boolean = false
  private buckets: Map<string, RateLimitBucket> = new Map()
  private globalRateLimitUntil: number = 0

  async login(credentials?: {
    token: string
    tokenExpiresAt?: string
    accountType?: TeamsAccountType
    region?: TeamsRegion
  }): Promise<this> {
    if (credentials) {
      if (!credentials.token) {
        throw new TeamsError('Token is required', 'missing_token')
      }
      this.token = credentials.token
      if (credentials.tokenExpiresAt) {
        this.tokenExpiresAt = new Date(credentials.tokenExpiresAt)
      }
      this.isPersonalAccount = credentials.accountType
        ? credentials.accountType === 'personal'
        : isPersonalToken(credentials.token)
      if (credentials.region) {
        this.region = credentials.region
        this.regionDiscovered = true
      }
      return this
    }

    const { ensureTeamsAuth } = await import('./ensure-auth')
    await ensureTeamsAuth()
    const credManager = new TeamsCredentialManager()
    const creds = await credManager.getTokenWithExpiry()
    if (!creds) {
      throw new TeamsError(
        'No Teams credentials found. Make sure Microsoft Teams is logged in via the desktop app or a supported Chromium browser.',
        'no_credentials',
      )
    }
    return this.login({
      token: creds.token,
      tokenExpiresAt: creds.tokenExpiresAt,
      accountType: creds.accountType,
      region: creds.region,
    })
  }

  getRegion(): TeamsRegion {
    return this.region
  }

  getToken(): string {
    return this.ensureAuth()
  }

  getAccountType(): TeamsAccountType {
    return this.isPersonalAccount ? 'personal' : 'work'
  }

  async getIdToken(): Promise<string | null> {
    const { TeamsTokenExtractor } = await import('./token-extractor')
    const extractor = new TeamsTokenExtractor()
    return extractor.extractIdToken(this.getAccountType())
  }

  private ensureAuth(): string {
    if (this.token === null) {
      throw new TeamsError('Not authenticated. Call .login() first.', 'not_authenticated')
    }
    return this.token
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) {
      return false
    }
    return this.tokenExpiresAt.getTime() < Date.now()
  }

  private getBucketKey(method: string, path: string): string {
    const normalized = path
      .replace(/\/teams\/[^/]+/, '/teams/{team_id}')
      .replace(/\/channels\/[^/]+/, '/channels/{channel_id}')
      .replace(/\/messages\/[^/]+/, '/messages/{message_id}')
      .replace(/\/users\/[^/]+/, '/users/{user_id}')
      .replace(/\/members\/[^/]+/, '/members/{member_id}')
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

    if (remaining !== null && reset !== null) {
      this.buckets.set(bucketKey, {
        remaining: parseInt(remaining, 10),
        resetAt: parseFloat(reset),
      })
    }
  }

  private async handleRateLimitResponse(response: Response): Promise<number> {
    const retryAfter = response.headers.get('Retry-After')
    const waitMs = parseFloat(retryAfter || '1') * 1000

    this.globalRateLimitUntil = Date.now() + waitMs
    await this.sleep(waitMs)
    return waitMs
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getMsgApiBase(): string {
    if (this.isPersonalAccount) return PERSONAL_MSG_API_BASE
    return `https://${this.region}.ng.msg.teams.microsoft.com/v1`
  }

  private async discoverRegion(): Promise<void> {
    if (this.isPersonalAccount) {
      this.regionDiscovered = true
      return
    }

    const token = this.ensureAuth()

    for (const region of REGIONS) {
      try {
        const response = await fetch(`https://${region}.ng.msg.teams.microsoft.com/v1/users/ME/properties`, {
          headers: {
            'X-Skypetoken': token,
          },
        })

        if (response.ok || response.status !== 403) {
          this.region = region
          break
        }
      } catch {}
    }

    this.regionDiscovered = true
  }

  private async request<T>(method: string, path: string, body?: unknown, baseUrl?: string): Promise<T> {
    if (this.isTokenExpired()) {
      throw new TeamsError('Token has expired. Run "auth login" or "auth extract" to refresh.', 'token_expired')
    }

    if (baseUrl === undefined && !this.regionDiscovered) {
      await this.discoverRegion()
    }

    const url = `${baseUrl ?? this.getMsgApiBase()}${path}`
    const bucketKey = this.getBucketKey(method, path)

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.waitForRateLimit(bucketKey)

      const headers: Record<string, string> = {
        'X-Skypetoken': this.ensureAuth(),
        'Content-Type': 'application/json',
      }

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
        const errorBody = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        throw new TeamsError(errorBody?.message || 'Rate limited', 'rate_limited')
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await this.sleep(BASE_BACKOFF_MS * 2 ** attempt)
        continue
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          message?: string
          code?: string | number
        } | null
        throw new TeamsError(
          errorBody?.message || `HTTP ${response.status}`,
          errorBody?.code?.toString() ?? `http_${response.status}`,
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return response.json() as Promise<T>
    }

    throw new TeamsError('Request failed after retries', 'max_retries')
  }

  private async requestFormData<T>(path: string, formData: FormData, baseUrl?: string): Promise<T> {
    if (this.isTokenExpired()) {
      throw new TeamsError('Token has expired. Run "auth login" or "auth extract" to refresh.', 'token_expired')
    }

    if (baseUrl === undefined && !this.regionDiscovered) {
      await this.discoverRegion()
    }

    const url = `${baseUrl ?? this.getMsgApiBase()}${path}`
    const bucketKey = this.getBucketKey('POST', path)

    await this.waitForRateLimit(bucketKey)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Skypetoken': this.ensureAuth(),
      },
      body: formData,
    })

    this.updateBucket(bucketKey, response)

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as {
        message?: string
        code?: string | number
      } | null
      throw new TeamsError(
        errorBody?.message || `HTTP ${response.status}`,
        errorBody?.code?.toString() ?? `http_${response.status}`,
      )
    }

    return response.json() as Promise<T>
  }

  async testAuth(): Promise<TeamsUser> {
    interface UserProperties {
      userDetails?: string
      primaryMemberName?: string
      locale?: string
    }
    const props = await this.request<UserProperties>('GET', '/users/ME/properties')
    const userDetails = props.userDetails ? JSON.parse(props.userDetails) : {}
    return {
      id: 'ME',
      displayName: userDetails.name || props.primaryMemberName || 'Teams User',
    }
  }

  async listTeams(): Promise<TeamsTeam[]> {
    interface Conversation {
      id: string
      threadProperties?: {
        groupId?: string
        spaceThreadTopic?: string
        productThreadType?: string
        threadType?: string
      }
    }
    interface ConversationsResponse {
      conversations: Conversation[]
    }
    const data = await this.request<ConversationsResponse>('GET', '/users/ME/conversations')

    const teamsMap = new Map<string, TeamsTeam>()
    for (const conv of data.conversations) {
      const tp = conv.threadProperties
      if (!tp?.groupId) continue
      if (!tp.productThreadType?.includes('Teams') && tp.threadType !== 'space') continue

      if (!teamsMap.has(tp.groupId)) {
        teamsMap.set(tp.groupId, {
          id: tp.groupId,
          name: tp.spaceThreadTopic || 'Unknown Team',
        })
      }
    }

    return Array.from(teamsMap.values())
  }

  async listChats(): Promise<TeamsChat[]> {
    interface ConversationMessage {
      content?: string
      composetime?: string
      originalarrivaltime?: string
    }
    interface Conversation {
      id: string
      threadProperties?: {
        topic?: string
        threadType?: string
        groupId?: string
      }
      lastMessage?: ConversationMessage
    }
    interface ConversationsResponse {
      conversations: Conversation[]
    }
    const data = await this.request<ConversationsResponse>(
      'GET',
      '/users/ME/conversations?view=msnp24Equivalent&pageSize=500',
    )

    const chats: TeamsChat[] = []
    for (const conv of data.conversations ?? []) {
      const type = classifyChat(conv.id, conv.threadProperties)
      if (!type) continue

      chats.push({
        id: conv.id,
        type,
        topic: conv.threadProperties?.topic,
        last_message: stripHtml(conv.lastMessage?.content),
        last_message_at: conv.lastMessage?.composetime ?? conv.lastMessage?.originalarrivaltime,
      })
    }

    return chats
  }

  async getChatMessages(chatId: string, limit: number = 50): Promise<TeamsMessage[]> {
    interface ChatMessage {
      id: string
      content?: string
      from?: string
      imdisplayname?: string
      composetime?: string
      originalarrivaltime?: string
      messagetype?: string
    }
    interface MessagesResponse {
      messages: ChatMessage[]
    }
    const encodedChatId = encodeURIComponent(chatId)
    const data = await this.request<MessagesResponse>(
      'GET',
      `/users/ME/conversations/${encodedChatId}/messages?startTime=0&view=msnp24Equivalent&pageSize=${limit}`,
    )

    const userMessageTypes = new Set(['Text', 'RichText/Html', 'RichText/Media_CallRecording'])
    return (data.messages ?? [])
      .filter((msg) => !msg.messagetype || userMessageTypes.has(msg.messagetype))
      .slice(0, limit)
      .map((msg) => ({
        id: msg.id,
        channel_id: chatId,
        author: {
          id: msg.from ?? '',
          displayName: msg.imdisplayname ?? 'Unknown',
        },
        content: stripHtml(msg.content) ?? '',
        timestamp: msg.composetime ?? msg.originalarrivaltime ?? '',
      }))
  }

  async sendChatMessage(chatId: string, content: string): Promise<TeamsMessage> {
    interface SendResponse {
      OriginalArrivalTime?: number
    }
    const encodedChatId = encodeURIComponent(chatId)
    const response = await this.request<SendResponse>('POST', `/users/ME/conversations/${encodedChatId}/messages`, {
      content: escapeHtml(content),
      messagetype: 'RichText/Html',
      contenttype: 'text',
    })

    const arrivalTime = response?.OriginalArrivalTime
    return {
      id: arrivalTime ? String(arrivalTime) : '',
      channel_id: chatId,
      author: { id: 'ME', displayName: 'Me' },
      content,
      timestamp: arrivalTime ? new Date(arrivalTime).toISOString() : new Date().toISOString(),
    }
  }

  async getTeam(teamId: string): Promise<TeamsTeam> {
    return this.request<TeamsTeam>('GET', `/csa/api/v1/teams/${teamId}`, undefined, CSA_API_BASE)
  }

  async listChannels(teamId: string): Promise<TeamsChannel[]> {
    return this.request<TeamsChannel[]>('GET', `/csa/api/v1/teams/${teamId}/channels`, undefined, CSA_API_BASE)
  }

  async getChannel(teamId: string, channelId: string): Promise<TeamsChannel> {
    return this.request<TeamsChannel>(
      'GET',
      `/csa/api/v1/teams/${teamId}/channels/${channelId}`,
      undefined,
      CSA_API_BASE,
    )
  }

  async sendMessage(teamId: string, channelId: string, content: string): Promise<TeamsMessage> {
    return this.request<TeamsMessage>(
      'POST',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages`,
      { content },
      CSA_API_BASE,
    )
  }

  async getMessages(teamId: string, channelId: string, limit: number = 50): Promise<TeamsMessage[]> {
    return this.request<TeamsMessage[]>(
      'GET',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages?limit=${limit}`,
      undefined,
      CSA_API_BASE,
    )
  }

  async getMessage(teamId: string, channelId: string, messageId: string): Promise<TeamsMessage> {
    return this.request<TeamsMessage>(
      'GET',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
      undefined,
      CSA_API_BASE,
    )
  }

  async deleteMessage(teamId: string, channelId: string, messageId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
      undefined,
      CSA_API_BASE,
    )
  }

  async addReaction(teamId: string, channelId: string, messageId: string, emoji: string): Promise<void> {
    return this.request<void>(
      'POST',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}/reactions`,
      { emoji },
      CSA_API_BASE,
    )
  }

  async removeReaction(teamId: string, channelId: string, messageId: string, emoji: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}/reactions/${emoji}`,
      undefined,
      CSA_API_BASE,
    )
  }

  async listUsers(teamId: string): Promise<TeamsUser[]> {
    return this.request<TeamsUser[]>('GET', `/csa/api/v1/teams/${teamId}/members`, undefined, CSA_API_BASE)
  }

  async getUser(userId: string): Promise<TeamsUser> {
    return this.request<TeamsUser>('GET', `/csa/api/v1/users/${userId}`, undefined, CSA_API_BASE)
  }

  async uploadFile(teamId: string, channelId: string, filePath: string): Promise<TeamsFile> {
    const fileBuffer = await readFile(filePath)
    const filename = basename(filePath) || 'file'

    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), filename)

    return this.requestFormData<TeamsFile>(
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/files`,
      formData,
      CSA_API_BASE,
    )
  }

  async listFiles(teamId: string, channelId: string): Promise<TeamsFile[]> {
    return this.request<TeamsFile[]>(
      'GET',
      `/csa/${this.region}/api/v2/teams/${teamId}/channels/${channelId}/files`,
      undefined,
      CSA_API_BASE,
    )
  }
}
