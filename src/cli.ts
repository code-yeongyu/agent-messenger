#!/usr/bin/env bun

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const program = new Command()

program
  .name('agent-messenger')
  .description('Multi-platform messaging CLI for AI agents')
  .version('0.1.0')

// Use absolute paths for CWD-independence
program.command('slack', 'Interact with Slack workspaces', {
  executableFile: join(__dirname, 'platforms', 'slack', 'cli.ts'),
})

program.command('discord', 'Interact with Discord guilds', {
  executableFile: join(__dirname, 'platforms', 'discord', 'cli.ts'),
})

program.parse(process.argv)

export default program
