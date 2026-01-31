#!/usr/bin/env bun

import { Command } from 'commander'
import pkg from '../../../package.json'
import {
  authCommand,
  channelCommand,
  dmCommand,
  fileCommand,
  friendCommand,
  guildCommand,
  memberCommand,
  mentionCommand,
  messageCommand,
  noteCommand,
  profileCommand,
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
program.addCommand(dmCommand)
program.addCommand(fileCommand)
program.addCommand(friendCommand)
program.addCommand(memberCommand)
program.addCommand(mentionCommand)
program.addCommand(messageCommand)
program.addCommand(noteCommand)
program.addCommand(profileCommand)
program.addCommand(reactionCommand)
program.addCommand(snapshotCommand)
program.addCommand(userCommand)

program.parse(process.argv)

export default program
