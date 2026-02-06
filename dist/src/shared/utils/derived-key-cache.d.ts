export type Platform = 'slack' | 'discord' | 'teams';
/**
 * Caches derived encryption keys to avoid repeated macOS Keychain prompts.
 *
 * The derived key (PBKDF2 output) is stored, NOT the keychain password.
 * This is safe because:
 * 1. The derived key can only decrypt app-specific local storage
 * 2. It's stored with 600 permissions (owner read/write only)
 * 3. If the app updates its encryption, cached key becomes invalid and we re-prompt once
 */
export declare class DerivedKeyCache {
    private cacheDir;
    constructor(cacheDir?: string);
    private getKeyPath;
    get(platform: Platform): Promise<Buffer | null>;
    set(platform: Platform, key: Buffer): Promise<void>;
    clear(platform: Platform): Promise<void>;
    clearAll(): Promise<void>;
}
//# sourceMappingURL=derived-key-cache.d.ts.map