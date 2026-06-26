import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { getConfigDir } from '../../shared/utils/config-dir'
import { createAccountId, type IMessageAccount, type IMessageConfig } from './types'

export interface ResolvedAccount {
  binary_path: string
  region?: string
}

function coerceConfig(raw: unknown): IMessageConfig {
  if (typeof raw !== 'object' || raw === null) return { current: null, accounts: {} }

  const obj = raw as Record<string, unknown>
  const accounts: Record<string, IMessageAccount> = {}

  if (typeof obj.accounts === 'object' && obj.accounts !== null) {
    for (const value of Object.values(obj.accounts as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) continue
      const a = value as Record<string, unknown>
      if (typeof a.account_id !== 'string' || a.account_id.length === 0) continue
      accounts[a.account_id] = {
        account_id: a.account_id,
        provider: 'imsg',
        label: typeof a.label === 'string' ? a.label : undefined,
        binary_path: typeof a.binary_path === 'string' ? a.binary_path : undefined,
        region: typeof a.region === 'string' ? a.region : undefined,
        created_at: typeof a.created_at === 'string' ? a.created_at : new Date().toISOString(),
        updated_at: typeof a.updated_at === 'string' ? a.updated_at : new Date().toISOString(),
      }
    }
  }

  const current =
    typeof obj.current === 'string' && accounts[obj.current] ? obj.current : (Object.keys(accounts)[0] ?? null)
  return { current, accounts }
}

export class IMessageCredentialManager {
  private configDir: string
  private credentialsPath: string

  constructor(configDir?: string) {
    this.configDir = configDir ?? getConfigDir()
    this.credentialsPath = join(this.configDir, 'imessage-credentials.json')
  }

  async loadConfig(): Promise<IMessageConfig> {
    if (!existsSync(this.credentialsPath)) return { current: null, accounts: {} }
    try {
      return coerceConfig(JSON.parse(await readFile(this.credentialsPath, 'utf-8')))
    } catch {
      return { current: null, accounts: {} }
    }
  }

  async saveConfig(config: IMessageConfig): Promise<void> {
    await mkdir(this.configDir, { recursive: true })
    await writeFile(this.credentialsPath, JSON.stringify(config, null, 2), { mode: 0o600 })
    await chmod(this.credentialsPath, 0o600)
  }

  async getAccount(accountId?: string): Promise<IMessageAccount | null> {
    const config = await this.loadConfig()
    if (!accountId) return config.current ? (config.accounts[config.current] ?? null) : null
    return config.accounts[accountId] ?? config.accounts[createAccountId(accountId)] ?? null
  }

  async listAccounts(): Promise<Array<IMessageAccount & { is_current: boolean }>> {
    const config = await this.loadConfig()
    return Object.values(config.accounts).map((account) => ({
      ...account,
      is_current: account.account_id === config.current,
    }))
  }

  async setAccount(account: IMessageAccount): Promise<void> {
    const config = await this.loadConfig()
    config.accounts[account.account_id] = account
    if (!config.current) config.current = account.account_id
    await this.saveConfig(config)
  }

  async setCurrent(accountId: string): Promise<boolean> {
    const config = await this.loadConfig()
    const account = config.accounts[accountId] ?? config.accounts[createAccountId(accountId)]
    if (!account) return false
    config.current = account.account_id
    await this.saveConfig(config)
    return true
  }

  async removeAccount(accountId: string): Promise<boolean> {
    const config = await this.loadConfig()
    const account = config.accounts[accountId] ?? config.accounts[createAccountId(accountId)]
    if (!account) return false
    delete config.accounts[account.account_id]
    if (config.current === account.account_id) {
      config.current = Object.keys(config.accounts)[0] ?? null
    }
    await this.saveConfig(config)
    return true
  }

  async clearCredentials(): Promise<void> {
    if (existsSync(this.credentialsPath)) await rm(this.credentialsPath, { force: true })
  }

  async resolveAccount(accountId?: string): Promise<ResolvedAccount | null> {
    const envBin = process.env.AGENT_IMESSAGE_BIN
    const envRegion = process.env.AGENT_IMESSAGE_REGION

    const account = await this.getAccount(accountId)
    if (!account && !envBin) return null

    return {
      binary_path: envBin ?? account?.binary_path ?? 'imsg',
      region: envRegion ?? account?.region,
    }
  }
}
