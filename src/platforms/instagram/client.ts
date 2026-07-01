import { constants, createCipheriv, publicEncrypt, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { InstagramCredentialManager } from './credential-manager'
import {
  InstagramError,
  extractMediaUrl,
  extractMessageText,
  getMessageType,
  type InstagramChatSummary,
  type InstagramMessageSummary,
  type InstagramSessionState,
} from './types'

const IG_BASE_URL = 'https://i.instagram.com/api/v1'
const IG_APP_ID = '567067343352427'
const IG_VERSION = '428.0.0.47.67'
const IG_VERSION_CODE = '719358530'
// Bloks client versioning id; required header for Bloks endpoints (2FA / CAA flows).
const IG_BLOKS_VERSION_ID = '5f56efad68e1edec7801f630b5c122704ec5378adbee6609a448f105f34a9c73'
const IG_CAPABILITIES = '3brTv10='
const ANDROID_VERSION = '14'
const ANDROID_RELEASE = '34'
const DEVICE_DPI = '480dpi'
const DEVICE_RESOLUTION = '1344x2992'
const DEVICE_MANUFACTURER = 'Google/google'
const DEVICE_MODEL = 'Pixel 8 Pro'
const DEVICE_NAME = 'husky'
const DEVICE_CHIPSET = 'husky'

export function generateDeviceString(): string {
  return `${ANDROID_RELEASE}/${ANDROID_VERSION}; ${DEVICE_DPI}; ${DEVICE_RESOLUTION}; ${DEVICE_MANUFACTURER}; ${DEVICE_MODEL}; ${DEVICE_NAME}; ${DEVICE_CHIPSET}; en_US; ${IG_VERSION_CODE}`
}

// Instagram no longer verifies the body HMAC; the current mobile API expects a literal
// "SIGNATURE." prefix (per subzeroid/instagrapi, subzeroid/aiograpi). Sending a real HMAC +
// ig_sig_key_version is rejected as malformed on /accounts/login/, surfacing as a misleading
// "account not found" error. URLSearchParams url-encodes the value exactly once.
function signBody(payload: Record<string, unknown>): Record<string, string> {
  return { signed_body: `SIGNATURE.${JSON.stringify(payload)}` }
}

// jazoest = "2" + sum of ASCII byte values of the input; an anti-bot checksum expected by login.
function createJazoest(input: string): string {
  let sum = 0
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i)
  }
  return `2${sum}`
}

function generateToken(): string {
  return randomBytes(16).toString('hex')
}

function buildUserAgent(deviceString: string): string {
  return `Instagram ${IG_VERSION} Android (${deviceString})`
}

export function generateAndroidDeviceId(): string {
  return `android-${randomBytes(8).toString('hex')}`
}

// Instagram DM timestamps are in microseconds
function microsecondsToISO(us: number): string {
  return new Date(us / 1000).toISOString()
}

export class InstagramClient {
  private session: InstagramSessionState | null = null
  private credentialManager: InstagramCredentialManager
  private sessionPath: string | null = null
  private userId: string | null = null
  private cookies: Map<string, string> = new Map()
  private countryCode = '1'

  constructor(credentialManager?: InstagramCredentialManager) {
    this.credentialManager = credentialManager ?? new InstagramCredentialManager()
  }

  setCountryCode(code: string): void {
    this.countryCode = code
  }

  async login(credentials?: { username: string; password: string }, accountId?: string): Promise<this> {
    if (credentials) {
      await this.authenticate(credentials.username, credentials.password)
      return this
    }

    const account = await this.credentialManager.getAccount(accountId)
    if (!account) {
      throw new InstagramError(
        'No Instagram credentials found. Run "agent-instagram auth login --username <username>" first.',
        'no_credentials',
      )
    }

    const paths = await this.credentialManager.ensureAccountPaths(account.account_id)
    this.sessionPath = paths.session_path

    if (!existsSync(paths.session_path)) {
      throw new InstagramError(
        'Session expired or missing. Run "agent-instagram auth login --username <username>" to re-authenticate.',
        'session_missing',
      )
    }

    const raw = await readFile(paths.session_path, 'utf-8')
    this.session = JSON.parse(raw) as InstagramSessionState
    this.userId = this.session.user_id ?? null
    this.parseCookies(this.session.cookies)

    return this
  }

