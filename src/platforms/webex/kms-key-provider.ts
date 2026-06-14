import WebSocket from 'ws'
import { DeviceManager, KmsClient, MercurySocket, noopLogger } from 'webex-message-handler'

interface KmsKeyProviderOptions {
  token: string
  logger?: { debug(message: string): void }
}

interface Registration {
  webSocketUrl: string
  deviceUrl: string
  userId: string
  encryptionServiceUrl: string
}

type HttpRequest = {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export class KmsKeyProvider {
  private token: string
  private logger?: { debug(message: string): void }
  private mercury: MercurySocket | null = null
  private kms: KmsClient | null = null
  private readyPromise: Promise<void> | null = null

  constructor(options: KmsKeyProviderOptions) {
    this.token = options.token
    this.logger = options.logger
  }

  async fetchKey(keyUri: string): Promise<string | null> {
    try {
      await this.ensureReady()
      const key = await this.kms?.getKey(keyUri)
      if (!key) return null
      return JSON.stringify({ uri: keyUri, jwk: key.toJSON(true) })
    } catch (error) {
      this.logger?.debug(`Webex KMS key fetch failed: ${error instanceof Error ? error.message : String(error)}`)
      await this.close()
      this.readyPromise = null
      return null
    }
  }

  async close(): Promise<void> {
    await this.mercury?.disconnect().catch(() => undefined)
    this.mercury = null
    this.kms = null
    this.readyPromise = null
  }

  private async ensureReady(): Promise<void> {
    this.readyPromise ??= this.initialize()
    await this.readyPromise
  }

  private async initialize(): Promise<void> {
    const httpDo = async (req: HttpRequest) => {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      })
      return {
        status: res.status,
        ok: res.ok,
        json: () => res.json(),
        text: () => res.text(),
      }
    }
    const wsFactory = (url: string) => new WebSocket(url) as never
    const dm = new DeviceManager({ logger: noopLogger, httpDo })
    const reg = await dm.register(this.token) as Registration
    const mercury = new MercurySocket({ logger: noopLogger, wsFactory })
    const kms = new KmsClient({
      token: this.token,
      deviceUrl: reg.deviceUrl,
      userId: reg.userId,
      encryptionServiceUrl: reg.encryptionServiceUrl,
      logger: noopLogger,
      httpDo,
    })
    mercury.on('kms:response', (data: unknown) => kms.handleKmsMessage(data))
    await mercury.connect(reg.webSocketUrl, this.token)
    await kms.initialize()
    this.mercury = mercury
    this.kms = kms
  }
}
