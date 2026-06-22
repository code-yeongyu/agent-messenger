import { describe, expect, it, mock } from 'bun:test'

import * as jose from 'node-jose'

import { WebexEncryptionService } from './encryption'

const decodeJweHeader = (jwe: string): Record<string, unknown> => {
  const [header = ''] = jwe.split('.')
  const padded = header + '='.repeat((4 - (header.length % 4)) % 4)
  const json = Buffer.from(padded, 'base64url').toString('utf8')
  return JSON.parse(json) as Record<string, unknown>
}

const createSerializedKey = async (keyUri: string) => {
  const keystore = jose.JWK.createKeyStore()
  const key = await keystore.generate('oct', 256, { alg: 'A256GCM' })
  const jwk = key.toJSON(true)
  return JSON.stringify({ uri: keyUri, jwk })
}

const createKeyring = async (keyUri: string) => {
  const rawKeys = new Map<string, string>()
  rawKeys.set(keyUri, await createSerializedKey(keyUri))
  return new WebexEncryptionService(rawKeys)
}

describe('WebexEncryptionService', () => {
  const keyUri = 'kms://kms-aore.wbx2.com/keys/7819829b-5e0d-4139-9cad-1b6fe7aee533'

  it('encryptText emits JWE with alg, enc, and kid JOSE headers', async () => {
    const service = await createKeyring(keyUri)

    const jwe = await service.encryptText(keyUri, 'hello world')

    expect(jwe).not.toBeNull()
    const header = decodeJweHeader(jwe as string)
    expect(header.alg).toBe('dir')
    expect(header.enc).toBe('A256GCM')
    expect(header.kid).toBe(keyUri)
  })

  it('encryptText returns null when key is unknown', async () => {
    const service = await createKeyring(keyUri)

    const jwe = await service.encryptText('kms://other/keys/missing', 'hello')

    expect(jwe).toBeNull()
  })

  it('decryptText round-trips plaintext encrypted by encryptText', async () => {
    const service = await createKeyring(keyUri)

    const jwe = await service.encryptText(keyUri, 'round trip')
    const plaintext = await service.decryptText(keyUri, jwe as string)

    expect(plaintext).toBe('round trip')
  })

  it('getKey returns cached key without calling provider when key is present', async () => {
    const service = await createKeyring(keyUri)
    const provider = { fetchKey: mock(async () => null as string | null) }
    service.setKeyProvider(provider)

    const key = await service.getKey(keyUri)

    expect(key).not.toBeNull()
    expect(provider.fetchKey).not.toHaveBeenCalled()
  })

  it('getKey calls provider and returns key when key is missing', async () => {
    const missingKeyUri = 'kms://kms-aore.wbx2.com/keys/0d7a0dfb-0464-40ce-8f3d-e65a33b61561'
    const serializedKey = await createSerializedKey(missingKeyUri)
    const service = new WebexEncryptionService(new Map())
    const provider = { fetchKey: mock(async () => serializedKey) }
    service.setKeyProvider(provider)

    const key = await service.getKey(missingKeyUri)

    expect(key).not.toBeNull()
    expect(provider.fetchKey).toHaveBeenCalledWith(missingKeyUri)
  })

  it('getKey returns null when provider returns null', async () => {
    const missingKeyUri = 'kms://kms-aore.wbx2.com/keys/13d6256d-f7f1-4b98-8102-4d3d87b2834a'
    const service = new WebexEncryptionService(new Map())
    const provider = { fetchKey: mock(async () => null as string | null) }
    service.setKeyProvider(provider)

    const key = await service.getKey(missingKeyUri)

    expect(key).toBeNull()
    expect(provider.fetchKey).toHaveBeenCalledWith(missingKeyUri)
  })

  it('getKey reuses provider result from raw keys after first fetch', async () => {
    const missingKeyUri = 'kms://kms-aore.wbx2.com/keys/84afb005-5ba5-49c8-bd46-0c5d7ddf1c30'
    const serializedKey = await createSerializedKey(missingKeyUri)
    const service = new WebexEncryptionService(new Map())
    const provider = { fetchKey: mock(async () => serializedKey) }
    service.setKeyProvider(provider)

    await service.getKey(missingKeyUri)
    ;(service as unknown as { keyCache: Map<string, jose.JWK.Key> }).keyCache.clear()
    const key = await service.getKey(missingKeyUri)

    expect(key).not.toBeNull()
    expect(provider.fetchKey).toHaveBeenCalledTimes(1)
  })

  it('encryptBinary produces A256GCM scr material and ciphertext that differs from input', async () => {
    const service = new WebexEncryptionService(new Map())

    const plaintext = new Uint8Array([1, 2, 3, 4, 5])
    const { scr, ciphertext } = service.encryptBinary(plaintext)

    expect(scr.enc).toBe('A256GCM')
    expect(scr.key).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(scr.iv).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(scr.tag).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(Buffer.from(scr.key, 'base64url')).toHaveLength(32)
    expect(Buffer.from(scr.iv, 'base64url')).toHaveLength(12)
    expect(Buffer.from(ciphertext)).not.toEqual(Buffer.from(plaintext))
  })

  it('encryptScr requires loc to be set before encrypting', async () => {
    const service = await createKeyring(keyUri)
    const { scr } = service.encryptBinary(new Uint8Array([9, 9, 9]))

    const result = await service.encryptScr(keyUri, scr)

    expect(result).toBeNull()
  })

  it('encryptScr wraps the scr as a JWE with kid once loc is set', async () => {
    const service = await createKeyring(keyUri)
    const { scr } = service.encryptBinary(new Uint8Array([9, 9, 9]))
    scr.loc = 'https://files.wbx2.com/files/f1'

    const jwe = await service.encryptScr(keyUri, scr)

    expect(jwe).not.toBeNull()
    const header = decodeJweHeader(jwe as string)
    expect(header.alg).toBe('dir')
    expect(header.enc).toBe('A256GCM')
    expect(header.kid).toBe(keyUri)
  })
})
