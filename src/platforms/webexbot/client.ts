import { WebexClient } from '../webex/client'
import type { WebexMembership, WebexMessage, WebexPerson, WebexSpace } from '../webex/types'
import { WebexBotError } from './types'

export class WebexBotClient {
  private client = new WebexClient()
  private token: string | null = null

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
    return this.client.getSpace(spaceId)
  }

  async sendMessage(roomId: string, text: string, options?: { markdown?: boolean }): Promise<WebexMessage> {
    return this.client.sendMessage(roomId, text, options)
  }

  async sendDirectMessage(personEmail: string, text: string, options?: { markdown?: boolean }): Promise<WebexMessage> {
    return this.client.sendDirectMessage(personEmail, text, options)
  }

  async listMessages(roomId: string, options?: { max?: number }): Promise<WebexMessage[]> {
    const space = await this.client.getSpace(roomId)
    const messageOptions = space.type === 'group' ? { ...options, mentionedPeople: 'me' } : options
    return this.client.listMessages(roomId, messageOptions)
  }

  async getMessage(messageId: string): Promise<WebexMessage> {
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
    return this.client.editMessage(messageId, roomId, text, options)
  }

  async listPeople(options?: { email?: string; displayName?: string; max?: number }): Promise<WebexPerson[]> {
    return this.client.listPeople(options)
  }

  async listMyMemberships(options?: { max?: number }): Promise<WebexMembership[]> {
    return this.client.listMyMemberships(options)
  }

  async listMemberships(roomId: string, options?: { max?: number }): Promise<WebexMembership[]> {
    return this.client.listMemberships(roomId, options)
  }
}
