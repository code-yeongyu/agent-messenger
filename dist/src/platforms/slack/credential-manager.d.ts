import type { Config, WorkspaceCredentials } from './types';
export declare class CredentialManager {
    private configDir;
    private credentialsPath;
    constructor(configDir?: string);
    load(): Promise<Config>;
    save(config: Config): Promise<void>;
    getWorkspace(id?: string): Promise<WorkspaceCredentials | null>;
    setWorkspace(creds: WorkspaceCredentials): Promise<void>;
    removeWorkspace(id: string): Promise<void>;
    setCurrentWorkspace(id: string): Promise<void>;
}
//# sourceMappingURL=credential-manager.d.ts.map