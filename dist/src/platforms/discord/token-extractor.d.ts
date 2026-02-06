import { DerivedKeyCache } from '../../shared/utils/derived-key-cache';
export interface ExtractedDiscordToken {
    token: string;
}
export type DiscordVariant = 'stable' | 'canary' | 'ptb';
interface KeychainVariant {
    service: string;
    account: string;
}
interface CDPTarget {
    id: string;
    type: string;
    title: string;
    url: string;
    webSocketDebuggerUrl: string;
}
export declare const CDP_PORT = 9222;
export declare const CDP_TIMEOUT = 5000;
export declare const DISCORD_STARTUP_WAIT = 4000;
export declare const TOKEN_EXTRACTION_JS = "(webpackChunkdiscord_app.push([[''], {}, e => { m = []; for (let c in e.c) m.push(e.c[c]); }]), m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken()";
export declare class DiscordTokenExtractor {
    private platform;
    private startupWait;
    private killWait;
    private keyCache;
    private cachedKey;
    constructor(platform?: NodeJS.Platform, startupWait?: number, killWait?: number, keyCache?: DerivedKeyCache);
    getDiscordDirs(): string[];
    getKeychainVariants(): KeychainVariant[];
    getVariantFromPath(path: string): DiscordVariant;
    isValidToken(token: string): boolean;
    isEncryptedToken(token: string): boolean;
    extract(): Promise<ExtractedDiscordToken | null>;
    private loadCachedKey;
    clearKeyCache(): Promise<void>;
    private tryExtractViaCDP;
    private extractFromLevelDB;
    private extractFromDir;
    private extractTokensFromLDBFiles;
    private extractTokensFromBuffer;
    private decryptToken;
    private decryptWindowsToken;
    private decryptDPAPI;
    private decryptMacToken;
    private decryptAESCBC;
    private decryptAESGCM;
    isDiscordRunning(variant?: DiscordVariant): Promise<boolean>;
    private getProcessName;
    private checkProcessRunning;
    killDiscord(variant?: DiscordVariant): Promise<void>;
    private killProcess;
    launchDiscordWithDebug(variant: DiscordVariant, port?: number): Promise<void>;
    private getAppPath;
    discoverCDPTargets(port?: number): Promise<CDPTarget[]>;
    findDiscordPageTarget(targets: CDPTarget[]): CDPTarget | null;
    executeJSViaCDP(webSocketUrl: string, expression: string): Promise<unknown>;
    extractViaCDP(port?: number): Promise<string | null>;
}
export {};
//# sourceMappingURL=token-extractor.d.ts.map