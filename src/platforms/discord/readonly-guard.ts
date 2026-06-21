import { DiscordCredentialManager, type DiscordConfig } from './credential-manager'

export class DiscordReadonlyError extends Error {
  readonly code = 'DISCORD_READONLY_ACCOUNT' as const

  constructor(operation: string) {
    super(`discord account is readonly; blocked ${operation} before Discord API request`)
    this.name = 'DiscordReadonlyError'
  }
}

export function assertDiscordWritable(
  config: DiscordConfig,
  operation: string,
  credManager = new DiscordCredentialManager(),
): void {
  if (credManager.isReadonly(config)) {
    throw new DiscordReadonlyError(operation)
  }
}
