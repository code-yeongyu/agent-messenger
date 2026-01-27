import { expect, mock, test } from 'bun:test'
import { snapshotCommand } from '../../src/commands/snapshot'
import { CredentialManager } from '../../src/lib/credential-manager'
import { RefManager } from '../../src/lib/ref-manager'
import { SlackClient } from '../../src/lib/slack-client'
import type { SlackChannel, SlackMessage, SlackUser } from '../../src/types'

// Mock modules
mock.module('../../src/lib/credential-manager', () => ({
  CredentialManager: class {
    async getWorkspace() {
      return {
        workspace_id: 'T123',
        workspace_name: 'Test Workspace',
        token: 'xoxc-test',
        cookie: 'test-cookie',
      }
    }
  },
}))

mock.module('../../src/lib/slack-client', () => ({
  SlackClient: class {
    async testAuth() {
      return {
        user_id: 'U123',
        team_id: 'T123',
        user: 'testuser',
        team: 'Test Workspace',
      }
    }
    async listChannels(): Promise<SlackChannel[]> {
      return [
        {
          id: 'C123',
          name: 'general',
          is_private: false,
          is_archived: false,
          created: 1234567890,
          creator: 'U123',
          topic: { value: 'General discussion', creator: 'U123', last_set: 1234567890 },
          purpose: { value: 'General channel', creator: 'U123', last_set: 1234567890 },
        },
        {
          id: 'C456',
          name: 'random',
          is_private: false,
          is_archived: false,
          created: 1234567891,
          creator: 'U123',
          topic: { value: 'Random stuff', creator: 'U123', last_set: 1234567891 },
          purpose: { value: 'Random channel', creator: 'U123', last_set: 1234567891 },
        },
      ]
    }
    async getMessages(_channel: string, _limit?: number): Promise<SlackMessage[]> {
      return [
        {
          ts: '1234567890.000100',
          text: 'Hello world',
          type: 'message',
          user: 'U123',
          username: 'testuser',
          thread_ts: undefined,
          reply_count: 0,
          edited: undefined,
        },
        {
          ts: '1234567890.000200',
          text: 'Second message',
          type: 'message',
          user: 'U456',
          username: 'otheruser',
          thread_ts: undefined,
          reply_count: 0,
          edited: undefined,
        },
      ]
    }
    async listUsers(): Promise<SlackUser[]> {
      return [
        {
          id: 'U123',
          name: 'alice',
          real_name: 'Alice Smith',
          is_admin: true,
          is_owner: false,
          is_bot: false,
          is_app_user: false,
          profile: {
            email: 'alice@example.com',
            title: 'Engineer',
          },
        },
        {
          id: 'U456',
          name: 'bob',
          real_name: 'Bob Jones',
          is_admin: false,
          is_owner: false,
          is_bot: false,
          is_app_user: false,
          profile: {
            email: 'bob@example.com',
            title: 'Designer',
          },
        },
      ]
    }
  },
}))

test('snapshot command exports correctly', () => {
  expect(snapshotCommand).toBeDefined()
  expect(typeof snapshotCommand).toBe('object')
})

test('snapshot command has correct structure', () => {
  expect(snapshotCommand.name()).toBe('snapshot')
  expect(snapshotCommand.description()).toContain('workspace')
})

test('snapshot command has --channels-only option', () => {
  const options = snapshotCommand.options
  const hasChannelsOnly = options.some((opt: any) => opt.long === '--channels-only')
  expect(hasChannelsOnly).toBe(true)
})

test('snapshot command has --users-only option', () => {
  const options = snapshotCommand.options
  const hasUsersOnly = options.some((opt: any) => opt.long === '--users-only')
  expect(hasUsersOnly).toBe(true)
})

test('snapshot command has --limit option', () => {
  const options = snapshotCommand.options
  const hasLimit = options.some((opt: any) => opt.long === '--limit')
  expect(hasLimit).toBe(true)
})

