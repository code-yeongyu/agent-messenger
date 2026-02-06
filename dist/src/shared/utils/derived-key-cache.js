import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
/**
 * Caches derived encryption keys to avoid repeated macOS Keychain prompts.
 *
 * The derived key (PBKDF2 output) is stored, NOT the keychain password.
 * This is safe because:
 * 1. The derived key can only decrypt app-specific local storage
 * 2. It's stored with 600 permissions (owner read/write only)
 * 3. If the app updates its encryption, cached key becomes invalid and we re-prompt once
 */
export class DerivedKeyCache {
    cacheDir;
    constructor(cacheDir) {
        this.cacheDir = cacheDir ?? join(homedir(), '.config', 'agent-messenger', '.derived-keys');
    }
    getKeyPath(platform) {
        return join(this.cacheDir, `${platform}.key`);
    }
    async get(platform) {
        const keyPath = this.getKeyPath(platform);
        if (!existsSync(keyPath)) {
            return null;
        }
        try {
            const content = await readFile(keyPath);
            return content;
        }
        catch {
            return null;
        }
    }
    async set(platform, key) {
        await mkdir(this.cacheDir, { recursive: true, mode: 0o700 });
        const keyPath = this.getKeyPath(platform);
        await writeFile(keyPath, key, { mode: 0o600 });
    }
    async clear(platform) {
        const keyPath = this.getKeyPath(platform);
        if (existsSync(keyPath)) {
            await rm(keyPath);
        }
    }
    async clearAll() {
        if (existsSync(this.cacheDir)) {
            await rm(this.cacheDir, { recursive: true });
        }
    }
}
//# sourceMappingURL=derived-key-cache.js.map