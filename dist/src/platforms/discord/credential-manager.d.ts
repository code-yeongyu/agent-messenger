export interface DiscordConfig {
    token: string | null;
    current_server: string | null;
    servers: Record<string, {
        server_id: string;
        server_name: string;
    }>;
}
export declare class DiscordCredentialManager {
    private configDir;
    private credentialsPath;
    constructor(configDir?: string);
    load(): Promise<DiscordConfig>;
    save(config: DiscordConfig): Promise<void>;
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    clearToken(): Promise<void>;
    getCurrentServer(): Promise<string | null>;
    setCurrentServer(serverId: string): Promise<void>;
    getServers(): Promise<Record<string, {
        server_id: string;
        server_name: string;
    }>>;
    setServers(servers: Record<string, {
        server_id: string;
        server_name: string;
    }>): Promise<void>;
    getCredentials(): Promise<{
        token: string;
        serverId: string;
    } | null>;
}
//# sourceMappingURL=credential-manager.d.ts.map