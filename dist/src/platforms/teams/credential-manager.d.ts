import type { TeamsConfig } from './types';
export declare class TeamsCredentialManager {
    private configDir;
    private credentialsPath;
    constructor(configDir?: string);
    loadConfig(): Promise<TeamsConfig | null>;
    saveConfig(config: TeamsConfig): Promise<void>;
    getToken(): Promise<string | null>;
    setToken(token: string, expiresAt?: string): Promise<void>;
    getCurrentTeam(): Promise<{
        team_id: string;
        team_name: string;
    } | null>;
    setCurrentTeam(teamId: string, teamName: string): Promise<void>;
    clearCredentials(): Promise<void>;
    isTokenExpired(): Promise<boolean>;
}
//# sourceMappingURL=credential-manager.d.ts.map