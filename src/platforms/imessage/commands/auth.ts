import { Command } from 'commander'

import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { IMessageCredentialManager } from '../credential-manager'
import { createAccountId } from '../types'

async function guard(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    handleError(error as Error)
  }
}

interface SetOptions {
  bin?: string
  region?: string
  account?: string
  label?: string
  current?: boolean
  pretty?: boolean
  _manager?: IMessageCredentialManager
}

async function runSet(options: SetOptions): Promise<void> {
  const manager = options._manager ?? new IMessageCredentialManager()
  const now = new Date().toISOString()
  const accountId = createAccountId(options.account ?? options.label ?? options.bin ?? 'default')

  await manager.setAccount({
    account_id: accountId,
    provider: 'imsg',
    label: options.label,
    binary_path: options.bin,
    region: options.region,
    created_at: now,
    updated_at: now,
  })
  if (options.current) await manager.setCurrent(accountId)

  console.log(
    formatOutput({ success: true, account_id: accountId, binary_path: options.bin ?? 'imsg' }, options.pretty),
  )
  process.exit(0)
}

async function runList(options: { pretty?: boolean; _manager?: IMessageCredentialManager }): Promise<void> {
  const manager = options._manager ?? new IMessageCredentialManager()
  const accounts = await manager.listAccounts()
  console.log(
    formatOutput(
      accounts.map((a) => ({
        account_id: a.account_id,
        label: a.label,
        binary_path: a.binary_path ?? 'imsg',
        region: a.region,
        is_current: a.is_current,
      })),
      options.pretty,
    ),
  )
  process.exit(0)
}

async function runUse(
  accountId: string,
  options: { pretty?: boolean; _manager?: IMessageCredentialManager },
): Promise<void> {
  const manager = options._manager ?? new IMessageCredentialManager()
  const found = await manager.setCurrent(accountId)
  if (!found) {
    console.log(formatOutput({ error: `Account "${accountId}" not found. Run "auth list".` }, options.pretty))
    process.exit(1)
  }
  console.log(formatOutput({ success: true, account_id: createAccountId(accountId) }, options.pretty))
  process.exit(0)
}

async function runRemove(
  accountId: string,
  options: { pretty?: boolean; _manager?: IMessageCredentialManager },
): Promise<void> {
  const manager = options._manager ?? new IMessageCredentialManager()
  const removed = await manager.removeAccount(accountId)
  if (!removed) {
    console.log(formatOutput({ error: `Account "${accountId}" not found. Run "auth list".` }, options.pretty))
    process.exit(1)
  }
  console.log(formatOutput({ success: true }, options.pretty))
  process.exit(0)
}

async function runLogout(options: { pretty?: boolean; _manager?: IMessageCredentialManager }): Promise<void> {
  const manager = options._manager ?? new IMessageCredentialManager()
  await manager.clearCredentials()
  console.log(formatOutput({ success: true }, options.pretty))
  process.exit(0)
}

export const authCommand = new Command('auth')
  .description('Account configuration commands')
  .addCommand(
    new Command('set')
      .description('Configure an iMessage account (imsg binary path / region)')
      .option('--bin <path>', 'Path to the imsg binary (default: imsg on PATH)')
      .option('--region <code>', 'Default region for local-format phone numbers (e.g. US)')
      .option('--account <id>', 'Account id/alias')
      .option('--label <label>', 'Human-friendly label')
      .option('--current', 'Set as the active account')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: SetOptions) => guard(() => runSet(opts))),
  )
  .addCommand(
    new Command('list')
      .description('List configured accounts')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: { pretty?: boolean }) => guard(() => runList(opts))),
  )
  .addCommand(
    new Command('use')
      .description('Switch the active account')
      .argument('<account-id>', 'Account id')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (accountId: string, opts: { pretty?: boolean }) => guard(() => runUse(accountId, opts))),
  )
  .addCommand(
    new Command('remove')
      .description('Remove a configured account')
      .argument('<account-id>', 'Account id')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (accountId: string, opts: { pretty?: boolean }) => guard(() => runRemove(accountId, opts))),
  )
  .addCommand(
    new Command('logout')
      .description('Clear all stored accounts')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: { pretty?: boolean }) => guard(() => runLogout(opts))),
  )

export { runSet, runList, runUse, runRemove, runLogout }
