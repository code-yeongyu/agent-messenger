import { afterEach, describe, expect, mock, it } from 'bun:test'

import { TeamsListener } from '@/platforms/teams/listener'
import type { TeamsRealtimeMessage } from '@/platforms/teams/types'

type WsHandler = (...args: any[]) => void

let mockWsInstance: MockWs

class MockWs {
  static OPEN = 1
  static CLOSED = 3
  readyState = MockWs.OPEN

  private handlers = new Map<string, WsHandler[]>()
  sent: string[] = []

  constructor(_url: string, _options?: any) {
    // oxlint-disable-next-line typescript-eslint/no-this-alias
    mockWsInstance = this
  }

  on(event: string, handler: WsHandler) {
    const list = this.handlers.get(event) ?? []
    list.push(handler)
    this.handlers.set(event, list)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWs.CLOSED
  }

  emit(event: string, ...args: any[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args)
    }
  }

  simulateFrame(frame: string) {
    this.emit('message', Buffer.from(frame))
  }
}

mock.module('ws', () => ({ default: MockWs, __esModule: true }))

const actualTrouter = await import('@/platforms/teams/trouter')
mock.module('@/platforms/teams/trouter', () => ({
  ...actualTrouter,
  fetchTrouterInfo: mock(() => Promise.resolve({ socketio: 'wss://fake/', surl: 'https://fake/', connectparams: {} })),
  fetchTrouterSessionId: mock(() => Promise.resolve('SESSION')),
  registerEndpoint: mock(() => Promise.resolve()),
}))

function messageFrame(resource: Record<string, unknown>): string {
  const body = JSON.stringify({ resourceType: 'NewMessage', resource })
  return `3:::${JSON.stringify({ id: 1, url: '/v4/f/HASH/messaging', body })}`
}

function conversationLink(conversationId: string): string {
  return `https://notifications.skype.net/v1/users/ME/conversations/${conversationId}`
}

function createMockClient(channelTeamMap: Map<string, string> = new Map()) {
  return {
    getToken: mock(() => 'skype-token'),
    getIdToken: mock(() => Promise.resolve('id-token')),
    getAccountType: mock(() => 'work'),
    buildChannelTeamMap: mock(() => Promise.resolve(channelTeamMap)),
  } as any
}

