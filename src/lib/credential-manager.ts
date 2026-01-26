import type { Config, WorkspaceCredentials } from '../types'

export class CredentialManager {
  async load(): Promise<Config> {
    throw new Error('Not implemented')
  }

  async save(config: Config): Promise<void> {
    throw new Error('Not implemented')
  }

  async getWorkspace(id?: string): Promise<WorkspaceCredentials | null> {
    throw new Error('Not implemented')
  }

  async setWorkspace(creds: WorkspaceCredentials): Promise<void> {
    throw new Error('Not implemented')
  }

  async removeWorkspace(id: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async setCurrentWorkspace(id: string): Promise<void> {
    throw new Error('Not implemented')
  }
}
