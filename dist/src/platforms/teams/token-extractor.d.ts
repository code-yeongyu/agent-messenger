import { DerivedKeyCache } from '../../shared/utils/derived-key-cache';
export interface ExtractedTeamsToken {
    token: string;
}
interface KeychainVariant {
    service: string;
    account: string;
}
export declare class TeamsTokenExtractor {
    private platform;
    private keyCache;
    private cachedKey;
    constructor(platform?: NodeJS.Platform, keyCache?: DerivedKeyCache);
    getTeamsCookiesPaths(): string[];
    getLocalStatePath(): string;
    getKeychainVariants(): KeychainVariant[];
    isValidSkypeToken(token: string): boolean;
    isEncryptedValue(value: Buffer): boolean;
    extract(): Promise<ExtractedTeamsToken | null>;
    private loadCachedKey;
    clearKeyCache(): Promise<void>;
    private extractFromCookiesDB;
    private copyAndExtract;
    private copyDatabaseToTemp;
    private cleanupTempFile;
    private extractFromSQLite;
    private decryptCookie;
    private decryptWindowsCookie;
    private decryptDPAPI;
    private decryptMacCookie;
    private decryptLinuxCookie;
    private getKeychainPassword;
    private execSecurityCommand;
    private decryptAESCBC;
    private decryptAESGCM;
    isTeamsRunning(): Promise<boolean>;
    private getProcessName;
    private checkProcessRunning;
}
export {};
//# sourceMappingURL=token-extractor.d.ts.map