async function startAndCapture(
  client: ReturnType<typeof createMockClient>,
): Promise<{ listener: TeamsListener; messages: TeamsRealtimeMessage[] }> {
  const listener = new TeamsListener(client)
  const messages: TeamsRealtimeMessage[] = []
  listener.on('message', (message) => messages.push(message))
  await listener.start()
  return { listener, messages }
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('TeamsListener.emitMessage', () => {
  let listener: TeamsListener

  afterEach(() => {
    listener?.stop()
  })

  it('classifies a 1:1 chat and carries no team/channel context', async () => {
    const client = createMockClient()
    const started = await startAndCapture(client)
    listener = started.listener

    mockWsInstance.simulateFrame(
      messageFrame({
        id: 'm1',
        messagetype: 'RichText/Html',
        content: 'hello there',
        from: 'https://x/contacts/8:orgid:alice',
        imdisplayname: 'Alice',
        conversationLink: conversationLink('19:uni01_abc@unq.gbl.spaces'),
      }),
    )
    await flushMicrotasks()

    expect(started.messages).toHaveLength(1)
    const message = started.messages[0]
    expect(message.chatId).toBe('19:uni01_abc@unq.gbl.spaces')
    expect(message.conversationType).toBe('chat')
    expect(message.teamId).toBeUndefined()
    expect(message.channelId).toBeUndefined()
    expect(message.content).toBe('hello there')
    expect(message.mentions).toEqual([])
    expect(message.author).toEqual({ id: '8:orgid:alice', displayName: 'Alice' })
  })

  it('classifies a group chat thread with no groupId as a chat', async () => {
    const client = createMockClient()
    const started = await startAndCapture(client)
    listener = started.listener

    mockWsInstance.simulateFrame(
      messageFrame({
        id: 'm2',
        messagetype: 'RichText/Html',
        content: 'group hi',
        from: 'https://x/contacts/8:orgid:bob',
        imdisplayname: 'Bob',
        conversationLink: conversationLink('19:group_xyz@thread.tacv2'),
      }),
    )
    await flushMicrotasks()

    expect(started.messages).toHaveLength(1)
    const message = started.messages[0]
    expect(message.chatId).toBe('19:group_xyz@thread.tacv2')
    expect(message.conversationType).toBe('chat')
    expect(message.teamId).toBeUndefined()
    expect(message.channelId).toBeUndefined()
  })

  it('does not refresh the channel map for every group-chat message', async () => {
    const client = createMockClient()
    const started = await startAndCapture(client)
    listener = started.listener

    for (const id of ['g1', 'g2', 'g3']) {
      mockWsInstance.simulateFrame(
        messageFrame({
          id,
          messagetype: 'RichText/Html',
          content: 'group hi',
          from: 'https://x/contacts/8:orgid:bob',
          imdisplayname: 'Bob',
          conversationLink: conversationLink('19:group_xyz@thread.tacv2'),
        }),
      )
      await flushMicrotasks()
    }

    expect(started.messages).toHaveLength(3)
    // One build at start() + one refresh on the first miss; the negative cache
    // prevents a fetch on the 2nd and 3rd messages.
    expect(client.buildChannelTeamMap).toHaveBeenCalledTimes(2)
  })

  it('classifies a team channel message and resolves teamId plus mentions', async () => {
    const channelId = '19:channel_abc@thread.tacv2'
    const client = createMockClient(new Map([[channelId, 'team-group-id']]))
    const started = await startAndCapture(client)
    listener = started.listener

    mockWsInstance.simulateFrame(
      messageFrame({
        id: 'm3',
        messagetype: 'RichText/Html',
        content: '<span itemtype="http://schema.skype.com/Mention" itemscope itemid="0">Alice</span> please review',
        from: 'https://x/contacts/8:orgid:bob',
        imdisplayname: 'Bob',
        conversationLink: conversationLink(channelId),
        properties: {
          mentions: [{ itemid: '0', mri: '8:orgid:alice', mentionType: 'person', displayName: 'Alice' }],
        },
      }),
    )
    await flushMicrotasks()

    expect(started.messages).toHaveLength(1)
    const message = started.messages[0]
    expect(message.conversationType).toBe('channel')
    expect(message.teamId).toBe('team-group-id')
    expect(message.channelId).toBe(channelId)
    expect(message.content).toBe('Alice please review')
    expect(message.mentions).toEqual([{ id: '0', mri: '8:orgid:alice', displayName: 'Alice' }])
  })

  it('does not re-emit a message with a duplicate id', async () => {
    const client = createMockClient()
    const started = await startAndCapture(client)
    listener = started.listener

    const frame = messageFrame({
      id: 'dup',
      messagetype: 'Text',
      content: 'once',
      from: 'https://x/contacts/8:orgid:alice',
      imdisplayname: 'Alice',
      conversationLink: conversationLink('19:uni01_abc@unq.gbl.spaces'),
    })
    mockWsInstance.simulateFrame(frame)
    await flushMicrotasks()
    mockWsInstance.simulateFrame(frame)
    await flushMicrotasks()

    expect(started.messages).toHaveLength(1)
  })

  it('ignores non-text message types', async () => {
    const client = createMockClient()
    const started = await startAndCapture(client)
    listener = started.listener

    mockWsInstance.simulateFrame(
      messageFrame({
        id: 'sys',
        messagetype: 'ThreadActivity/AddMember',
        content: '',
        conversationLink: conversationLink('19:uni01_abc@unq.gbl.spaces'),
      }),
    )
    await flushMicrotasks()

    expect(started.messages).toHaveLength(0)
  })
})
