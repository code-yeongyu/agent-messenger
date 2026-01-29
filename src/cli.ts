#!/usr/bin/env bun

import { Command } from 'commander'

const program = new Command()

program
  .name('agent-messenger')
  .description('Umbrella CLI for multi-platform messaging')
  .version('0.1.0')

// Placeholder for umbrella CLI
// Platform-specific CLIs will be added as subcommands in Task 2

program.parse(process.argv)

export default program