  private debugLog?: (msg: string) => void

  setDebugLog(fn: (msg: string) => void): void {
    this.debugLog = fn
  }

  async authenticate(
    username: string,
    password: string,
  ): Promise<{
    userId: string
    requiresTwoFactor?: boolean
    twoFactorInfo?: Record<string, unknown>
    challengeRequired?: boolean
    challengePath?: string
  }> {
    const deviceString = generateDeviceString()
    const device = {
      phone_id: randomUUID(),
      uuid: randomUUID(),
      android_device_id: generateAndroidDeviceId(),
      advertising_id: randomUUID(),
      client_session_id: randomUUID(),
      device_string: deviceString,
    }

    this.session = { cookies: '', device }

    const encryptionKey = await this.preLoginFlow()
    if (!encryptionKey) {
      throw new InstagramError(
        'Instagram did not return a password encryption key. Login cannot proceed safely.',
        'encryption_key_missing',
      )
    }

    this.debugLog?.(`encrypting password with key_id=${encryptionKey.keyId}`)
    const encPassword = this.encryptPassword(password, encryptionKey)

    const { status, data } = await this.request(
      'POST',
      '/accounts/login/',
      {
        username,
        enc_password: encPassword,
        guid: device.uuid,
        phone_id: device.phone_id,
        _csrftoken: this.cookies.get('csrftoken') ?? generateToken(),
        device_id: device.android_device_id,
        adid: device.advertising_id,
        google_tokens: '[]',
        login_attempt_count: '0',
        country_codes: JSON.stringify([{ country_code: this.countryCode, source: ['default'] }]),
        jazoest: createJazoest(device.phone_id),
      },
      { signed: true },
    )

    this.debugLog?.(`login response status=${status} body=${JSON.stringify(data)}`)

    if (data['two_factor_required'] === true) {
      const twoFactorInfo = data['two_factor_info'] as Record<string, unknown> | undefined
      this.session.cookies = this.serializeCookies()
      return { userId: '', requiresTwoFactor: true, twoFactorInfo }
    }

    const errorType = data['error_type'] as string | undefined
    const challenge = data['challenge'] as Record<string, unknown> | undefined
    const challengeApiPath = (challenge?.['api_path'] as string) ?? ''

    if (challengeApiPath || errorType === 'challenge_required') {
      this.session.challenge_path = challengeApiPath
      this.session.cookies = this.serializeCookies()
      await this.saveSession()
      return { userId: '', challengeRequired: true, challengePath: challengeApiPath }
    }

    if (status !== 200 || data['status'] !== 'ok') {
      const message = (data['message'] as string) ?? 'Login failed'
      throw new InstagramError(message, errorType ?? 'login_failed')
    }

    await this.finalizeLogin(data)
    return { userId: this.userId ?? '' }
  }

  async twoFactorLogin(username: string, code: string, twoFactorIdentifier: string): Promise<{ userId: string }> {
    const device = this.session?.device
    const { status, data } = await this.request(
      'POST',
      '/accounts/two_factor_login/',
      {
        username,
        verification_code: code,
        two_factor_identifier: twoFactorIdentifier,
        trust_this_device: '1',
        verification_method: '3',
        _csrftoken: this.cookies.get('csrftoken') ?? generateToken(),
        guid: device?.uuid ?? '',
        phone_id: device?.phone_id ?? '',
        device_id: device?.android_device_id ?? '',
      },
      { signed: true },
    )

    if (this.isBloksTwoFactorFallback(status, data)) {
      this.debugLog?.('legacy two_factor_login rejected, retrying via Bloks flow')
      const bloksContext =
        typeof data['two_step_verification_context'] === 'string'
          ? data['two_step_verification_context']
          : twoFactorIdentifier
      return this.bloksTwoFactorLogin(code, bloksContext)
    }

    if (status !== 200 || data['status'] !== 'ok') {
      const message = (data['message'] as string) ?? 'Two-factor authentication failed'
      throw new InstagramError(message, 'two_factor_failed')
    }

    await this.finalizeLogin(data)
    return { userId: this.userId ?? '' }
  }

