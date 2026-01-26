import type { Config, WorkspaceCredentials } from '../types'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

export class CredentialManager {
  private configDir: string
  private credentialsPath: string

  constructor(configDir?: string) {
    this.configDir = configDir ?? join(homedir(), '.config', 'agent-slack')
    this.credentialsPath = join(this.configDir, 'credentials.json')
  }

  async load(): Promise<Config> {
    if (!existsSync(this.credentialsPath)) {
      return {
        current_workspace: null,
        workspaces: {},
      }
    }

    const file = Bun.file(this.credentialsPath)
    const content = await file.text()
    return JSON.parse(content) as Config
  }

  async save(config: Config): Promise<void> {
    await mkdir(this.configDir, { recursive: true })

    const file = Bun.file(this.credentialsPath)
    await Bun.write(file, JSON.stringify(config, null, 2))

    await Bun.spawn(['chmod', '0600', this.credentialsPath]).exited
  }

  async getWorkspace(id?: string): Promise<WorkspaceCredentials | null> {
    const config = await this.load()

    if (id) {
      return config.workspaces[id] ?? null
    }

    if (!config.current_workspace) {
      return null
    }

    return config.workspaces[config.current_workspace] ?? null
  }

  async setWorkspace(creds: WorkspaceCredentials): Promise<void> {
    const config = await this.load()
    config.workspaces[creds.workspace_id] = creds
    await this.save(config)
  }

  async removeWorkspace(id: string): Promise<void> {
    const config = await this.load()
    delete config.workspaces[id]

    if (config.current_workspace === id) {
      config.current_workspace = null
    }

    await this.save(config)
  }

  async setCurrentWorkspace(id: string): Promise<void> {
    const config = await this.load()
    config.current_workspace = id
    await this.save(config)
  }
}
