#!/usr/bin/env bun

import { Command } from 'commander'
import pkg from '../../../package.json'
import {
  authCommand,
  channelCommand,
  fileCommand,
  guildCommand,
  messageCommand,
  reactionCommand,
  snapshotCommand,
  userCommand,
} from './commands'

const program = new Command()

program
  .name('agent-discord')
  .description('CLI tool for Discord communication')
  .version(pkg.version)
  .option('--pretty', 'Pretty-print JSON output')
  .option('--guild <id>', 'Use specific guild')

program.addCommand(authCommand)
program.addCommand(guildCommand)
program.addCommand(channelCommand)
program.addCommand(fileCommand)
program.addCommand(messageCommand)
program.addCommand(reactionCommand)
program.addCommand(snapshotCommand)
program.addCommand(userCommand)

program.parse(process.argv)

export default program
