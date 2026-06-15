export {}

declare module 'webex-message-handler' {
  import type * as jose from 'node-jose'

  type Logger = Record<string, (...args: unknown[]) => void>
  type HttpRequest = { url: string; method: string; headers: Record<string, string>; body?: string }
  type HttpResponse = { status: number; ok: boolean; json(): Promise<unknown>; text(): Promise<string> }
  type HttpDo = (req: HttpRequest) => Promise<HttpResponse>

  export const noopLogger: Logger
  export const consoleLogger: Logger

  export class DeviceManager {
    constructor(options: { logger: Logger; httpDo: HttpDo })
    register(token: string): Promise<{
      webSocketUrl: string
      deviceUrl: string
      userId: string
      services: unknown
      encryptionServiceUrl: string
    }>
  }

  export class MercurySocket {
    constructor(options: { logger: Logger; wsFactory: (url: string) => unknown })
    on(event: 'kms:response', handler: (data: unknown) => void): void
    connect(webSocketUrl: string, token: string): Promise<void>
    disconnect(): Promise<void>
  }

  export class KmsClient {
    constructor(options: {
      token: string
      deviceUrl: string
      userId: string
      encryptionServiceUrl: string
      logger: Logger
      httpDo: HttpDo
    })
    initialize(): Promise<void>
    getKey(keyUri: string): Promise<jose.JWK.Key | null>
    handleKmsMessage(data: unknown): void
  }
}