  private isBloksTwoFactorFallback(status: number, data: Record<string, unknown>): boolean {
    if (status === 200 && data['status'] === 'ok') return false
    const message = ((data['message'] as string) ?? '').trim().toLowerCase()
    return message === 'invalid parameters' || data['two_step_verification_context'] != null
  }

  private async bloksTwoFactorLogin(code: string, twoFactorIdentifier: string): Promise<{ userId: string }> {
    const device = this.session?.device
    const params = {
      client_input_params: {
        code,
        should_trust_device: 1,
        family_device_id: device?.phone_id ?? '',
        device_id: device?.android_device_id ?? '',
        machine_id: this.session?.mid ?? '',
      },
      server_params: {
        challenge: 'totp',
        two_step_verification_context: twoFactorIdentifier,
        flow_source: 'two_factor_login',
      },
    }

    const { status, data } = await this.request(
      'POST',
      '/bloks/async_action/com.bloks.www.two_step_verification.verify_code.async/',
      { params: JSON.stringify(params), bk_client_context: JSON.stringify({ bloks_version: IG_BLOKS_VERSION_ID }) },
    )

    if (status !== 200 || (data['status'] != null && data['status'] !== 'ok')) {
      const message = (data['message'] as string) ?? 'Two-factor authentication failed'
      throw new InstagramError(message, 'two_factor_failed')
    }

    const loggedInUser = data['logged_in_user'] as Record<string, unknown> | undefined
    if (loggedInUser) {
      await this.finalizeLogin(data)
      return { userId: this.userId ?? '' }
    }

    if (this.session?.authorization) {
      const userId = this.session.user_id ?? this.cookies.get('ds_user_id')
      if (!userId) {
        throw new InstagramError('Two-factor authentication failed', 'two_factor_failed')
      }
      this.userId = userId
      this.session.user_id = userId
      await this.saveSession()
      return { userId }
    }

    throw new InstagramError('Two-factor authentication failed', 'two_factor_failed')
  }

  async challengeSendCode(
    apiPath: string,
    method: 'email' | 'sms' = 'email',
  ): Promise<{ contactPoint: string; stepName: string }> {
    this.ensureSession()

    const { data: getData } = await this.request(
      'GET',
      `${apiPath}?guid=${this.session!.device.uuid}&device_id=${this.session!.device.android_device_id}`,
    )
    const stepName = (getData['step_name'] as string) ?? ''

    const choice = method === 'sms' ? '0' : '1'
    const { data } = await this.request('POST', apiPath, { choice })

    const contactPoint = (data['contact_point'] as string) ?? ''
    const resultStep = (data['step_name'] as string) ?? stepName

    if (data['status'] === 'fail') {
      const message = (data['message'] as string) ?? 'Failed to send challenge code'
      throw new InstagramError(message, 'challenge_send_failed')
    }

    return { contactPoint, stepName: resultStep }
  }

  async challengeSubmitCode(apiPath: string, code: string): Promise<{ userId: string }> {
    this.ensureSession()

    const { status, data } = await this.request('POST', apiPath, {
      security_code: code,
    })

    if (data['action'] === 'close' || (status === 200 && data['status'] === 'ok')) {
      const loggedInUser = data['logged_in_user'] as Record<string, unknown> | undefined
      if (loggedInUser) {
        await this.finalizeLogin(data)
        return { userId: this.userId ?? '' }
      }
      if (this.session) {
        this.session.challenge_path = undefined
        this.session.cookies = this.serializeCookies()
        await this.saveSession()
      }
      return { userId: this.session?.user_id ?? '' }
    }

    const message = (data['message'] as string) ?? 'Challenge verification failed'
    throw new InstagramError(message, 'challenge_verify_failed')
  }

