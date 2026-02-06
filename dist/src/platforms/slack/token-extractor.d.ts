import { DerivedKeyCache } from '../../shared/utils/derived-key-cache';
export interface ExtractedWorkspace {
    workspace_id: string;
    workspace_name: string;
    token: string;
    cookie: string;
}
export declare class TokenExtractor {
    private platform;
    private slackDir;
    private keyCache;
    constructor(platform?: NodeJS.Platform, slackDir?: string, keyCache?: DerivedKeyCache);
    getSlackDir(): string;
    extract(): Promise<ExtractedWorkspace[]>;
    private extractTokensFromLevelDB;
    private deduplicateTokens;
    private findLevelDBDirs;
    private isLevelDBDir;
    private extractFromLevelDB;
    private extractTokensFromLDBFiles;
    private extractTokenFromLogFile;
    private extractTokenFromBuffer;
    private parseTokenData;
    private extractCookieFromSQLite;
    private readCookieFromDB;
    private tryDecryptCookie;
    private decryptV10Cookie;
    private cachedKey;
    private usedCachedKey;
    private getDerivedKeyAsync;
    private getDerivedKey;
    private getDerivedKeyFromKeychain;
    clearKeyCache(): Promise<void>;
}
//# sourceMappingURL=token-extractor.d.ts.map