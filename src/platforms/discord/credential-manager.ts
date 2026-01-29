import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface DiscordConfig {
  token: string | null
  current_guild: string | null
  guilds: Record<string, { guild_id: string; guild_name: string }>
}

export class DiscordCredentialManager {
  private configDir: string
  private credentialsPath: string

  constructor(configDir?: string) {
    this.configDir = configDir ?? join(homedir(), '.config', 'agent-messenger')
    this.credentialsPath = join(this.configDir, 'discord-credentials.json')
  }

  async load(): Promise<DiscordConfig> {
    if (!existsSync(this.credentialsPath)) {
      return {
        token: null,
        current_guild: null,
        guilds: {},
      }
    }

    const file = Bun.file(this.credentialsPath)
    const content = await file.text()
    return JSON.parse(content) as DiscordConfig
  }

  async save(config: DiscordConfig): Promise<void> {
    await mkdir(this.configDir, { recursive: true })

    const file = Bun.file(this.credentialsPath)
    await Bun.write(file, JSON.stringify(config, null, 2))

    await Bun.spawn(['chmod', '0600', this.credentialsPath]).exited
  }

  async getToken(): Promise<string | null> {
    const config = await this.load()
    return config.token
  }

  async setToken(token: string): Promise<void> {
    const config = await this.load()
    config.token = token
    await this.save(config)
  }

  async clearToken(): Promise<void> {
    const config = await this.load()
    config.token = null
    await this.save(config)
  }

  async getCurrentGuild(): Promise<string | null> {
    const config = await this.load()
    return config.current_guild
  }

  async setCurrentGuild(guildId: string): Promise<void> {
    const config = await this.load()
    config.current_guild = guildId
    await this.save(config)
  }

  async getGuilds(): Promise<Record<string, { guild_id: string; guild_name: string }>> {
    const config = await this.load()
    return config.guilds
  }

  async setGuilds(guilds: Record<string, { guild_id: string; guild_name: string }>): Promise<void> {
    const config = await this.load()
    config.guilds = guilds
    await this.save(config)
  }

  async getCredentials(): Promise<{ token: string; guildId: string } | null> {
    const config = await this.load()

    if (!config.token || !config.current_guild) {
      return null
    }

    return {
      token: config.token,
      guildId: config.current_guild,
    }
  }
}