  async searchUsers(query: string): Promise<Array<{ pk: string; username: string; fullName: string }>> {
    this.ensureSession()
    const { data } = await this.request('GET', `/users/search/?q=${encodeURIComponent(query)}&count=10`)

    if (data['status'] !== 'ok') {
      throw new InstagramError('User search failed', 'search_failed')
    }

    const users = (data['users'] ?? []) as Array<Record<string, unknown>>
    return users.map((u) => ({
      pk: String(u['pk'] ?? ''),
      username: (u['username'] as string) ?? '',
      fullName: (u['full_name'] as string) ?? '',
    }))
  }

  async sendMessageToUser(userPk: string, text: string): Promise<InstagramMessageSummary> {
    this.ensureSession()

    const { data } = await this.request('POST', '/direct_v2/threads/broadcast/text/', {
      recipient_users: `[[${userPk}]]`,
      text,
      action: 'send_item',
      client_context: randomUUID(),
    })

    if (data['status'] !== 'ok') {
      throw new InstagramError('Failed to send message', 'send_failed')
    }

    const payload = data['payload'] as Record<string, unknown> | undefined
    const threadId = (payload?.['thread_id'] as string) ?? ''
    const items = (payload?.['items'] ?? []) as Array<Record<string, unknown>>
    const sentItem = items[0]

    if (!sentItem) {
      return {
        id: '',
        thread_id: threadId,
        from: this.userId ?? '',
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        type: 'text',
        text,
      }
    }

    return this.mapMessage(sentItem, threadId)
  }

  async listChats(limit = 20): Promise<InstagramChatSummary[]> {
    this.ensureSession()
    const { data } = await this.request('GET', `/direct_v2/inbox/?limit=${limit}`)

    if (data['status'] !== 'ok') {
      throw new InstagramError('Failed to fetch inbox', 'inbox_error')
    }

    const inbox = data['inbox'] as Record<string, unknown> | undefined
    const threads = (inbox?.['threads'] ?? []) as Array<Record<string, unknown>>
    return threads.map((t) => this.mapThread(t))
  }

  async fetchIrisBootstrap(): Promise<{ seqId: number; snapshotAtMs: number }> {
    this.ensureSession()
    const { data } = await this.request('GET', '/direct_v2/inbox/?limit=1')

    if (data['status'] !== 'ok') {
      throw new InstagramError('Failed to fetch iris bootstrap', 'inbox_error')
    }

    const seqId = data['seq_id'] as number | undefined
    const snapshotAtMs = data['snapshot_at_ms'] as number | undefined

    if (typeof seqId !== 'number' || typeof snapshotAtMs !== 'number') {
      throw new InstagramError('Iris bootstrap missing seq_id or snapshot_at_ms', 'iris_bootstrap_missing')
    }

    return { seqId, snapshotAtMs }
  }

  async searchChats(query: string, limit = 20): Promise<InstagramChatSummary[]> {
    const allChats = await this.listChats(Math.max(limit, 50))
    const lower = query.toLowerCase()
    return allChats.filter((c) => c.name.toLowerCase().includes(lower) || c.id.includes(query)).slice(0, limit)
  }

  async searchMessages(
    query: string,
    options: { threadId?: string; limit?: number } = {},
  ): Promise<InstagramMessageSummary[]> {
    this.ensureSession()
    const limit = options.limit ?? 20
    const lower = query.toLowerCase()
    const results: InstagramMessageSummary[] = []

    if (options.threadId) {
      const messages = await this.getMessages(options.threadId, 100)
      for (const msg of messages) {
        if (msg.text?.toLowerCase().includes(lower)) results.push(msg)
        if (results.length >= limit) break
      }
      return results
    }

    const chats = await this.listChats(20)
    for (const chat of chats) {
      if (results.length >= limit) break
      const messages = await this.getMessages(chat.id, 50)
      for (const msg of messages) {
        if (msg.text?.toLowerCase().includes(lower)) results.push(msg)
        if (results.length >= limit) break
      }
    }
    return results
  }

