import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export class DiscordCredentialManager {
    configDir;
    credentialsPath;
    constructor(configDir) {
        this.configDir = configDir ?? join(homedir(), '.config', 'agent-messenger');
        this.credentialsPath = join(this.configDir, 'discord-credentials.json');
    }
    async load() {
        if (!existsSync(this.credentialsPath)) {
            return {
                token: null,
                current_server: null,
                servers: {},
            };
        }
        const content = await readFile(this.credentialsPath, 'utf-8');
        return JSON.parse(content);
    }
    async save(config) {
        await mkdir(this.configDir, { recursive: true });
        await writeFile(this.credentialsPath, JSON.stringify(config, null, 2));
        await chmod(this.credentialsPath, 0o600);
    }
    async getToken() {
        // Check env var first (takes precedence over file-based credentials)
        const envToken = process.env.E2E_DISCORD_TOKEN;
        if (envToken) {
            return envToken;
        }
        const config = await this.load();
        return config.token;
    }
    async setToken(token) {
        const config = await this.load();
        config.token = token;
        await this.save(config);
    }
    async clearToken() {
        const config = await this.load();
        config.token = null;
        await this.save(config);
    }
    async getCurrentServer() {
        // Check env var first (takes precedence over file-based credentials)
        const envServerId = process.env.E2E_DISCORD_SERVER_ID;
        if (envServerId) {
            return envServerId;
        }
        const config = await this.load();
        return config.current_server;
    }
    async setCurrentServer(serverId) {
        const config = await this.load();
        config.current_server = serverId;
        await this.save(config);
    }
    async getServers() {
        const config = await this.load();
        return config.servers;
    }
    async setServers(servers) {
        const config = await this.load();
        config.servers = servers;
        await this.save(config);
    }
    async getCredentials() {
        const token = await this.getToken();
        const serverId = await this.getCurrentServer();
        if (!token || !serverId) {
            return null;
        }
        return { token, serverId };
    }
}
//# sourceMappingURL=credential-manager.js.map