#!/usr/bin/env bun

import { Command } from 'commander'

import pkg from '../../../package.json' with { type: 'json' }
import {
  authCommand,
  fileCommand,
  listenCommand,
  memberCommand,
  messageCommand,
  snapshotCommand,
  spaceCommand,
  userCommand,
  whoamiCommand,
} from './commands/index'

const program = new Command()

program
  .name('agent-webexbot')
  .description('CLI tool for Webex bot integration using bot tokens')
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
program.addCommand(spaceCommand)
program.addCommand(memberCommand)
program.addCommand(userCommand)
program.addCommand(fileCommand)
program.addCommand(snapshotCommand)
program.addCommand(listenCommand)

program.parseAsync(process.argv)

export default program