  async getMessages(threadId: string, limit = 25): Promise<InstagramMessageSummary[]> {
    this.ensureSession()
    const { data } = await this.request('GET', `/direct_v2/threads/${threadId}/?limit=${limit}`)

    if (data['status'] !== 'ok') {
      throw new InstagramError(`Failed to fetch thread ${threadId}`, 'thread_error')
    }

    const thread = data['thread'] as Record<string, unknown> | undefined
    const items = (thread?.['items'] ?? []) as Array<Record<string, unknown>>

    // API returns newest-first; reverse for chronological order
    return items.reverse().map((item) => this.mapMessage(item, threadId))
  }

  async sendMessage(threadId: string, text: string): Promise<InstagramMessageSummary> {
    this.ensureSession()

    const { data } = await this.request('POST', '/direct_v2/threads/broadcast/text/', {
      thread_ids: `[${threadId}]`,
      text,
      action: 'send_item',
      client_context: randomUUID(),
    })

    if (data['status'] !== 'ok') {
      throw new InstagramError('Failed to send message', 'send_failed')
    }

    const payload = data['payload'] as Record<string, unknown> | undefined
    const items = (payload?.['items'] ?? []) as Array<Record<string, unknown>>
    const sentItem = items[0]

    if (!sentItem) {
      return {
        id: '',
        thread_id: threadId,
        from: this.userId ?? '',
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        type: 'text',
        text,
      }
    }

    return this.mapMessage(sentItem, threadId)
  }

  setSessionPath(path: string): void {
    this.sessionPath = path
  }

  async loadSession(sessionPath: string): Promise<void> {
    this.sessionPath = sessionPath
    if (!existsSync(sessionPath)) {
      throw new InstagramError('No session found. Run "agent-instagram auth login" first.', 'session_missing')
    }
    const raw = await readFile(sessionPath, 'utf-8')
    this.session = JSON.parse(raw) as InstagramSessionState
    this.userId = this.session.user_id ?? null
    this.parseCookies(this.session.cookies)
  }

  getChallengePath(): string | undefined {
    return this.session?.challenge_path
  }

  getUserId(): string | null {
    return this.userId
  }

  getSessionState(): InstagramSessionState {
    this.ensureSession()
    return this.session!
  }

  async getProfile(): Promise<{
    user_id: string
    username: string
    full_name: string | null
    profile_pic_url: string | null
  }> {
    if (!this.userId) {
      throw new InstagramError('Not authenticated. Call login() first.', 'not_authenticated')
    }
    const account = await this.credentialManager.getAccount()
    return {
      user_id: this.userId,
      username: account?.username ?? '',
      full_name: account?.full_name ?? null,
      profile_pic_url: account?.profile_pic_url ?? null,
    }
  }

