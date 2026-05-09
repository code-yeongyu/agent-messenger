import { afterEach, beforeEach, describe, expect, mock, it } from 'bun:test'

import { KakaoTalkClient } from './client'
import { KakaoTalkListener } from './listener'
import type { LocoPacket } from './protocol/types'
import type { KakaoTalkPushMessageEvent } from './types'

const sessions: MockLocoSession[] = []
const loginCalls: Array<{
  oauthToken: string
  userId: string
  deviceUuid: string
  syncState: unknown
  deviceType: string
}> = []

class MockLocoSession {
  pushHandler: ((packet: LocoPacket) => void) | null = null
  closeHandler: (() => void) | null = null
  closed = false
  loginResult: Record<string, unknown> = {
    chatDatas: [],
    lastTokenId: { low: 0, high: 0 },
    lastChatId: { low: 0, high: 0 },
    eof: true,
  }

  loginImpl: (
    oauthToken: string,
    userId: string,
    deviceUuid: string,
    syncState: unknown,
    deviceType: string,
  ) => Promise<unknown> = async (oauthToken, userId, deviceUuid, syncState, deviceType) => {
    loginCalls.push({ oauthToken, userId, deviceUuid, syncState, deviceType })
    return this.loginResult
  }

  sendMessageImpl: (chatId: unknown, text: string) => Promise<unknown> = async () => ({
    statusCode: 0,
    body: { logId: { low: 1, high: 0 }, sendAt: 1 },
  })

  getChatLogsImpl: () => Promise<unknown> = async () => ({
    body: { status: 0, chatLogs: [], eof: true },
  })

  constructor() {
    sessions.push(this)
  }

  login(
    oauthToken: string,
    userId: string,
    deviceUuid: string,
    syncState: unknown,
    deviceType: string,
  ): Promise<unknown> {
    return this.loginImpl(oauthToken, userId, deviceUuid, syncState, deviceType)
  }

  sendMessage(chatId: unknown, text: string): Promise<unknown> {
    return this.sendMessageImpl(chatId, text)
  }

  getChatLogs(): Promise<unknown> {
    return this.getChatLogsImpl()
  }

  getChatList(): Promise<unknown> {
    return Promise.resolve({ body: { chatDatas: [], lastTokenId: { low: 0, high: 0 }, eof: true } })
  }

  getChatInfo(): Promise<unknown> {
    return Promise.resolve({ body: { l: { low: 0, high: 0 } } })
  }

  syncMessages(): Promise<unknown> {
    return Promise.resolve({ body: { chatLogs: [], isOK: true } })
  }

  onPush(handler: (packet: LocoPacket) => void): void {
    this.pushHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.closeHandler?.()
  }

  simulatePush(method: string, body: Record<string, unknown> = {}): void {
    this.pushHandler?.({ packetId: 0, statusCode: 0, method, bodyType: 0, body })
  }

  simulateRemoteClose(): void {
    if (this.closed) return
    this.closed = true
    this.closeHandler?.()
  }
}

mock.module('./protocol/session', () => ({ LocoSession: MockLocoSession }))

const CREDS = {
  oauthToken: 'tok',
  userId: 'user1',
  deviceUuid: 'device-uuid-1',
  deviceType: 'tablet' as const,
}

function currentSession(): MockLocoSession {
  return sessions[sessions.length - 1]!
}

