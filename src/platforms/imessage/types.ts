export type IMessageProvider = 'imsg'

export interface IMessageAccount {
  account_id: string
  provider: IMessageProvider
  label?: string
  binary_path?: string
  region?: string
  created_at: string
  updated_at: string
}

export interface IMessageConfig {
  current: string | null
  accounts: Record<string, IMessageAccount>
}

export interface IMessageChatSummary {
  id: number
  guid: string | null
  identifier: string | null
  name: string
  service: string
  is_group: boolean
  participants: string[]
  last_message?: IMessageMessageSummary
}

export interface IMessageMessageSummary {
  id: number
  guid: string
  chat_id: number
  from: string
  from_name?: string
  is_outgoing: boolean
  timestamp: string
  text?: string
}

export interface IMessageStatus {
  imsg_version: string | null
  binary_path: string
  full_disk_access: boolean
  automation: 'ok' | 'unknown' | 'denied'
  bridge_available: boolean
}

export type IMessageErrorCode =
  | 'imsg_not_found'
  | 'full_disk_access'
  | 'automation_denied'
  | 'rpc_error'
  | 'send_failed'
  | 'not_authenticated'
  | 'invalid_limit'
  | 'chat_not_found'
  | 'private_api_required'
  | 'imessage_error'

export class IMessageError extends Error {
  code: IMessageErrorCode
  suggestion?: string
  doctorCommand?: string

  constructor(
    message: string,
    code: IMessageErrorCode = 'imessage_error',
    extra?: { suggestion?: string; doctorCommand?: string },
  ) {
    super(message)
    this.name = 'IMessageError'
    this.code = code
    this.suggestion = extra?.suggestion
    this.doctorCommand = extra?.doctorCommand
  }

  toJSON(): { error: string; code: IMessageErrorCode; suggestion?: string; doctorCommand?: string } {
    return {
      error: this.message,
      code: this.code,
      ...(this.suggestion ? { suggestion: this.suggestion } : {}),
      ...(this.doctorCommand ? { doctorCommand: this.doctorCommand } : {}),
    }
  }
}

export function createAccountId(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'default'
}