  private async preLoginFlow(): Promise<{ keyId: string; publicKey: string } | null> {
    const url = `${IG_BASE_URL}/qe/sync/`
    const headers = this.buildHeaders()

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: new URLSearchParams(
        signBody({
          id: this.session!.device.uuid,
          experiments:
            'ig_android_fci,ig_android_device_detection_info_upload,ig_android_device_verification_fb_signup',
        }),
      ).toString(),
    })
    this.extractResponseCookies(response.headers)

    const wwwClaim = response.headers.get('x-ig-set-www-claim')
    if (wwwClaim && this.session) {
      this.session.www_claim = wwwClaim
    }

    const pubKeyHeader = response.headers.get('ig-set-password-encryption-pub-key')
    const keyIdHeader = response.headers.get('ig-set-password-encryption-key-id')

    if (pubKeyHeader && keyIdHeader) {
      this.debugLog?.(
        `encryption key_id=${keyIdHeader} pub_key_length=${pubKeyHeader.length} pub_key_prefix=${pubKeyHeader.substring(0, 40)}...`,
      )
      return { keyId: keyIdHeader, publicKey: pubKeyHeader }
    }

    return null
  }

  private encryptPassword(password: string, key: { keyId: string; publicKey: string }): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const passwordBytes = Buffer.from(password, 'utf-8')

    const aesKey = randomBytes(32)
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
    cipher.setAAD(Buffer.from(timestamp))
    const encrypted = Buffer.concat([cipher.update(passwordBytes), cipher.final()])
    const tag = cipher.getAuthTag()

    const pubKeyPem = Buffer.from(key.publicKey, 'base64').toString('utf-8')
    const rsaEncrypted = publicEncrypt({ key: pubKeyPem, padding: constants.RSA_PKCS1_PADDING }, aesKey)

    if (!/^(?:0|[1-9]\d*)$/.test(key.keyId)) {
      throw new InstagramError(`Invalid password encryption key id: ${key.keyId}`, 'encryption_key_invalid')
    }
    const keyIdNum = Number(key.keyId)
    if (keyIdNum > 255) {
      throw new InstagramError(`Invalid password encryption key id: ${key.keyId}`, 'encryption_key_invalid')
    }

    // Wire format: version(1) | keyId(1) | iv(12) | rsaLen(2 LE) | rsaEncrypted | tag(16) | aesEncrypted
    const buf = Buffer.alloc(1 + 1 + 12 + 2 + rsaEncrypted.length + 16 + encrypted.length)
    let offset = 0
    buf.writeUInt8(1, offset)
    offset += 1
    buf.writeUInt8(keyIdNum, offset)
    offset += 1
    iv.copy(buf, offset)
    offset += 12
    buf.writeUInt16LE(rsaEncrypted.length, offset)
    offset += 2
    rsaEncrypted.copy(buf, offset)
    offset += rsaEncrypted.length
    tag.copy(buf, offset)
    offset += 16
    encrypted.copy(buf, offset)

    return `#PWD_INSTAGRAM:4:${timestamp}:${buf.toString('base64')}`
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, string>,
    options?: { signed?: boolean },
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const url = `${IG_BASE_URL}${path}`
    const headers = this.buildHeaders()

    const requestInit: RequestInit = { method, headers }
    if (body) {
      const payload = options?.signed ? signBody(body) : body
      requestInit.body = new URLSearchParams(payload).toString()
    }

    const response = await fetch(url, requestInit)
    this.extractResponseCookies(response.headers)

    const authHeader = response.headers.get('ig-set-authorization')
    if (authHeader && this.session) {
      this.session.authorization = authHeader
    }

    const wwwClaim = response.headers.get('x-ig-set-www-claim')
    if (wwwClaim && this.session) {
      this.session.www_claim = wwwClaim
    }

    if (response.status === 429) {
      throw new InstagramError('Rate limited by Instagram. Try again later.', 'rate_limited')
    }

    let data: Record<string, unknown>
    try {
      data = (await response.json()) as Record<string, unknown>
    } catch {
      throw new InstagramError(`Failed to parse response from ${path}`, response.status)
    }

    return { status: response.status, data }
  }

  private buildHeaders(): Record<string, string> {
    const deviceString = this.session?.device.device_string ?? generateDeviceString()
    const headers: Record<string, string> = {
      'User-Agent': buildUserAgent(deviceString),
      'X-IG-App-ID': IG_APP_ID,
      'X-IG-Capabilities': IG_CAPABILITIES,
      'X-IG-Connection-Type': 'WIFI',
      'X-IG-Timezone-Offset': String(new Date().getTimezoneOffset() * -60),
      'X-Bloks-Version-Id': IG_BLOKS_VERSION_ID,
      'X-FB-HTTP-Engine': 'Liger',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    headers['X-IG-WWW-Claim'] = this.session?.www_claim ?? '0'

    if (this.session) {
      headers['X-IG-Device-ID'] = this.session.device.uuid
      headers['X-IG-Android-ID'] = this.session.device.android_device_id
      headers['X-IG-Family-Device-ID'] = this.session.device.phone_id
      if (this.session.authorization) {
        headers['Authorization'] = this.session.authorization
      }
      if (this.session.mid) {
        headers['X-MID'] = this.session.mid
      }
      const cookieStr = this.serializeCookies()
      if (cookieStr) {
        headers['Cookie'] = cookieStr
      }
    }

    return headers
  }

  private parseCookies(cookieStr: string): void {
    this.cookies.clear()
    if (!cookieStr) return
    for (const pair of cookieStr.split('; ')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx > 0) {
        this.cookies.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1))
      }
    }
  }

  private serializeCookies(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }

  private extractResponseCookies(headers: Headers): void {
    let setCookies: string[] = []
    if (typeof headers.getSetCookie === 'function') {
      setCookies = headers.getSetCookie()
    } else {
      const raw = headers.get('set-cookie')
      if (raw) {
        setCookies = raw.split(/,\s*(?=[a-zA-Z_][a-zA-Z0-9_]*=)/)
      }
    }

    for (const sc of setCookies) {
      const [pair] = sc.split(';')
      if (!pair) continue
      const eqIdx = pair.indexOf('=')
      if (eqIdx > 0) {
        const key = pair.slice(0, eqIdx).trim()
        const value = pair.slice(eqIdx + 1)
        this.cookies.set(key, value)

        if (key === 'mid') {
          if (this.session) this.session.mid = value
        }
      }
    }
  }

  private async finalizeLogin(data: Record<string, unknown>): Promise<void> {
    const loggedInUser = data['logged_in_user'] as Record<string, unknown> | undefined
    const pk = loggedInUser?.['pk'] as number | string | undefined
    this.userId = pk ? String(pk) : null

    if (this.session) {
      this.session.user_id = this.userId ?? undefined
      this.session.cookies = this.serializeCookies()
    }

    await this.saveSession()
  }

  private async saveSession(): Promise<void> {
    if (!this.session || !this.sessionPath) return
    this.session.cookies = this.serializeCookies()
    const dir = this.sessionPath.replace(/\/[^/]+$/, '')
    await mkdir(dir, { recursive: true })
    await writeFile(this.sessionPath, JSON.stringify(this.session, null, 2), { mode: 0o600 })
  }

  private ensureSession(): void {
    if (!this.session) {
      throw new InstagramError('Not authenticated. Call .login() first.', 'not_authenticated')
    }
  }

  private mapThread(thread: Record<string, unknown>): InstagramChatSummary {
    const threadId = String(thread['thread_id'] ?? '')
    const threadTitle = thread['thread_title'] as string | undefined
    const users = (thread['users'] ?? []) as Array<Record<string, unknown>>
    const isGroup = (thread['thread_type'] as string) === 'group' || users.length > 1
    const items = (thread['items'] ?? []) as Array<Record<string, unknown>>
    const lastItem = items[0]

    const name =
      threadTitle ||
      users
        .map((u) => (u['full_name'] as string) || (u['username'] as string) || '')
        .filter(Boolean)
        .join(', ') ||
      threadId

    return {
      id: threadId,
      name,
      type: isGroup ? 'group' : 'private',
      is_group: isGroup,
      participant_count: users.length + 1,
      unread_count: (thread['read_state'] as number) ?? 0,
      last_message: lastItem ? this.mapMessage(lastItem, threadId) : undefined,
    }
  }

  private mapMessage(item: Record<string, unknown>, threadId: string): InstagramMessageSummary {
    const itemId = String(item['item_id'] ?? '')
    const userId = String(item['user_id'] ?? '')
    const timestamp = item['timestamp'] as number | undefined

    return {
      id: itemId,
      thread_id: threadId,
      from: userId,
      timestamp: timestamp ? microsecondsToISO(timestamp) : new Date().toISOString(),
      is_outgoing: userId === this.userId,
      type: getMessageType(item),
      text: extractMessageText(item),
      media_url: extractMediaUrl(item),
    }
  }
}