describe('KakaoTalkClient + KakaoTalkListener integration (shared LOCO session)', () => {
  beforeEach(() => {
    sessions.length = 0
    loginCalls.length = 0
  })

  afterEach(() => {
    sessions.length = 0
    loginCalls.length = 0
  })

  it('opens exactly ONE LocoSession when a client and listener are used together', async () => {
    // given — a client logged in and a listener attached
    const client = await new KakaoTalkClient().login(CREDS)
    const listener = new KakaoTalkListener(client)

    // when — listener starts AND client makes API calls
    await listener.start()
    await client.sendMessage('100', 'hi')
    await client.getChats()

    // then — only one LocoSession was constructed; only one LOGINLIST sent
    expect(sessions.length).toBe(1)
    expect(loginCalls.length).toBe(1)
    expect(loginCalls[0].deviceUuid).toBe(CREDS.deviceUuid)

    listener.stop()
    client.close()
  })

  it('never sends a duplicate LOGINLIST with the same duuid while a session is alive', async () => {
    // given — a strict guard: any second login while the first session is still open is a self-KICKOUT.
    const client = await new KakaoTalkClient().login(CREDS)
    const listener = new KakaoTalkListener(client)
    await listener.start()

    // when — heavy interleaving of outbound calls and inbound pushes
    for (let i = 0; i < 10; i++) {
      await client.sendMessage(String(100 + i), `msg-${i}`)
      currentSession().simulatePush('MSG', {
        chatId: { low: 100 + i, high: 0 },
        chatLog: { logId: { low: i, high: 0 }, authorId: 1, message: `pushed-${i}`, type: 1, sendAt: i },
      })
    }

    // then — still exactly one LOGINLIST, never a second one against the live session
    const liveSessions = sessions.filter((s) => !s.closed)
    expect(liveSessions.length).toBe(1)
    expect(loginCalls.length).toBe(1)

    listener.stop()
    client.close()
  })

  it('listener still receives push events when only the listener is used (no API calls)', async () => {
    const client = await new KakaoTalkClient().login(CREDS)
    const listener = new KakaoTalkListener(client)

    const messages: KakaoTalkPushMessageEvent[] = []
    listener.on('message', (event) => messages.push(event))

    await listener.start()
    expect(sessions.length).toBe(1)

    currentSession().simulatePush('MSG', {
      chatId: { low: 100, high: 0 },
      chatLog: {
        logId: { low: 1, high: 0 },
        authorId: 42,
        message: 'hello',
        type: 1,
        sendAt: 1700000000,
      },
    })

    expect(messages.length).toBe(1)
    expect(messages[0].chat_id).toBe('100')
    expect(messages[0].message).toBe('hello')

    listener.stop()
    client.close()
  })

  it('client-only usage still works (no listener)', async () => {
    const client = await new KakaoTalkClient().login(CREDS)
    const result = await client.sendMessage('100', 'hi')

    expect(result.success).toBe(true)
    expect(sessions.length).toBe(1)

    client.close()
  })

  it('real KICKOUT propagates to listener and closes the session', async () => {
    // given — client + listener sharing a session
    const client = await new KakaoTalkClient().login(CREDS)
    const listener = new KakaoTalkListener(client)

    const errors: Error[] = []
    listener.on('error', (err) => errors.push(err))

    await listener.start()
    expect(sessions.length).toBe(1)
    const sharedSession = currentSession()

    // when — server pushes a KICKOUT (a different real device logged in)
    sharedSession.simulatePush('KICKOUT', {})

    // then — listener emits the canonical error and stops itself
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain('kicked')
    expect((listener as unknown as { running: boolean }).running).toBe(false)

    listener.stop()
    client.close()
  })

  it('reconnect after a TCP-level disconnect produces ONE replacement session shared by both halves', async () => {
    // given — listener + client on a shared session
    const client = await new KakaoTalkClient().login(CREDS)
    const listener = new KakaoTalkListener(client)

    const disconnects: number[] = []
    const connects: Array<{ userId: string }> = []
    listener.on('disconnected', () => disconnects.push(Date.now()))
    listener.on('connected', (info) => connects.push(info))

    await listener.start()
    expect(sessions.length).toBe(1)
    expect(connects.length).toBe(1)

    // when — the underlying socket dies (not a KICKOUT)
    currentSession().simulateRemoteClose()

    // then — listener observed the disconnect
    expect(disconnects.length).toBe(1)

    // and — the next API call transparently opens exactly ONE replacement session
    await client.sendMessage('100', 'after-reconnect')

    expect(sessions.length).toBe(2)
    // and — the listener was re-attached to that replacement session (i.e. push fan-out works again)
    const messages: KakaoTalkPushMessageEvent[] = []
    listener.on('message', (event) => messages.push(event))
    currentSession().simulatePush('MSG', {
      chatId: { low: 100, high: 0 },
      chatLog: { logId: { low: 9, high: 0 }, authorId: 1, message: 'after-reconnect-push', type: 1, sendAt: 1 },
    })
    expect(messages.length).toBe(1)
    expect(connects.length).toBe(2)

    listener.stop()
    client.close()
  })
})
