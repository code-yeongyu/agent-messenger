import type { SlackChannel, SlackFile, SlackMessage, SlackUser } from '../types'

export class SlackClient {
  async listChannels(): Promise<SlackChannel[]> {
    throw new Error('Not implemented')
  }

  async getChannel(id: string): Promise<SlackChannel> {
    throw new Error('Not implemented')
  }

  async sendMessage(channel: string, text: string, threadTs?: string): Promise<SlackMessage> {
    throw new Error('Not implemented')
  }

  async getMessages(channel: string, limit?: number): Promise<SlackMessage[]> {
    throw new Error('Not implemented')
  }

  async updateMessage(channel: string, ts: string, text: string): Promise<SlackMessage> {
    throw new Error('Not implemented')
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async removeReaction(channel: string, ts: string, emoji: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async listUsers(): Promise<SlackUser[]> {
    throw new Error('Not implemented')
  }

  async getUser(id: string): Promise<SlackUser> {
    throw new Error('Not implemented')
  }

  async uploadFile(channels: string[], file: Buffer, filename: string): Promise<SlackFile> {
    throw new Error('Not implemented')
  }

  async listFiles(channel?: string): Promise<SlackFile[]> {
    throw new Error('Not implemented')
  }
}
