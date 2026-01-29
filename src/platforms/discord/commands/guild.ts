import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

async function listAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()
    const guilds = Object.values(config.guilds)

    const output = guilds.map((guild) => ({
      id: guild.guild_id,
      name: guild.guild_name,
      current: guild.guild_id === config.current_guild,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function infoAction(guildId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const guild = await client.getGuild(guildId)

    const output = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function switchAction(guildId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.guilds[guildId]) {
      console.log(formatOutput({ error: `Guild not found: ${guildId}` }, options.pretty))
      process.exit(1)
    }

    await credManager.setCurrentGuild(guildId)
    console.log(formatOutput({ current: guildId }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function currentAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.current_guild) {
      console.log(
        formatOutput({ error: 'No current guild set. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const guild = config.guilds[config.current_guild]

    if (!guild) {
      console.log(
        formatOutput({ error: 'Current guild not found in configuration.' }, options.pretty)
      )
      process.exit(1)
    }

    const output = {
      guild_id: guild.guild_id,
      guild_name: guild.guild_name,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const guildCommand = new Command('guild')
  .description('Guild management commands')
  .addCommand(
    new Command('list')
      .description('List all guilds')
      .option('--pretty', 'Pretty print JSON output')
      .action(listAction)
  )
  .addCommand(
    new Command('info')
      .description('Get guild info')
      .argument('<guild-id>', 'Guild ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(infoAction)
  )
  .addCommand(
    new Command('switch')
      .description('Switch to guild')
      .argument('<guild-id>', 'Guild ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(switchAction)
  )
  .addCommand(
    new Command('current')
      .description('Show current guild')
      .option('--pretty', 'Pretty print JSON output')
      .action(currentAction)
  )
