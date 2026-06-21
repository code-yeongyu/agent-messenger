import { formatOutput } from '@/shared/utils/output'

import { WebexBotClient } from '../client'
import { WebexBotCredentialManager } from '../credential-manager'

export interface BotOption {
  bot?: string
  pretty?: boolean
  _credManager?: WebexBotCredentialManager
}

export async function getClient(options: BotOption): Promise<WebexBotClient> {
  const credManager = options._credManager ?? new WebexBotCredentialManager()
  const creds = await credManager.getCredentials(options.bot)

  if (!creds) {
    console.log(formatOutput({ error: 'No credentials. Run "auth set <token>" first.' }, options.pretty))
    process.exit(1)
  }

  return new WebexBotClient().login({ token: creds.token })
}
