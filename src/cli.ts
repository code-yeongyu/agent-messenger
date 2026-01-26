#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

program
  .name('agent-slack')
  .description('CLI tool for Slack communication with token extraction from Slack desktop app')
  .version('0.1.0')

program.parse(process.argv)

export default program
