import { WebClient } from '@slack/web-api'
import type { SlackChannel, SlackFile, SlackMessage, SlackSearchResult, SlackUser } from '../types'

export class SlackError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'SlackError'
    this.code = code
  }
}

const MAX_RETRIES = 3
const RATE_LIMIT_ERROR_CODE = 'slack_webapi_rate_limited_error'

export class SlackClient {
  private client: WebClient

  constructor(token: string, cookie: string) {
    if (!token) {
      throw new SlackError('Token is required', 'missing_token')
    }
    if (!cookie) {
      throw new SlackError('Cookie is required', 'missing_cookie')
    }

    this.client = new WebClient(token, {
      headers: { Cookie: `d=${cookie}` },
    })
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        if (error.code === RATE_LIMIT_ERROR_CODE && attempt < MAX_RETRIES) {
          const retryAfter = error.retryAfter || 1
          await this.sleep(retryAfter * 1000 * (attempt + 1))
          continue
        }
        break
      }
    }
    throw new SlackError(
      lastError?.message || 'Unknown error',
      (lastError as any)?.code || 'unknown_error'
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private checkResponse(response: { ok?: boolean; error?: string }): void {
    if (!response.ok) {
      throw new SlackError(response.error || 'API call failed', response.error || 'api_error')
    }
  }

  async testAuth(): Promise<{ user_id: string; team_id: string; user?: string; team?: string }> {
    return this.withRetry(async () => {
      const response = await this.client.auth.test()
      this.checkResponse(response)
      return {
        user_id: response.user_id!,
        team_id: response.team_id!,
        user: response.user,
        team: response.team,
      }
    })
  }

  async listChannels(): Promise<SlackChannel[]> {
    return this.withRetry(async () => {
      const channels: SlackChannel[] = []
      let cursor: string | undefined

      do {
        const response = await this.client.conversations.list({
          cursor,
          limit: 200,
          types: 'public_channel,private_channel',
        })
        this.checkResponse(response)

        if (response.channels) {
          for (const ch of response.channels) {
            channels.push({
              id: ch.id!,
              name: ch.name!,
              is_private: ch.is_private || false,
              is_archived: ch.is_archived || false,
              created: ch.created || 0,
              creator: ch.creator || '',
              topic: ch.topic
                ? {
                    value: ch.topic.value || '',
                    creator: ch.topic.creator || '',
                    last_set: ch.topic.last_set || 0,
                  }
                : undefined,
              purpose: ch.purpose
                ? {
                    value: ch.purpose.value || '',
                    creator: ch.purpose.creator || '',
                    last_set: ch.purpose.last_set || 0,
                  }
                : undefined,
            })
          }
        }

        cursor = response.response_metadata?.next_cursor
      } while (cursor)

      return channels
    })
  }

  async getChannel(id: string): Promise<SlackChannel> {
    return this.withRetry(async () => {
      const response = await this.client.conversations.info({ channel: id })
      this.checkResponse(response)

      const ch = response.channel!
      return {
        id: ch.id!,
        name: ch.name!,
        is_private: ch.is_private || false,
        is_archived: ch.is_archived || false,
        created: ch.created || 0,
        creator: ch.creator || '',
        topic: ch.topic
          ? {
              value: ch.topic.value || '',
              creator: ch.topic.creator || '',
              last_set: ch.topic.last_set || 0,
            }
          : undefined,
        purpose: ch.purpose
          ? {
              value: ch.purpose.value || '',
              creator: ch.purpose.creator || '',
              last_set: ch.purpose.last_set || 0,
            }
          : undefined,
      }
    })
  }

  async sendMessage(channel: string, text: string, threadTs?: string): Promise<SlackMessage> {
    return this.withRetry(async () => {
      const response = await this.client.chat.postMessage({
        channel,
        text,
        thread_ts: threadTs,
      })
      this.checkResponse(response)

      const msg = response.message!
      return {
        ts: response.ts!,
        text: msg.text || text,
        type: msg.type || 'message',
        user: msg.user,
        thread_ts: msg.thread_ts,
      }
    })
  }

  async getMessages(channel: string, limit = 20): Promise<SlackMessage[]> {
    return this.withRetry(async () => {
      const response = await this.client.conversations.history({
        channel,
        limit,
      })
      this.checkResponse(response)

      return (response.messages || []).map((msg) => ({
        ts: msg.ts!,
        text: msg.text || '',
        type: msg.type || 'message',
        user: msg.user,
        username: msg.username,
        thread_ts: msg.thread_ts,
        reply_count: msg.reply_count,
        replies: (msg as any).replies,
        edited: msg.edited
          ? {
              user: msg.edited.user || '',
              ts: msg.edited.ts || '',
            }
          : undefined,
      }))
    })
  }

  async updateMessage(channel: string, ts: string, text: string): Promise<SlackMessage> {
    return this.withRetry(async () => {
      const response = await this.client.chat.update({
        channel,
        ts,
        text,
      })
      this.checkResponse(response)

      const msg = response.message!
      return {
        ts: response.ts!,
        text: msg.text || text,
        type: 'message',
        user: msg.user,
      }
    })
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    return this.withRetry(async () => {
      const response = await this.client.chat.delete({
        channel,
        ts,
      })
      this.checkResponse(response)
    })
  }

  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    return this.withRetry(async () => {
      const response = await this.client.reactions.add({
        channel,
        timestamp: ts,
        name: emoji,
      })
      this.checkResponse(response)
    })
  }

  async removeReaction(channel: string, ts: string, emoji: string): Promise<void> {
    return this.withRetry(async () => {
      const response = await this.client.reactions.remove({
        channel,
        timestamp: ts,
        name: emoji,
      })
      this.checkResponse(response)
    })
  }

  async listUsers(): Promise<SlackUser[]> {
    return this.withRetry(async () => {
      const users: SlackUser[] = []
      let cursor: string | undefined

      do {
        const response = await this.client.users.list({
          cursor,
          limit: 200,
        })
        this.checkResponse(response)

        if (response.members) {
          for (const member of response.members) {
            users.push({
              id: member.id!,
              name: member.name!,
              real_name: member.real_name || member.name || '',
              is_admin: member.is_admin || false,
              is_owner: member.is_owner || false,
              is_bot: member.is_bot || false,
              is_app_user: member.is_app_user || false,
              profile: member.profile
                ? {
                    email: member.profile.email,
                    phone: member.profile.phone,
                    title: member.profile.title,
                    status_text: member.profile.status_text,
                  }
                : undefined,
            })
          }
        }

        cursor = response.response_metadata?.next_cursor
      } while (cursor)

      return users
    })
  }

  async getUser(id: string): Promise<SlackUser> {
    return this.withRetry(async () => {
      const response = await this.client.users.info({ user: id })
      this.checkResponse(response)

      const member = response.user!
      return {
        id: member.id!,
        name: member.name!,
        real_name: member.real_name || member.name || '',
        is_admin: member.is_admin || false,
        is_owner: member.is_owner || false,
        is_bot: member.is_bot || false,
        is_app_user: member.is_app_user || false,
        profile: member.profile
          ? {
              email: member.profile.email,
              phone: member.profile.phone,
              title: member.profile.title,
              status_text: member.profile.status_text,
            }
          : undefined,
      }
    })
  }

  async uploadFile(channels: string[], file: Buffer, filename: string): Promise<SlackFile> {
    return this.withRetry(async () => {
      const response = await this.client.files.uploadV2({
        channel_id: channels[0],
        file,
        filename,
      })
      this.checkResponse(response)

      const f = response.file as any
      return {
        id: f.id!,
        name: f.name!,
        title: f.title || f.name || '',
        mimetype: f.mimetype || 'application/octet-stream',
        size: f.size || 0,
        url_private: f.url_private || '',
        created: f.created || 0,
        user: f.user || '',
        channels: f.channels,
      }
    })
  }

  async listFiles(channel?: string): Promise<SlackFile[]> {
    return this.withRetry(async () => {
      const response = await this.client.files.list({
        channel,
      })
      this.checkResponse(response)

      return (response.files || []).map((f) => ({
        id: f.id!,
        name: f.name!,
        title: f.title || f.name || '',
        mimetype: f.mimetype || 'application/octet-stream',
        size: f.size || 0,
        url_private: f.url_private || '',
        created: f.created || 0,
        user: f.user || '',
        channels: f.channels,
      }))
    })
  }

  async searchMessages(
    query: string,
    options: { sort?: 'score' | 'timestamp'; sortDir?: 'asc' | 'desc'; count?: number } = {}
  ): Promise<SlackSearchResult[]> {
    return this.withRetry(async () => {
      const response = await this.client.search.messages({
        query,
        sort: options.sort || 'timestamp',
        sort_dir: options.sortDir || 'desc',
        count: options.count || 20,
      })
      this.checkResponse(response)

      const matches = (response.messages as any)?.matches || []
      return matches.map((match: any) => ({
        ts: match.ts,
        text: match.text || '',
        user: match.user,
        username: match.username,
        channel: {
          id: match.channel?.id || '',
          name: match.channel?.name || '',
        },
        permalink: match.permalink || '',
      }))
    })
  }
}
