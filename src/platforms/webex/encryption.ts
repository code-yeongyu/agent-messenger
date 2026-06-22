import { createCipheriv, randomBytes } from 'node:crypto'

import * as jose from 'node-jose'

export interface WebexKeyProvider {
  fetchKey(keyUri: string): Promise<string | null>
  close?(): Promise<void>
}

// SCR (Secure Content Resource): Webex's per-file AES-256-GCM material. The file bytes
// are encrypted with this key, then the SCR itself is JWE-wrapped with the conversation key.
export interface WebexScr {
  enc: 'A256GCM'
  key: string
  iv: string
  aad: string
  loc?: string
  tag: string
}

export interface WebexEncryptedBinary {
  scr: WebexScr
  ciphertext: Uint8Array
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url')
}

export class WebexEncryptionService {
  private rawKeys: Map<string, string>
  private keyCache: Map<string, jose.JWK.Key> = new Map()
  private keyProvider: WebexKeyProvider | null = null

  constructor(serializedKeys: Map<string, string>) {
    this.rawKeys = serializedKeys
  }

  setKeyProvider(provider: WebexKeyProvider): void {
    this.keyProvider = provider
  }

  async close(): Promise<void> {
    await this.keyProvider?.close?.()
  }

  async getKey(keyUri: string): Promise<jose.JWK.Key | null> {
    const cached = this.keyCache.get(keyUri)
    if (cached) return cached

    let raw = this.rawKeys.get(keyUri)
    if (!raw && this.keyProvider) {
      raw = (await this.keyProvider.fetchKey(keyUri)) ?? undefined
    }
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as { jwk: object }
      const joseKey = await jose.JWK.asKey(parsed.jwk)
      this.rawKeys.set(keyUri, raw)
      this.keyCache.set(keyUri, joseKey)
      return joseKey
    } catch {
      return null
    }
  }

  async encryptText(keyUri: string, plaintext: string): Promise<string | null> {
    const key = await this.getKey(keyUri)
    if (!key) return null

    try {
      // Webex desktop/web clients auto-tombstone edit activities whose JWE is missing
      // `kid` — they can't resolve the KMS key and treat the activity as malformed.
      return await jose.JWE.createEncrypt(
        { format: 'compact', contentAlg: 'A256GCM' },
        { key, header: { alg: 'dir', kid: keyUri }, reference: null },
      ).final(plaintext, 'utf8')
    } catch {
      return null
    }
  }

  async decryptText(keyUri: string, ciphertext: string): Promise<string | null> {
    const key = await this.getKey(keyUri)
    if (!key) return null

    try {
      const result = await jose.JWE.createDecrypt(key).decrypt(ciphertext)
      return result.plaintext.toString('utf8')
    } catch {
      return null
    }
  }

  encryptBinary(plaintext: Uint8Array): WebexEncryptedBinary {
    const key = randomBytes(32)
    const iv = randomBytes(12)
    const aad = new Date().toISOString()

    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(aad, 'utf8'))
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()])
    const tag = cipher.getAuthTag()

    return {
      scr: {
        enc: 'A256GCM',
        key: toBase64Url(key),
        iv: toBase64Url(iv),
        aad,
        tag: toBase64Url(tag),
      },
      ciphertext,
    }
  }

  async encryptScr(keyUri: string, scr: WebexScr): Promise<string | null> {
    if (!scr.loc) return null
    const key = await this.getKey(keyUri)
    if (!key) return null

    try {
      return await jose.JWE.createEncrypt(
        { format: 'compact', contentAlg: 'A256GCM' },
        { key, header: { alg: 'dir', kid: keyUri }, reference: null },
      ).final(JSON.stringify(scr), 'utf8')
    } catch {
      return null
    }
  }
}
