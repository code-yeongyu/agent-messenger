import { formatOutput } from '@/shared/utils/output'

import { TelegramBotClient } from '../client'
import { TelegramBotCredentialManager } from '../credential-manager'

export interface BotOption {
  bot?: string
  pretty?: boolean
  _credManager?: TelegramBotCredentialManager
}

export async function getClient(options: BotOption): Promise<TelegramBotClient> {
  const credManager = options._credManager ?? new TelegramBotCredentialManager()
  const creds = await credManager.getCredentials(options.bot)

  if (!creds) {
    console.log(formatOutput({ error: 'No credentials. Run "auth set <token>" first.' }, options.pretty))
    process.exit(1)
  }

  return new TelegramBotClient().login({ token: creds.token })
}

export function parseChatId(chat: string): number | string {
  if (/^-?\d+$/.test(chat)) return Number(chat)
  if (chat.startsWith('@')) return chat
  return `@${chat}`
}
