import { Command } from 'commander'

import { formatOutput } from '@/shared/utils/output'

import { IMessageCredentialManager } from '../credential-manager'
import { createAccountId } from '../types'
import { runDoctor } from './doctor'

const CHECKLIST = `iMessage runs on THIS Mac through the "imsg" tool. One-time setup:
  1. Install imsg:  brew install steipete/tap/imsg
  2. Sign Messages.app into your Apple ID (a dedicated Apple ID is recommended).
  3. Grant Full Disk Access to the app/terminal that launches agent-messenger
     (System Settings > Privacy & Security > Full Disk Access). macOS grants to the parent process.
  4. Grant Automation > Messages when first prompted (needed to send).

Basic send / read / watch / standard tapbacks need NO SIP changes.
Typing, edit/unsend, group management need "imsg launch" (SIP disabled) — a later tier.`

export async function performSetup(options: {
  bin?: string
  region?: string
  manager?: IMessageCredentialManager
}): Promise<{ ok: boolean; report: Awaited<ReturnType<typeof runDoctor>>; account_id?: string }> {
  const report = await runDoctor({ bin: options.bin, region: options.region })
  if (!report.ok) {
    return { ok: false, report }
  }

  const manager = options.manager ?? new IMessageCredentialManager()
  const now = new Date().toISOString()
  const accountId = createAccountId(options.bin ?? 'default')
  await manager.setAccount({
    account_id: accountId,
    provider: 'imsg',
    binary_path: options.bin,
    region: options.region,
    created_at: now,
    updated_at: now,
  })
  await manager.setCurrent(accountId)

  return { ok: true, report, account_id: accountId }
}

async function runSetup(options: { bin?: string; region?: string; pretty?: boolean }): Promise<void> {
  console.error(CHECKLIST)
  console.error('')

  const result = await performSetup({ bin: options.bin, region: options.region })
  if (!result.ok) {
    console.log(formatOutput(result.report, options.pretty))
    process.exit(1)
  }

  console.log(
    formatOutput(
      {
        success: true,
        account_id: result.account_id,
        imsg_version: result.report.imsg_version,
        full_disk_access: result.report.full_disk_access,
      },
      options.pretty,
    ),
  )
  process.exit(0)
}

export const setupCommand = new Command('setup')
  .description('Guided setup: verify imsg + permissions and save an account')
  .option('--bin <path>', 'Path to the imsg binary (default: imsg on PATH)')
  .option('--region <code>', 'Default region for local-format phone numbers')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (opts: { bin?: string; region?: string; pretty?: boolean }) => runSetup(opts))

export { runSetup }
