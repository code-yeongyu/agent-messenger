import { Command } from 'commander'

import { formatOutput } from '@/shared/utils/output'

import { ImsgClient } from '../client'
import { IMessageCredentialManager } from '../credential-manager'
import { IMessageError } from '../types'

export interface DoctorReport {
  ok: boolean
  imsg: 'found' | 'missing'
  imsg_version?: string | null
  binary_path: string
  full_disk_access: 'ok' | 'denied' | 'unknown'
  automation: string
  bridge: 'enabled' | 'disabled'
  test_chat?: string
  warnings: string[]
  error?: string
  code?: string
  suggestion?: string
}

export async function runDoctor(options: {
  account?: string
  bin?: string
  region?: string
  testChat?: number
  client?: ImsgClient
}): Promise<DoctorReport> {
  const resolved = await new IMessageCredentialManager().resolveAccount(options.account)
  const binaryPath = options.bin ?? resolved?.binary_path ?? process.env.AGENT_IMESSAGE_BIN ?? 'imsg'
  const region = options.region ?? resolved?.region

  const client = options.client ?? new ImsgClient()
  await client.login({ binaryPath, region })

  const warnings: string[] = []

  let version: string | null = null
  let versionError: IMessageError | undefined
  try {
    version = await client.getVersion()
  } catch (error) {
    versionError = error as IMessageError
  }

  if (version === null) {
    const code = versionError?.code ?? 'imsg_not_found'
    return {
      ok: false,
      imsg: 'missing',
      binary_path: binaryPath,
      full_disk_access: 'unknown',
      automation: 'unknown',
      bridge: 'disabled',
      warnings,
      error: versionError?.message ?? `Could not run "${binaryPath} --version".`,
      code,
      suggestion:
        versionError?.suggestion ??
        (code === 'imsg_not_found' ? 'Install imsg: "brew install steipete/tap/imsg".' : undefined),
    }
  }

  let connectError: IMessageError | undefined
  try {
    await client.connect()
  } catch (error) {
    connectError = error as IMessageError
  }

  if (connectError) {
    await client.close()
    const isFda = connectError.code === 'full_disk_access'
    return {
      ok: false,
      imsg: 'found',
      imsg_version: version,
      binary_path: binaryPath,
      full_disk_access: isFda ? 'denied' : 'unknown',
      automation: 'unknown',
      bridge: 'disabled',
      warnings,
      error: connectError.message,
      code: connectError.code,
      suggestion:
        connectError.suggestion ??
        (isFda
          ? 'Grant Full Disk Access to the app/terminal launching agent-messenger (System Settings → Privacy & Security → Full Disk Access). macOS grants to the parent process.'
          : undefined),
    }
  }

  warnings.push(
    'Automation (Messages) is verified on first send. If sends fail, grant Privacy → Automation → Messages.',
  )
  warnings.push(
    'Private API bridge disabled — send/read/watch/standard tapbacks work; typing/edit/group mgmt need "imsg launch" (SIP off).',
  )

  let testChatResult: string | undefined
  if (options.testChat !== undefined) {
    try {
      await client.sendMessage({ chatId: options.testChat }, 'agent-imessage doctor test message')
      testChatResult = 'sent'
    } catch (error) {
      testChatResult = `failed: ${(error as Error).message}`
    }
  }

  await client.close()

  return {
    ok: true,
    imsg: 'found',
    imsg_version: version,
    binary_path: binaryPath,
    full_disk_access: 'ok',
    automation: 'unknown',
    bridge: 'disabled',
    test_chat: testChatResult,
    warnings,
  }
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose imsg availability and macOS permissions')
  .option('--account <id>', 'Check a specific account (default: current)')
  .option('--bin <path>', 'Check a specific imsg binary path')
  .option('--region <code>', 'Default region for local-format phone numbers')
  .option('--test-chat <chatId>', 'Send a test message to this chat id')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (opts: { account?: string; bin?: string; region?: string; testChat?: string; pretty?: boolean }) => {
    const testChat = opts.testChat && /^\d+$/.test(opts.testChat) ? Number.parseInt(opts.testChat, 10) : undefined
    const report = await runDoctor({ account: opts.account, bin: opts.bin, region: opts.region, testChat })
    console.log(formatOutput(report, opts.pretty))
    process.exit(report.ok ? 0 : 1)
  })
