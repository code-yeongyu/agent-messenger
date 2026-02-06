import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export class TeamsCredentialManager {
    configDir;
    credentialsPath;
    constructor(configDir) {
        this.configDir = configDir ?? join(homedir(), '.config', 'agent-messenger');
        this.credentialsPath = join(this.configDir, 'teams-credentials.json');
    }
    async loadConfig() {
        if (!existsSync(this.credentialsPath)) {
            return null;
        }
        try {
            const content = await readFile(this.credentialsPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    async saveConfig(config) {
        await mkdir(this.configDir, { recursive: true });
        await writeFile(this.credentialsPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    }
    async getToken() {
        const config = await this.loadConfig();
        return config?.token ?? null;
    }
    async setToken(token, expiresAt) {
        let config = await this.loadConfig();
        if (!config) {
            config = {
                token,
                current_team: null,
                teams: {},
            };
        }
        config.token = token;
        if (expiresAt !== undefined) {
            config.token_expires_at = expiresAt;
        }
        await this.saveConfig(config);
    }
    async getCurrentTeam() {
        const config = await this.loadConfig();
        if (!config?.current_team) {
            return null;
        }
        return config.teams[config.current_team] ?? null;
    }
    async setCurrentTeam(teamId, teamName) {
        let config = await this.loadConfig();
        if (!config) {
            config = {
                token: '',
                current_team: null,
                teams: {},
            };
        }
        config.current_team = teamId;
        config.teams[teamId] = { team_id: teamId, team_name: teamName };
        await this.saveConfig(config);
    }
    async clearCredentials() {
        if (existsSync(this.credentialsPath)) {
            await rm(this.credentialsPath);
        }
    }
    async isTokenExpired() {
        const config = await this.loadConfig();
        if (!config?.token_expires_at) {
            return true;
        }
        const expiresAt = new Date(config.token_expires_at);
        return expiresAt.getTime() <= Date.now();
    }
}
//# sourceMappingURL=credential-manager.js.map