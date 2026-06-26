import { IMessageError, type IMessageErrorCode } from './types'

const FULL_DISK_ACCESS = /full disk access|cannot access messages database|unable to open database/i
const AUTOMATION_DENIED = /automation|not authorized|not allowed to send/i
const APPLESCRIPT_SEND = /unjoined empty outgoing row|delivery to the target chat was not confirmed|applescript/i

export function classifyImsgFailure(text: string, fallback: IMessageErrorCode = 'rpc_error'): IMessageError {
  if (FULL_DISK_ACCESS.test(text)) {
    return new IMessageError('imsg cannot read the Messages database.', 'full_disk_access', {
      suggestion:
        'Grant Full Disk Access to the app/terminal that launches agent-messenger (System Settings → Privacy & Security → Full Disk Access).',
      doctorCommand: 'agent-imessage doctor',
    })
  }
  if (AUTOMATION_DENIED.test(text)) {
    return new IMessageError('imsg is not allowed to control Messages.app.', 'automation_denied', {
      suggestion: 'Grant Automation → Messages in System Settings → Privacy & Security.',
      doctorCommand: 'agent-imessage doctor',
    })
  }
  if (APPLESCRIPT_SEND.test(text)) {
    return new IMessageError(text || 'imsg could not send the message.', 'send_failed', {
      doctorCommand: 'agent-imessage doctor',
    })
  }
  return new IMessageError(text || 'imsg request failed.', fallback, { doctorCommand: 'agent-imessage doctor' })
}
