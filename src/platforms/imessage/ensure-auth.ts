import { formatOutput } from '@/shared/utils/output'

import { IMessageCredentialManager } from './credential-manager'

export async function ensureIMessageAuth(): Promise<void> {
  const resolved = await new IMessageCredentialManager().resolveAccount()

  if (!resolved) {
    console.log(
      formatOutput({
        error:
          'Not configured. iMessage runs on this Mac via the "imsg" tool. Run "agent-imessage setup" for a guided walkthrough, or "agent-imessage doctor" to check requirements.',
        code: 'not_authenticated',
      }),
    )
    process.exit(1)
  }
}
