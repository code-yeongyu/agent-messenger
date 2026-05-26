import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'
import { formatOutput } from '@/shared/utils/output'

import { TelegramBotClient } from '../client'
import { TelegramBotCredentialManager } from '../credential-manager'
import type { ClientFactory } from './shared'

interface ActionOptions {
  pretty?: boolean
  bot?: string
  _credManager?: TelegramBotCredentialManager
  _clientFactory?: ClientFactory
}

interface ActionResult {
  success?: boolean
  error?: string
  bot_id?: string
  bot_name?: string
  username?: string
  valid?: boolean
  bots?: Array<{
    bot_id: string
    bot_name: string
    is_current: boolean
  }>
}

export async function setAction(token: string, options: ActionOptions): Promise<ActionResult> {
  try {
    const client = options._clientFactory ? options._clientFactory() : new TelegramBotClient()
    await client.login({ token })
    const me = await client.getMe()

    if (!me.is_bot) {
      return { error: 'Token does not belong to a bot account.' }
    }

    const botId = options.bot || me.username || String(me.id)
    const botName = me.username ?? me.first_name

    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    await credManager.setCredentials({
      token,
      bot_id: botId,
      bot_name: botName,
    })

    return {
      success: true,
      bot_id: botId,
      bot_name: botName,
      username: me.username,
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function clearAction(options: ActionOptions): Promise<ActionResult> {
  try {
    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    await credManager.clearCredentials()
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function statusAction(options: ActionOptions): Promise<ActionResult> {
  try {
    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    const creds = await credManager.getCredentials(options.bot)

    if (!creds) {
      return {
        valid: false,
        error: options.bot
          ? `Bot "${options.bot}" not found. Run "auth list" to see available bots.`
          : 'No credentials configured. Run "auth set <token>" first.',
      }
    }

    let valid = false
    let botName = creds.bot_name
    let username: string | undefined

    try {
      const client = options._clientFactory ? options._clientFactory() : new TelegramBotClient()
      await client.login({ token: creds.token })
      const me = await client.getMe()
      valid = me.is_bot === true
      botName = me.username ?? me.first_name
      username = me.username
    } catch {
      valid = false
    }

    return {
      valid,
      bot_id: creds.bot_id,
      bot_name: botName,
      username,
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function listAction(options: ActionOptions): Promise<ActionResult> {
  try {
    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    const all = await credManager.listAll()

    return {
      bots: all.map((b) => ({
        bot_id: b.bot_id,
        bot_name: b.bot_name,
        is_current: b.is_current,
      })),
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function useAction(botId: string, options: ActionOptions): Promise<ActionResult> {
  try {
    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    const found = await credManager.setCurrent(botId)

    if (!found) {
      return { error: `Bot "${botId}" not found. Run "auth list" to see available bots.` }
    }

    const creds = await credManager.getCredentials()
    return {
      success: true,
      bot_id: creds?.bot_id,
      bot_name: creds?.bot_name,
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export async function removeAction(botId: string, options: ActionOptions): Promise<ActionResult> {
  try {
    const credManager = options._credManager ?? new TelegramBotCredentialManager()
    const removed = await credManager.removeBot(botId)

    if (!removed) {
      return { error: `Bot "${botId}" not found. Run "auth list" to see available bots.` }
    }

    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

export const authCommand = new Command('auth')
  .description('Bot authentication commands')
  .addCommand(
    new Command('set')
      .description('Set bot token (validates against Telegram API)')
      .argument('<token>', 'Bot token from @BotFather')
      .option('--bot <id>', 'Bot identifier for switching later')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (token: string, opts: { bot?: string; pretty?: boolean }) => {
        cliOutput(await setAction(token, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('clear')
      .description('Clear all stored credentials')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: { pretty?: boolean }) => {
        cliOutput(await clearAction(opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('status')
      .description('Show authentication status')
      .option('--bot <id>', 'Check specific bot (default: current)')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: { bot?: string; pretty?: boolean }) => {
        const result = await statusAction(opts)
        console.log(formatOutput(result, opts.pretty))
        if (!result.valid) process.exit(1)
      }),
  )
  .addCommand(
    new Command('list')
      .description('List all stored bots')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (opts: { pretty?: boolean }) => {
        cliOutput(await listAction(opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('use')
      .description('Switch active bot')
      .argument('<bot>', 'Bot ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (botId: string, opts: { pretty?: boolean }) => {
        cliOutput(await useAction(botId, opts), opts.pretty)
      }),
  )
  .addCommand(
    new Command('remove')
      .description('Remove a stored bot')
      .argument('<bot>', 'Bot ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (botId: string, opts: { pretty?: boolean }) => {
        cliOutput(await removeAction(botId, opts), opts.pretty)
      }),
  )
