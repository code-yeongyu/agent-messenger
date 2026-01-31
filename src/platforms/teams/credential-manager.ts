import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { TeamsConfig } from './types'

export class TeamsCredentialManager {
  private configDir: string
  private credentialsPath: string

  constructor(configDir?: string) {
    this.configDir = configDir ?? join(homedir(), '.config', 'agent-messenger')
    this.credentialsPath = join(this.configDir, 'teams-credentials.json')
  }

  async loadConfig(): Promise<TeamsConfig | null> {
    if (!existsSync(this.credentialsPath)) {
      return null
    }

    try {
      const content = await readFile(this.credentialsPath, 'utf-8')
      return JSON.parse(content) as TeamsConfig
    } catch {
      return null
    }
  }

  async saveConfig(config: TeamsConfig): Promise<void> {
    await mkdir(this.configDir, { recursive: true })
    await writeFile(this.credentialsPath, JSON.stringify(config, null, 2), { mode: 0o600 })
  }

  async getToken(): Promise<string | null> {
    const config = await this.loadConfig()
    return config?.token ?? null
  }

  async setToken(token: string, expiresAt?: string): Promise<void> {
    let config = await this.loadConfig()
    if (!config) {
      config = {
        token,
        current_team: null,
        teams: {},
      }
    }
    config.token = token
    if (expiresAt !== undefined) {
      config.token_expires_at = expiresAt
    }
    await this.saveConfig(config)
  }

  async getCurrentTeam(): Promise<{ team_id: string; team_name: string } | null> {
    const config = await this.loadConfig()
    if (!config?.current_team) {
      return null
    }
    return config.teams[config.current_team] ?? null
  }

  async setCurrentTeam(teamId: string, teamName: string): Promise<void> {
    let config = await this.loadConfig()
    if (!config) {
      config = {
        token: '',
        current_team: null,
        teams: {},
      }
    }
    config.current_team = teamId
    config.teams[teamId] = { team_id: teamId, team_name: teamName }
    await this.saveConfig(config)
  }

  async clearCredentials(): Promise<void> {
    if (existsSync(this.credentialsPath)) {
      await rm(this.credentialsPath)
    }
  }

  async isTokenExpired(): Promise<boolean> {
    const config = await this.loadConfig()
    if (!config?.token_expires_at) {
      return true
    }

    const expiresAt = new Date(config.token_expires_at)
    return expiresAt.getTime() <= Date.now()
  }
}
