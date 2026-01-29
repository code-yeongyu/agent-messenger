#!/usr/bin/env bun

import { Command } from 'commander'
import { authCommand, channelCommand, guildCommand, messageCommand } from './commands'

const program = new Command()

program
  .name('agent-discord')
  .description('CLI tool for Discord communication')
  .version('0.1.0')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--guild <id>', 'Use specific guild')

program.addCommand(authCommand)
program.addCommand(guildCommand)
program.addCommand(channelCommand)
program.addCommand(messageCommand)

program.parse(process.argv)

export default program