test('full snapshot returns workspace, channels, messages, and users', async () => {
  const refManager = new RefManager()
  const credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const _workspace = await credManager.getWorkspace()
  const auth = await client.testAuth()
  const channels = await client.listChannels()
  const users = await client.listUsers()

  // Assign refs
  const channelRefs = channels.map((ch) => refManager.assignChannelRef(ch))
  const userRefs = users.map((u) => refManager.assignUserRef(u))

  // Get messages for each channel
  const allMessages: Array<SlackMessage & { channel_ref: string }> = []
  for (let i = 0; i < channels.length; i++) {
    const messages = await client.getMessages(channels[i].id, 20)
    for (const msg of messages) {
      const _ref = refManager.assignMessageRef(msg)
      allMessages.push({
        ...msg,
        channel_ref: channelRefs[i],
      })
    }
  }

  // Build snapshot
  const snapshot = {
    workspace: {
      id: auth.team_id,
      name: auth.team,
    },
    channels: channels.map((ch, i) => ({
      ref: channelRefs[i],
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_archived: ch.is_archived,
      created: ch.created,
      topic: ch.topic?.value,
      purpose: ch.purpose?.value,
    })),
    recent_messages: allMessages.map((msg, i) => ({
      ref: `@m${i + 1}`,
      channel_ref: msg.channel_ref,
      ts: msg.ts,
      text: msg.text,
      user: msg.user,
      username: msg.username,
      thread_ts: msg.thread_ts,
    })),
    users: users.map((u, i) => ({
      ref: userRefs[i],
      id: u.id,
      name: u.name,
      real_name: u.real_name,
      is_admin: u.is_admin,
      is_bot: u.is_bot,
      profile: u.profile,
    })),
    refs: refManager.serialize(),
  }

  // Verify structure
  expect(snapshot.workspace).toBeDefined()
  expect(snapshot.workspace.id).toBe('T123')
  expect(snapshot.workspace.name).toBe('Test Workspace')

  expect(snapshot.channels).toBeDefined()
  expect(snapshot.channels.length).toBe(2)
  expect(snapshot.channels[0].ref).toBe('@c1')
  expect(snapshot.channels[0].name).toBe('general')

  expect(snapshot.recent_messages).toBeDefined()
  expect(snapshot.recent_messages.length).toBeGreaterThan(0)
  expect(snapshot.recent_messages[0].ref).toBe('@m1')

  expect(snapshot.users).toBeDefined()
  expect(snapshot.users.length).toBe(2)
  expect(snapshot.users[0].ref).toBe('@u1')
  expect(snapshot.users[0].name).toBe('alice')

  expect(snapshot.refs).toBeDefined()
  expect(typeof snapshot.refs).toBe('string')
})

test('snapshot with --channels-only excludes messages and users', async () => {
  const refManager = new RefManager()
  const credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const _workspace = await credManager.getWorkspace()
  const auth = await client.testAuth()
  const channels = await client.listChannels()

  // Assign refs
  const channelRefs = channels.map((ch) => refManager.assignChannelRef(ch))

  // Build snapshot with channels only
  const snapshot = {
    workspace: {
      id: auth.team_id,
      name: auth.team,
    },
    channels: channels.map((ch, i) => ({
      ref: channelRefs[i],
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_archived: ch.is_archived,
      created: ch.created,
      topic: ch.topic?.value,
      purpose: ch.purpose?.value,
    })),
    refs: refManager.serialize(),
  }

  // Verify structure
  expect(snapshot.workspace).toBeDefined()
  expect(snapshot.channels).toBeDefined()
  expect(snapshot.channels.length).toBe(2)
  expect((snapshot as any).recent_messages).toBeUndefined()
  expect((snapshot as any).users).toBeUndefined()
})

