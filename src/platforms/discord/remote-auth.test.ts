import { afterEach, describe, expect, it } from 'bun:test'
import { constants as cryptoConstants, createHash, generateKeyPairSync, publicEncrypt } from 'node:crypto'
import { EventEmitter } from 'node:events'

import { DiscordError } from '@/platforms/discord/client'
import { __test, loginWithRemoteAuth } from '@/platforms/discord/remote-auth'

const USER = { id: '852892297661906993', username: 'alice', discriminator: '0', avatar: 'abc' }
const USER_PAYLOAD = `${USER.id}:${USER.discriminator}:${USER.avatar}:${USER.username}`
const TOKEN = 'mfa.AbCdEfGhIjKlMnOpQrStUvWxYz'

class FakeWebSocket extends EventEmitter {
  sent: Record<string, unknown>[] = []
  closed = false

  send(raw: string): void {
    this.sent.push(JSON.parse(raw))
  }

  close(): void {
    this.closed = true
  }

  emitMessage(payload: Record<string, unknown>): void {
    this.emit('message', Buffer.from(JSON.stringify(payload)))
  }

  lastOp(op: string): Record<string, unknown> | undefined {
    return [...this.sent].reverse().find((m) => m.op === op)
  }
}

function encryptForClient(encodedPublicKey: string, data: Buffer | string): string {
  const der = Buffer.from(encodedPublicKey, 'base64')
  const publicKey = __test.createPublicKey({ key: der, format: 'der', type: 'spki' })
  const encrypted = publicEncrypt(
    { key: publicKey, padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    typeof data === 'string' ? Buffer.from(data) : data,
  )
  return encrypted.toString('base64')
}

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('crypto helpers', () => {
  it('computes nonce proof as base64url(sha256(decrypted_nonce))', () => {
    // Given a keypair and a nonce encrypted to its public key
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const nonce = Buffer.from('the-nonce-bytes')
    const encoded = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    const encryptedNonce = encryptForClient(encoded, nonce)

    // When computing the proof
    const proof = __test.computeNonceProof(privateKey, encryptedNonce)

    // Then it matches the spec: hash first, then base64url without padding
    const expected = createHash('sha256').update(nonce).digest('base64url')
    expect(proof).toBe(expected)
  })

  it('parses the colon-delimited user payload', () => {
    expect(__test.parseUserPayload(USER_PAYLOAD)).toEqual({
      id: USER.id,
      discriminator: USER.discriminator,
      avatar: USER.avatar,
      username: USER.username,
    })
  })
})

describe('loginWithRemoteAuth', () => {
  it('completes the full handshake and returns the decrypted token', async () => {
    // Given a fake gateway that drives the protocol
    const ws = new FakeWebSocket()
    const qrUrls: string[] = []
    const pendingUsers: string[] = []

    globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? '{}') as { ticket?: string }
      expect(body.ticket).toBe('the-ticket')
      const initMsg = ws.lastOp('init') as { encoded_public_key: string }
      return new Response(JSON.stringify({ encrypted_token: encryptForClient(initMsg.encoded_public_key, TOKEN) }), {
        status: 200,
      })
    }) as typeof fetch

    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
      onQrUrl: (url) => {
        qrUrls.push(url)
      },
      onPendingLogin: (user) => {
        pendingUsers.push(user.username)
      },
    })

    // When the gateway walks through the protocol
    ws.emit('open')
    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250, timeout_ms: 142637 })

    const init = ws.lastOp('init') as { encoded_public_key: string }
    expect(init).toBeDefined()

    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: encryptForClient(init.encoded_public_key, 'nonce') })
    expect(ws.lastOp('nonce_proof')).toBeDefined()

    ws.emitMessage({ op: 'pending_remote_init', fingerprint: 'FINGERPRINT123' })
    ws.emitMessage({
      op: 'pending_ticket',
      encrypted_user_payload: encryptForClient(init.encoded_public_key, USER_PAYLOAD),
    })
    ws.emitMessage({ op: 'pending_login', ticket: 'the-ticket' })

    // Then the session resolves with the decrypted token and scanned user
    const session = await sessionPromise
    expect(session.token).toBe(TOKEN)
    expect(session.user.username).toBe('alice')
    expect(qrUrls).toEqual(['https://discord.com/ra/FINGERPRINT123'])
    expect(pendingUsers).toEqual(['alice'])
    expect(ws.closed).toBe(true)
  })

  it('rejects with a captcha error when the login endpoint demands one', async () => {
    // Given a gateway that reaches ticket exchange but the API returns a captcha challenge
    const ws = new FakeWebSocket()
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ captcha_sitekey: 'sitekey', captcha_key: ['captcha-required'] }), {
        status: 400,
      })) as typeof fetch

    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    const init = ws.lastOp('init') as { encoded_public_key: string }
    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: encryptForClient(init.encoded_public_key, 'n') })
    ws.emitMessage({ op: 'pending_remote_init', fingerprint: 'FP' })
    ws.emitMessage({ op: 'pending_login', ticket: 't' })

    // Then the promise rejects with a captcha-specific error code
    await expect(sessionPromise).rejects.toMatchObject({ code: 'remote_auth_captcha' })
  })

  it('rejects when the gateway times out (close code 4003)', async () => {
    // Given a gateway that closes with the timeout code before completion
    const ws = new FakeWebSocket()
    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    ws.emit('close', 4003)

    // Then it surfaces a timeout error
    await expect(sessionPromise).rejects.toBeInstanceOf(DiscordError)
    await expect(sessionPromise).rejects.toMatchObject({ code: 'remote_auth_timeout' })
  })

  it('does not reject on normal close (1000) while the ticket exchange is in flight', async () => {
    // Given a fetch that stays pending until we release it, so close(1000) lands mid-exchange
    const ws = new FakeWebSocket()
    let releaseFetch: (() => void) | undefined
    globalThis.fetch = (async () => {
      await new Promise<void>((resolve) => {
        releaseFetch = resolve
      })
      const init = ws.lastOp('init') as { encoded_public_key: string }
      return new Response(JSON.stringify({ encrypted_token: encryptForClient(init.encoded_public_key, TOKEN) }), {
        status: 200,
      })
    }) as typeof fetch

    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    const init = ws.lastOp('init') as { encoded_public_key: string }
    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: encryptForClient(init.encoded_public_key, 'n') })
    ws.emitMessage({ op: 'pending_login', ticket: 'the-ticket' })

    // When the gateway closes normally before the exchange resolves
    ws.emit('close', 1000)
    releaseFetch?.()

    // Then the login still succeeds with the token from the completed exchange
    const session = await sessionPromise
    expect(session.token).toBe(TOKEN)
  })

  it('rejects (does not crash) when an encrypted payload is malformed', async () => {
    // Given a nonce_proof whose ciphertext cannot be decrypted by the private key
    const ws = new FakeWebSocket()
    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    // When garbage arrives where ciphertext is expected
    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: 'not-valid-base64-ciphertext' })

    // Then the decrypt error is surfaced as a rejection instead of throwing out of the handler
    await expect(sessionPromise).rejects.toBeInstanceOf(Error)
  })

  it('resolves with a null user when pending_login arrives without pending_ticket', async () => {
    // Given the gateway skips pending_ticket and goes straight to pending_login
    const ws = new FakeWebSocket()
    globalThis.fetch = (async () => {
      const init = ws.lastOp('init') as { encoded_public_key: string }
      return new Response(JSON.stringify({ encrypted_token: encryptForClient(init.encoded_public_key, TOKEN) }), {
        status: 200,
      })
    }) as typeof fetch

    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    const init = ws.lastOp('init') as { encoded_public_key: string }
    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: encryptForClient(init.encoded_public_key, 'n') })
    ws.emitMessage({ op: 'pending_login', ticket: 'the-ticket' })

    // Then the token is returned but user is null rather than a fabricated blank user
    const session = await sessionPromise
    expect(session.token).toBe(TOKEN)
    expect(session.user).toBeNull()
  })

  it('exchanges the ticket only once even if pending_login is delivered twice', async () => {
    // Given a duplicate pending_login from the gateway
    const ws = new FakeWebSocket()
    let fetchCalls = 0
    globalThis.fetch = (async () => {
      fetchCalls++
      const init = ws.lastOp('init') as { encoded_public_key: string }
      return new Response(JSON.stringify({ encrypted_token: encryptForClient(init.encoded_public_key, TOKEN) }), {
        status: 200,
      })
    }) as typeof fetch

    const sessionPromise = loginWithRemoteAuth({
      createWebSocket: () => ws as unknown as import('ws').WebSocket,
    })

    ws.emitMessage({ op: 'hello', heartbeat_interval: 41250 })
    const init = ws.lastOp('init') as { encoded_public_key: string }
    ws.emitMessage({ op: 'nonce_proof', encrypted_nonce: encryptForClient(init.encoded_public_key, 'n') })
    ws.emitMessage({ op: 'pending_login', ticket: 't' })
    ws.emitMessage({ op: 'pending_login', ticket: 't' })

    // Then only a single token exchange is performed
    await sessionPromise
    expect(fetchCalls).toBe(1)
  })
})
