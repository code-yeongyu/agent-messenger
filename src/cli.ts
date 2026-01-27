#!/usr/bin/env node

import { Command } from 'commander'
import {
  authCommand,
  channelCommand,
  fileCommand,
  messageCommand,
  reactionCommand,
  snapshotCommand,
  userCommand,
  workspaceCommand,
} from './commands/index'

const program = new Command()

program
  .name('agent-slack')
  .description('CLI tool for Slack communication with token extraction from Slack desktop app')
  .version('0.1.0')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--workspace <id>', 'Use specific workspace')

program.addCommand(authCommand)
program.addCommand(workspaceCommand)
program.addCommand(messageCommand)
program.addCommand(channelCommand)
program.addCommand(userCommand)
program.addCommand(reactionCommand)
program.addCommand(fileCommand)
program.addCommand(snapshotCommand)

program.parse(process.argv)

export default program