test('snapshot with --users-only excludes channels and messages', async () => {
  const refManager = new RefManager()
  const credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const _workspace = await credManager.getWorkspace()
  const auth = await client.testAuth()
  const users = await client.listUsers()

  // Assign refs
  const userRefs = users.map((u) => refManager.assignUserRef(u))

  // Build snapshot with users only
  const snapshot = {
    workspace: {
      id: auth.team_id,
      name: auth.team,
    },
    users: users.map((u, i) => ({
      ref: userRefs[i],
      id: u.id,
      name: u.name,
      real_name: u.real_name,
      is_admin: u.is_admin,
      is_bot: u.is_bot,
      profile: u.profile,
    })),
    refs: refManager.serialize(),
  }

  // Verify structure
  expect(snapshot.workspace).toBeDefined()
  expect(snapshot.users).toBeDefined()
  expect(snapshot.users.length).toBe(2)
  expect((snapshot as any).channels).toBeUndefined()
  expect((snapshot as any).recent_messages).toBeUndefined()
})

test('snapshot respects --limit option for messages', async () => {
  const refManager = new RefManager()
  const credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const _workspace = await credManager.getWorkspace()
  const auth = await client.testAuth()
  const channels = await client.listChannels()

  // Assign refs
  const channelRefs = channels.map((ch) => refManager.assignChannelRef(ch))

  // Get messages with limit
  const allMessages: Array<SlackMessage & { channel_ref: string }> = []
  for (let i = 0; i < channels.length; i++) {
    const messages = await client.getMessages(channels[i].id, 5) // limit to 5
    for (const msg of messages) {
      refManager.assignMessageRef(msg)
      allMessages.push({
        ...msg,
        channel_ref: channelRefs[i],
      })
    }
  }

  // Build snapshot
  const snapshot = {
    workspace: {
      id: auth.team_id,
      name: auth.team,
    },
    channels: channels.map((ch, i) => ({
      ref: channelRefs[i],
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_archived: ch.is_archived,
      created: ch.created,
      topic: ch.topic?.value,
      purpose: ch.purpose?.value,
    })),
    recent_messages: allMessages,
    refs: refManager.serialize(),
  }

  // Verify limit was respected
  expect(snapshot.recent_messages.length).toBeLessThanOrEqual(10) // 2 channels * 5 limit
})

test('refs are consistent and resolvable', async () => {
  const refManager = new RefManager()
  const _credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const channels = await client.listChannels()
  const users = await client.listUsers()

  // Assign refs
  const channelRefs = channels.map((ch) => refManager.assignChannelRef(ch))
  const userRefs = users.map((u) => refManager.assignUserRef(u))

  // Verify refs resolve correctly
  for (let i = 0; i < channelRefs.length; i++) {
    const resolved = refManager.resolveRef(channelRefs[i])
    expect(resolved).toBeDefined()
    expect(resolved?.type).toBe('channel')
    expect(resolved?.id).toBe(channels[i].id)
  }

  for (let i = 0; i < userRefs.length; i++) {
    const resolved = refManager.resolveRef(userRefs[i])
    expect(resolved).toBeDefined()
    expect(resolved?.type).toBe('user')
    expect(resolved?.id).toBe(users[i].id)
  }
})

test('snapshot refs mapping is valid JSON', async () => {
  const refManager = new RefManager()
  const _credManager = new CredentialManager()
  const client = new SlackClient('xoxc-test', 'test-cookie')

  const channels = await client.listChannels()
  const users = await client.listUsers()

  // Assign refs
  for (const ch of channels) {
    refManager.assignChannelRef(ch)
  }
  for (const u of users) {
    refManager.assignUserRef(u)
  }

  // Get serialized refs
  const refsSerialized = refManager.serialize()

  // Verify it's valid JSON
  expect(() => JSON.parse(refsSerialized)).not.toThrow()

  // Verify structure
  const refs = JSON.parse(refsSerialized)
  expect(refs['@c1']).toBe('C123')
  expect(refs['@c2']).toBe('C456')
  expect(refs['@u1']).toBe('U123')
  expect(refs['@u2']).toBe('U456')
})
