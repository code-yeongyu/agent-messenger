import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { InstagramClient, parseOneClickLoginLink } from '@/platforms/instagram/client'
import { InstagramCredentialManager } from '@/platforms/instagram/credential-manager'
import { InstagramError, type InstagramSessionState } from '@/platforms/instagram/types'

const testDir = join(import.meta.dir, `.test-client-${Date.now()}`)
const sessionPath = join(testDir, 'session.json')

const SESSION: InstagramSessionState = {
  cookies: 'sessionid=abc123; ds_user_id=42',
  user_id: '42',
  device: {
    phone_id: '00000000-0000-0000-0000-000000000001',
    uuid: '00000000-0000-0000-0000-000000000002',
    android_device_id: 'android-deadbeef',
    advertising_id: '00000000-0000-0000-0000-000000000003',
    client_session_id: '00000000-0000-0000-0000-000000000004',
    device_string: '13.0/33; 480dpi; 1080x2340; samsung; SM-S911B; SM-S911B; qcom; en_US; 556927984',
  },
}

let rsaPublicKeyBase64: string
const originalConfigDir = process.env['AGENT_MESSENGER_CONFIG_DIR']

beforeAll(() => {
  mkdirSync(testDir, { recursive: true })
  writeFileSync(sessionPath, JSON.stringify(SESSION))
  // Sandbox default-manager writes (e.g. device.json) so tests never touch the real config dir.
  process.env['AGENT_MESSENGER_CONFIG_DIR'] = join(testDir, 'config')

  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 })
  const pem = publicKey.export({ type: 'pkcs1', format: 'pem' }) as string
  rsaPublicKeyBase64 = Buffer.from(pem).toString('base64')
})

afterAll(() => {
  if (originalConfigDir === undefined) delete process.env['AGENT_MESSENGER_CONFIG_DIR']
  else process.env['AGENT_MESSENGER_CONFIG_DIR'] = originalConfigDir
  rmSync(testDir, { recursive: true, force: true })
})

const originalFetch = globalThis.fetch
let fetchResponses: Response[] = []
let fetchCalls: Array<{ url: string; init?: RequestInit }> = []
let fetchIndex = 0

