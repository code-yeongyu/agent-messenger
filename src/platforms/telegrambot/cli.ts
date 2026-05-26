#!/usr/bin/env bun

import { Command } from 'commander'

import pkg from '../../../package.json' with { type: 'json' }
import { authCommand, chatCommand, messageCommand, reactionCommand, whoamiCommand } from './commands/index'

const program = new Command()

program
  .name('agent-telegrambot')
  .description('CLI tool for Telegram bot integration using bot tokens')
  .version(pkg.version)
  .option('--pretty', 'Pretty-print JSON output')
  .option('--bot <id>', 'Bot ID to use')
  .hook('preAction', (thisCmd, actionCmd) => {
    for (const [key, value] of Object.entries(thisCmd.opts())) {
      if (value === undefined) continue
      const source = actionCmd.getOptionValueSource(key)
      if (source === undefined || source === 'default') {
        actionCmd.setOptionValue(key, value)
      }
    }
  })

program.addCommand(authCommand)
program.addCommand(whoamiCommand)
program.addCommand(messageCommand)
program.addCommand(chatCommand)
program.addCommand(reactionCommand)

program.parseAsync(process.argv)

export default program