beforeEach(() => {
  fetchCalls = []
  fetchResponses = []
  fetchIndex = 0
  ;(globalThis as Record<string, unknown>).fetch = async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    fetchCalls.push({ url: String(url), init })
    const res = fetchResponses[fetchIndex++]
    if (!res) throw new Error('No mock response queued')
    return res
  }
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function urlParamsBody(callIndex = 0): Record<string, string> {
  const raw = fetchCalls[callIndex]?.init?.body
  if (!raw || typeof raw !== 'string') return {}
  return Object.fromEntries(new URLSearchParams(raw))
}

function signedBody(callIndex = 0): Record<string, string> {
  const raw = fetchCalls[callIndex]?.init?.body
  if (!raw || typeof raw !== 'string') return {}
  const signed = new URLSearchParams(raw).get('signed_body')
  if (!signed) return {}
  const json = signed.slice(signed.indexOf('.') + 1)
  return JSON.parse(json) as Record<string, string>
}

async function loadedClient(): Promise<InstagramClient> {
  const client = new InstagramClient()
  await client.loadSession(sessionPath)
  return client
}

describe('InstagramClient', () => {
  describe('constructor', () => {
    it('creates instance with default credential manager', () => {
      const client = new InstagramClient()
      expect(client).toBeInstanceOf(InstagramClient)
    })
  })

  describe('login', () => {
    it('throws when no account configured', async () => {
      const mockManager = {
        getAccount: () => Promise.resolve(null),
      } as any

      const client = new InstagramClient(mockManager)

      await expect(client.login()).rejects.toThrow(InstagramError)
      await expect(client.login()).rejects.toThrow('No Instagram credentials found')
    })

    it('loads session from disk when file exists', async () => {
      const mockManager = {
        getAccount: () =>
          Promise.resolve({ account_id: 'testuser', username: 'testuser', created_at: '', updated_at: '' }),
        ensureAccountPaths: () => Promise.resolve({ account_dir: testDir, session_path: sessionPath }),
      } as any

      const client = new InstagramClient(mockManager)

      await client.login()

      expect(client.getUserId()).toBe('42')
    })
  })

  function encryptionKeyResponse(): Response {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        'ig-set-password-encryption-pub-key': rsaPublicKeyBase64,
        'ig-set-password-encryption-key-id': '7',
      }),
    })
  }

  describe('authenticate password encryption', () => {
    it('fails closed when Instagram returns no encryption key', async () => {
      fetchResponses.push(new Response(null, { status: 200, headers: {} }))

      const client = new InstagramClient()
      const err = await client.authenticate('user', 'mypassword').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('encryption_key_missing')
    })

    it('never sends a plaintext password', async () => {
      fetchResponses.push(new Response(null, { status: 200, headers: {} }))

      const client = new InstagramClient()
      await client.authenticate('user', 'supersecret').catch(() => undefined)

      const preLoginBody = fetchCalls[0]?.init?.body
      expect(String(preLoginBody ?? '')).not.toContain('supersecret')
    })

    it('produces #PWD_INSTAGRAM:4:timestamp:base64 format when encryption key provided', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))

      const client = new InstagramClient()
      const before = Math.floor(Date.now() / 1000)
      await client.authenticate('user', 'secret')
      const after = Math.floor(Date.now() / 1000)

      const loginBody = signedBody(1)
      const encPassword = loginBody['enc_password'] ?? ''

      expect(encPassword).toMatch(/^#PWD_INSTAGRAM:4:\d+:.+/)
      const parts = encPassword.split(':')
      const ts = Number(parts[2])
      expect(ts).toBeGreaterThanOrEqual(before)
      expect(ts).toBeLessThanOrEqual(after)
      expect(parts[3]).toBeTruthy()
      expect(() => Buffer.from(parts[3] ?? '', 'base64')).not.toThrow()
    })

    it('signs the login body and includes anti-bot login fields', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))

      const client = new InstagramClient()
      await client.authenticate('user', 'secret')

      const raw = fetchCalls[1]?.init?.body
      const params = new URLSearchParams(String(raw ?? ''))
      const signedBodyRaw = params.get('signed_body') ?? ''

      expect(params.get('ig_sig_key_version')).toBeNull()
      expect(signedBodyRaw).toMatch(/^SIGNATURE\./)

      const login = signedBody(1)
      expect(login['jazoest']).toMatch(/^2\d+$/)
      expect(login['google_tokens']).toBe('[]')
      expect(login['adid']).toBeTruthy()
      expect(login['country_codes']).toContain('country_code')
      expect(login['_csrftoken']).toBeTruthy()
      expect(login['_csrftoken']).not.toBe('missing')
    })

    it('signs bodies with the literal SIGNATURE. prefix and no key version', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))

      const client = new InstagramClient()
      await client.authenticate('user', 'secret')

      const preLogin = new URLSearchParams(String(fetchCalls[0]?.init?.body ?? ''))
      expect(preLogin.get('signed_body')).toMatch(/^SIGNATURE\./)
      expect(preLogin.get('ig_sig_key_version')).toBeNull()
    })

    it('uses the configured country code in the login body', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))

      const client = new InstagramClient()
      client.setCountryCode('82')
      await client.authenticate('user', 'secret')

      const login = signedBody(1)
      const countryCodes = JSON.parse(login['country_codes'] ?? '[]') as Array<{ country_code: string }>
      expect(countryCodes[0]?.country_code).toBe('82')
    })

    it.each(['7abc', '1.5', '-1', '256'])('rejects malformed encryption key id %p', async (keyId) => {
      fetchResponses.push(
        new Response(null, {
          status: 200,
          headers: new Headers({
            'ig-set-password-encryption-pub-key': rsaPublicKeyBase64,
            'ig-set-password-encryption-key-id': keyId,
          }),
        }),
      )

      const client = new InstagramClient()
      const err = await client.authenticate('user', 'secret').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('encryption_key_invalid')
    })
  })

  describe('authenticate Facebook-linked accounts', () => {
    it('throws a clear facebook_linked error when Instagram offers login_with_facebook', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(
        jsonResponse(
          {
            status: 'fail',
            error_type: 'bad_password',
            message: 'You can log in with your linked Facebook account.',
            buttons: [
              { title: 'Use Facebook', action: 'login_with_facebook' },
              { title: 'Try again', action: 'dismiss' },
            ],
          },
          400,
        ),
      )

      const client = new InstagramClient()
      const err = await client.authenticate('user', 'secret').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('facebook_linked')
      expect((err as InstagramError).message).toContain('auth extract')
      expect((err as InstagramError).message).toContain('password')
      expect((err as InstagramError).message).toContain('unlink Facebook')
    })

    it('throws the generic login error for a real bad_password without the Facebook button', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(
        jsonResponse(
          { status: 'fail', error_type: 'bad_password', message: 'The password you entered is incorrect.' },
          400,
        ),
      )

      const client = new InstagramClient()
      const err = await client.authenticate('user', 'secret').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('bad_password')
    })
  })

  describe('device persistence', () => {
    function loginResponses(): void {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))
    }

    it('reuses the same persisted device across separate authenticate calls', async () => {
      const dir = join(testDir, `device-reuse-${Math.random().toString(36).slice(2)}`)
      const manager = new InstagramCredentialManager(dir)

      loginResponses()
      await new InstagramClient(manager).authenticate('user', 'secret')
      const firstHeaders = (fetchCalls[1]?.init?.headers ?? {}) as Record<string, string>
      const firstAndroidId = firstHeaders['X-IG-Android-ID']

      loginResponses()
      await new InstagramClient(manager).authenticate('user', 'secret')
      const secondHeaders = (fetchCalls[3]?.init?.headers ?? {}) as Record<string, string>
      const secondAndroidId = secondHeaders['X-IG-Android-ID']

      expect(firstAndroidId).toBeTruthy()
      expect(secondAndroidId).toBe(firstAndroidId)
    })

    it('persists a device the first time authenticate runs', async () => {
      const dir = join(testDir, `device-create-${Math.random().toString(36).slice(2)}`)
      const manager = new InstagramCredentialManager(dir)
      expect(await manager.loadDevice()).toBeNull()

      loginResponses()
      await new InstagramClient(manager).authenticate('user', 'secret')

      const saved = await manager.loadDevice()
      expect(saved).not.toBeNull()
      expect(saved?.android_device_id).toMatch(/^android-[0-9a-f]{16}$/)
    })
  })

  describe('parseOneClickLoginLink', () => {
    it('extracts uid and token from a full web_emaillogin URL', () => {
      const url = 'https://www.instagram.com/_n/web_emaillogin?uid=ENCODED_UID&token=NONCE123&auto_send=0'
      expect(parseOneClickLoginLink(url)).toEqual({ uid: 'ENCODED_UID', token: 'NONCE123' })
    })

    it('extracts from a bare query string without a scheme', () => {
      expect(parseOneClickLoginLink('uid=abc&token=xyz')).toEqual({ uid: 'abc', token: 'xyz' })
    })

    it('trims surrounding whitespace', () => {
      expect(parseOneClickLoginLink('  https://x/?uid=a&token=b  ')).toEqual({ uid: 'a', token: 'b' })
    })

    it('strips a trailing #fragment so token is not corrupted', () => {
      const url = 'https://www.instagram.com/_n/web_emaillogin?uid=U1&token=T1#tracking-anchor'
      expect(parseOneClickLoginLink(url)).toEqual({ uid: 'U1', token: 'T1' })
    })

    it('returns null when uid or token is missing', () => {
      expect(parseOneClickLoginLink('https://www.instagram.com/?uid=only')).toBeNull()
      expect(parseOneClickLoginLink('not a link')).toBeNull()
    })
  })

  describe('email login flow', () => {
    it('sends the recovery flow email and reports the contact point', async () => {
      fetchResponses.push(jsonResponse({ status: 'ok', obfuscated_email: 'j***@example.com' }))

      const client = new InstagramClient()
      const result = await client.sendRecoveryFlowEmail('user')

      expect(fetchCalls[0]?.url).toContain('/accounts/send_recovery_flow_email/')
      const body = urlParamsBody(0)
      expect(body['query']).toBe('user')
      expect(body['guid']).toBeTruthy()
      expect(body['device_id']).toBeTruthy()
      expect(result).toEqual({ sent: true, contactPoint: 'j***@example.com' })
    })

    it('throws when the recovery email request fails', async () => {
      fetchResponses.push(jsonResponse({ status: 'fail', message: 'No account found' }))

      const client = new InstagramClient()
      const err = await client.sendRecoveryFlowEmail('nobody').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('recovery_email_failed')
    })

    it('redeems a one-click login token for a session', async () => {
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '4242' } }))

      const client = new InstagramClient()
      const result = await client.oneClickLogin('ENCODED_UID', 'NONCE123')

      expect(fetchCalls[0]?.url).toContain('/accounts/one_click_login/')
      const body = urlParamsBody(0)
      expect(body['uid']).toBe('ENCODED_UID')
      expect(body['token']).toBe('NONCE123')
      expect(body['source']).toBe('one_click_login_email')
      expect(result.userId).toBe('4242')
    })

    it('throws when one-click login returns no session', async () => {
      fetchResponses.push(jsonResponse({ status: 'fail', message: 'Invalid token' }, 400))

      const client = new InstagramClient()
      const err = await client.oneClickLogin('uid', 'bad').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('one_click_login_failed')
    })
  })

  describe('buildHeaders', () => {
    it('includes required Instagram headers', async () => {
      fetchResponses.push(encryptionKeyResponse())
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '99' } }))

      const client = new InstagramClient()
      await client.authenticate('user', 'pass')

      const headers = fetchCalls[0]?.init?.headers as Record<string, string>

      expect(headers['X-IG-App-ID']).toBe('567067343352427')
      expect(headers['User-Agent']).toMatch(/^Instagram \d+\.\d+\.\d+\.\d+\.\d+ Android \(/)
      expect(headers['X-IG-Capabilities']).toBeTruthy()
      expect(headers['X-IG-Connection-Type']).toBe('WIFI')
      expect(headers['X-Bloks-Version-Id']).toBeTruthy()
      expect(headers['X-IG-WWW-Claim']).toBe('0')
      expect(headers['Content-Type']).toContain('application/x-www-form-urlencoded')
    })

    it('includes device headers when session is set', async () => {
      fetchResponses.push(jsonResponse({ status: 'ok', inbox: { threads: [] } }))

      const client = await loadedClient()
      await client.listChats()

      const headers = fetchCalls[0]?.init?.headers as Record<string, string>

      expect(headers['X-IG-Device-ID']).toBe(SESSION.device.uuid)
      expect(headers['X-IG-Android-ID']).toBe(SESSION.device.android_device_id)
      expect(headers['Cookie']).toContain('sessionid=abc123')
    })
  })

  describe('mapThread', () => {
    it('maps API thread to InstagramChatSummary', async () => {
      const thread = {
        thread_id: 'thread-42',
        thread_title: 'Team Chat',
        thread_type: 'group',
        users: [
          { pk: '1', full_name: 'Alice', username: 'alice' },
          { pk: '2', full_name: 'Bob', username: 'bob' },
        ],
        items: [],
        read_state: 3,
      }
      fetchResponses.push(jsonResponse({ status: 'ok', inbox: { threads: [thread] } }))

      const client = await loadedClient()
      const chats = await client.listChats()

      expect(chats).toHaveLength(1)
      const chat = chats[0]!
      expect(chat.id).toBe('thread-42')
      expect(chat.name).toBe('Team Chat')
      expect(chat.type).toBe('group')
      expect(chat.is_group).toBe(true)
      expect(chat.unread_count).toBe(3)
      expect(chat.participant_count).toBe(3)
    })

    it('falls back to user names when no thread_title', async () => {
      const thread = {
        thread_id: 't-1',
        thread_type: 'private',
        users: [{ pk: '5', full_name: 'Charlie', username: 'charlie' }],
        items: [],
        read_state: 0,
      }
      fetchResponses.push(jsonResponse({ status: 'ok', inbox: { threads: [thread] } }))

      const client = await loadedClient()
      const chats = await client.listChats()

      expect(chats[0]!.name).toBe('Charlie')
      expect(chats[0]!.is_group).toBe(false)
    })
  })

  describe('mapMessage', () => {
    it('maps API item to InstagramMessageSummary with media_url', async () => {
      const item = {
        item_id: 'msg-7',
        user_id: '10',
        timestamp: 1_700_000_000_000_000,
        item_type: 'media',
        media: {
          image_versions2: {
            candidates: [{ url: 'https://cdn.example.com/photo.jpg', width: 1080, height: 720 }],
          },
        },
      }
      const thread = {
        thread_id: 'thread-5',
        status: 'ok',
        items: [item],
      }
      fetchResponses.push(jsonResponse({ status: 'ok', thread }))

      const client = await loadedClient()
      const messages = await client.getMessages('thread-5')

      expect(messages).toHaveLength(1)
      const msg = messages[0]!
      expect(msg.id).toBe('msg-7')
      expect(msg.thread_id).toBe('thread-5')
      expect(msg.from).toBe('10')
      expect(msg.is_outgoing).toBe(false)
      expect(msg.type).toBe('media')
      expect(msg.media_url).toBe('https://cdn.example.com/photo.jpg')
    })

    it('sets is_outgoing true when from matches userId', async () => {
      const item = {
        item_id: 'msg-8',
        user_id: '42',
        timestamp: 1_700_000_000_000_000,
        item_type: 'text',
        text: 'hi',
      }
      fetchResponses.push(jsonResponse({ status: 'ok', thread: { thread_id: 't-1', items: [item] } }))

      const client = await loadedClient()
      const messages = await client.getMessages('t-1')

      expect(messages[0]!.is_outgoing).toBe(true)
    })
  })

  describe('request', () => {
    it('throws rate_limited on 429', async () => {
      fetchResponses.push(new Response('Rate limited', { status: 429 }))

      const client = await loadedClient()

      const err = await client.listChats().catch((e: unknown) => e)
      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('rate_limited')
    })

    it('throws on JSON parse error', async () => {
      fetchResponses.push(new Response('not json', { status: 200 }))

      const client = await loadedClient()

      await expect(client.listChats()).rejects.toThrow(InstagramError)
    })

    it('returns parsed response on success', async () => {
      fetchResponses.push(jsonResponse({ status: 'ok', inbox: { threads: [] } }))

      const client = await loadedClient()
      const chats = await client.listChats()

      expect(chats).toEqual([])
    })
  })

  describe('searchUsers', () => {
    it('maps response to user list', async () => {
      fetchResponses.push(
        jsonResponse({
          status: 'ok',
          users: [
            { pk: 101, username: 'alice', full_name: 'Alice Smith' },
            { pk: 102, username: 'bob', full_name: 'Bob Jones' },
          ],
        }),
      )

      const client = await loadedClient()
      const users = await client.searchUsers('ali')

      expect(users).toHaveLength(2)
      expect(users[0]).toEqual({ pk: '101', username: 'alice', fullName: 'Alice Smith' })
      expect(users[1]).toEqual({ pk: '102', username: 'bob', fullName: 'Bob Jones' })
    })
  })

  describe('sendMessage', () => {
    it('sends correct body params', async () => {
      fetchResponses.push(
        jsonResponse({
          status: 'ok',
          payload: { items: [] },
        }),
      )

      const client = await loadedClient()
      await client.sendMessage('thread-99', 'Hello World')

      const body = urlParamsBody(0)
      expect(body['thread_ids']).toBe('[thread-99]')
      expect(body['text']).toBe('Hello World')
      expect(body['action']).toBe('send_item')
      expect(body['client_context']).toBeTruthy()
    })
  })

  describe('sendMessageToUser', () => {
    it('sends correct body params', async () => {
      fetchResponses.push(
        jsonResponse({
          status: 'ok',
          payload: { thread_id: 'new-thread', items: [] },
        }),
      )

      const client = await loadedClient()
      await client.sendMessageToUser('user-55', 'Hey there')

      const body = urlParamsBody(0)
      expect(body['recipient_users']).toBe('[[user-55]]')
      expect(body['text']).toBe('Hey there')
      expect(body['action']).toBe('send_item')
      expect(body['client_context']).toBeTruthy()
    })
  })

  describe('twoFactorLogin', () => {
    it('completes via the legacy endpoint and signs the body', async () => {
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '77' } }))

      const client = await loadedClient()
      const result = await client.twoFactorLogin('user', '123456', 'ident-1')

      expect(result.userId).toBe('77')
      expect(fetchCalls[0]?.url).toContain('/accounts/two_factor_login/')

      const params = new URLSearchParams(String(fetchCalls[0]?.init?.body ?? ''))
      expect(params.get('signed_body')).toMatch(/^SIGNATURE\./)
      expect(params.get('ig_sig_key_version')).toBeNull()
      const body = signedBody(0)
      expect(body['verification_code']).toBe('123456')
      expect(body['two_factor_identifier']).toBe('ident-1')
    })

    it('falls back to the Bloks flow when the legacy endpoint rejects params', async () => {
      fetchResponses.push(jsonResponse({ status: 'fail', message: 'Invalid parameters' }, 400))
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '88' } }))

      const client = await loadedClient()
      const result = await client.twoFactorLogin('user', '654321', 'ctx-9')

      expect(result.userId).toBe('88')
      expect(fetchCalls[1]?.url).toContain('two_step_verification.verify_code.async')

      const params = new URLSearchParams(String(fetchCalls[1]?.init?.body ?? ''))
      expect(params.get('signed_body')).toBeNull()
      expect(params.get('params')).toContain('654321')
    })

    it('passes the Bloks context from the failed legacy response, not the legacy identifier', async () => {
      fetchResponses.push(jsonResponse({ status: 'fail', two_step_verification_context: 'real-bloks-ctx' }, 400))
      fetchResponses.push(jsonResponse({ status: 'ok', logged_in_user: { pk: '88' } }))

      const client = await loadedClient()
      await client.twoFactorLogin('user', '654321', 'legacy-ident')

      const params = new URLSearchParams(String(fetchCalls[1]?.init?.body ?? ''))
      const bloksParams = JSON.parse(params.get('params') ?? '{}') as {
        server_params: { two_step_verification_context: string }
      }
      expect(bloksParams.server_params.two_step_verification_context).toBe('real-bloks-ctx')
    })

    it('resolves the Bloks 2FA user id from the ds_user_id cookie when no logged_in_user is returned', async () => {
      fetchResponses.push(jsonResponse({ status: 'fail', message: 'Invalid parameters' }, 400))
      fetchResponses.push(
        jsonResponse({ status: 'ok' }, 200, {
          'ig-set-authorization': 'Bearer IGT:2:token',
          'set-cookie': 'ds_user_id=555',
        }),
      )

      const client = await loadedClient()
      client.getSessionState().user_id = undefined
      const result = await client.twoFactorLogin('user', '654321', 'ctx-9')

      expect(result.userId).toBe('555')
    })

    it('fails the Bloks 2FA flow when no user id can be resolved', async () => {
      const noUserSession: InstagramSessionState = { ...SESSION, cookies: '', user_id: undefined }
      const noUserPath = join(testDir, 'no-user-session.json')
      writeFileSync(noUserPath, JSON.stringify(noUserSession))

      fetchResponses.push(jsonResponse({ status: 'fail', message: 'Invalid parameters' }, 400))
      fetchResponses.push(jsonResponse({ status: 'ok' }, 200, { 'ig-set-authorization': 'Bearer IGT:2:token' }))

      const client = new InstagramClient()
      await client.loadSession(noUserPath)
      const err = await client.twoFactorLogin('user', '654321', 'ctx-9').catch((e: unknown) => e)

      expect(err).toBeInstanceOf(InstagramError)
      expect((err as InstagramError).code).toBe('two_factor_failed')
    })
  })
})
