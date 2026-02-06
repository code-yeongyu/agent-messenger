import { execSync } from 'node:child_process';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DerivedKeyCache } from '../../shared/utils/derived-key-cache';
const TEAMS_PROCESS_NAMES = {
    darwin: 'Microsoft Teams',
    win32: 'Teams.exe',
    linux: 'teams',
};
const SKYPETOKEN_COOKIE_NAME = 'skypetoken_asm';
const TEAMS_HOST_PATTERNS = [
    '.asyncgw.teams.microsoft.com',
    '.asm.skype.com',
    'teams.microsoft.com',
    'teams.live.com',
    '.microsoft.com',
];
export class TeamsTokenExtractor {
    platform;
    keyCache;
    cachedKey = null;
    constructor(platform, keyCache) {
        this.platform = platform ?? process.platform;
        this.keyCache = keyCache ?? new DerivedKeyCache();
    }
    getTeamsCookiesPaths() {
        switch (this.platform) {
            case 'darwin':
                return [
                    join(homedir(), 'Library', 'Containers', 'com.microsoft.teams2', 'Data', 'Library', 'Application Support', 'Microsoft', 'MSTeams', 'EBWebView', 'WV2Profile_tfw', 'Cookies'),
                    join(homedir(), 'Library', 'Containers', 'com.microsoft.teams2', 'Data', 'Library', 'Application Support', 'Microsoft', 'MSTeams', 'EBWebView', 'WV2Profile_tfl', 'Cookies'),
                    join(homedir(), 'Library', 'Containers', 'com.microsoft.teams2', 'Data', 'Library', 'Application Support', 'Microsoft', 'MSTeams', 'EBWebView', 'Default', 'Cookies'),
                    join(homedir(), 'Library', 'Application Support', 'Microsoft', 'Teams', 'Cookies'),
                ];
            case 'linux':
                return [join(homedir(), '.config', 'Microsoft', 'Microsoft Teams', 'Cookies')];
            case 'win32': {
                const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
                const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
                return [
                    // New Teams (MSIX/Store) - WebView2 profile paths
                    join(localAppData, 'Packages', 'MSTeams_8wekyb3d8bbwe', 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'WV2Profile_tfw', 'Cookies'),
                    join(localAppData, 'Packages', 'MSTeams_8wekyb3d8bbwe', 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'WV2Profile_tfl', 'Cookies'),
                    join(localAppData, 'Packages', 'MSTeams_8wekyb3d8bbwe', 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'Default', 'Cookies'),
                    // Classic Teams fallback
                    join(appdata, 'Microsoft', 'Teams', 'Cookies'),
                ];
            }
            default:
                return [];
        }
    }
    getLocalStatePath() {
        switch (this.platform) {
            case 'darwin':
                return join(homedir(), 'Library', 'Application Support', 'Microsoft', 'Teams', 'Local State');
            case 'linux':
                return join(homedir(), '.config', 'Microsoft', 'Microsoft Teams', 'Local State');
            case 'win32': {
                const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
                const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
                const newTeamsPath = join(localAppData, 'Packages', 'MSTeams_8wekyb3d8bbwe', 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'Local State');
                if (existsSync(newTeamsPath))
                    return newTeamsPath;
                return join(appdata, 'Microsoft', 'Teams', 'Local State');
            }
            default:
                return '';
        }
    }
    getKeychainVariants() {
        return [
            // New Teams (com.microsoft.teams2) keychain entry - try first
            { service: 'Microsoft Teams Safe Storage', account: 'Microsoft Teams' },
            // Work/school variant
            {
                service: 'Microsoft Teams (work or school) Safe Storage',
                account: 'Microsoft Teams (work or school)',
            },
            // Edge WebView2 fallback
            { service: 'Microsoft Edge Safe Storage', account: 'Microsoft Edge' },
            // Classic Teams fallback
            { service: 'Teams Safe Storage', account: 'Teams' },
        ];
    }
    isValidSkypeToken(token) {
        if (!token || token.length === 0)
            return false;
        // Skype tokens are typically JWT format or long base64 strings (50+ chars)
        return token.length >= 50;
    }
    isEncryptedValue(value) {
        if (!value || value.length < 4)
            return false;
        const prefix = value.subarray(0, 3).toString('utf8');
        return prefix === 'v10' || prefix === 'v11';
    }
    async extract() {
        await this.loadCachedKey();
        const cookieToken = await this.extractFromCookiesDB();
        if (cookieToken && this.isValidSkypeToken(cookieToken)) {
            return { token: cookieToken };
        }
        return null;
    }
    async loadCachedKey() {
        if (this.platform !== 'darwin')
            return;
        const cached = await this.keyCache.get('teams');
        if (cached) {
            this.cachedKey = cached;
        }
    }
    async clearKeyCache() {
        await this.keyCache.clear('teams');
        this.cachedKey = null;
    }
    async extractFromCookiesDB() {
        const dbPaths = this.getTeamsCookiesPaths();
        for (const dbPath of dbPaths) {
            if (!dbPath || !existsSync(dbPath))
                continue;
            // Try copy-first strategy to handle file locking
            const token = await this.copyAndExtract(dbPath);
            if (token)
                return token;
        }
        return null;
    }
    async copyAndExtract(dbPath) {
        const tempPath = join(tmpdir(), `teams-cookies-${Date.now()}`);
        try {
            this.copyDatabaseToTemp(dbPath, tempPath);
            const token = await this.extractFromSQLite(tempPath);
            this.cleanupTempFile(tempPath);
            return token;
        }
        catch {
            // File locked or copy failed
            this.cleanupTempFile(tempPath);
            return null;
        }
    }
    copyDatabaseToTemp(sourcePath, destPath) {
        copyFileSync(sourcePath, destPath);
        return destPath;
    }
    cleanupTempFile(tempPath) {
        try {
            if (existsSync(tempPath)) {
                unlinkSync(tempPath);
            }
        }
        catch {
            // Ignore cleanup errors
        }
    }
    async extractFromSQLite(dbPath) {
        try {
            for (const hostPattern of TEAMS_HOST_PATTERNS) {
                const sql = `
          SELECT encrypted_value 
          FROM cookies 
          WHERE name = '${SKYPETOKEN_COOKIE_NAME}' 
          AND host_key LIKE '%${hostPattern}%'
          LIMIT 1
        `;
                let row;
                if (typeof globalThis.Bun !== 'undefined') {
                    const { Database } = require('bun:sqlite');
                    const db = new Database(dbPath, { readonly: true });
                    row = db.query(sql).get();
                    db.close();
                }
                else {
                    const Database = require('better-sqlite3');
                    const db = new Database(dbPath, { readonly: true });
                    row = db.prepare(sql).get();
                    db.close();
                }
                if (row?.encrypted_value) {
                    const decrypted = this.decryptCookie(Buffer.from(row.encrypted_value));
                    if (decrypted && this.isValidSkypeToken(decrypted)) {
                        return decrypted;
                    }
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    decryptCookie(encryptedValue) {
        if (!this.isEncryptedValue(encryptedValue)) {
            // Not encrypted, return as-is
            return encryptedValue.toString('utf8');
        }
        if (this.platform === 'win32') {
            return this.decryptWindowsCookie(encryptedValue);
        }
        else if (this.platform === 'darwin') {
            return this.decryptMacCookie(encryptedValue);
        }
        else if (this.platform === 'linux') {
            return this.decryptLinuxCookie(encryptedValue);
        }
        return null;
    }
    decryptWindowsCookie(encryptedData) {
        try {
            const localStatePath = this.getLocalStatePath();
            if (!existsSync(localStatePath))
                return null;
            const localState = JSON.parse(readFileSync(localStatePath, 'utf8'));
            const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
            // Remove DPAPI prefix (5 bytes)
            const dpapiBlobKey = encryptedKey.subarray(5);
            const masterKey = this.decryptDPAPI(dpapiBlobKey);
            if (!masterKey)
                return null;
            return this.decryptAESGCM(encryptedData, masterKey);
        }
        catch {
            return null;
        }
    }
    decryptDPAPI(encryptedBlob) {
        try {
            const b64 = encryptedBlob.toString('base64');
            const psScript = `
        Add-Type -AssemblyName System.Security
        $bytes = [Convert]::FromBase64String('${b64}')
        $decrypted = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, 'CurrentUser')
        [Convert]::ToBase64String($decrypted)
      `.replace(/\n/g, ' ');
            const result = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8' });
            return Buffer.from(result.trim(), 'base64');
        }
        catch {
            return null;
        }
    }
    decryptMacCookie(encryptedData) {
        if (this.cachedKey) {
            const decrypted = this.decryptAESCBC(encryptedData, this.cachedKey);
            if (decrypted)
                return decrypted;
        }
        const password = this.getKeychainPassword();
        if (!password)
            return null;
        const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
        const decrypted = this.decryptAESCBC(encryptedData, key);
        if (decrypted) {
            this.cachedKey = key;
            this.keyCache.set('teams', key).catch(() => { });
        }
        return decrypted;
    }
    decryptLinuxCookie(encryptedData) {
        // Linux uses a hardcoded password 'peanuts' for Chromium-based apps
        const key = pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
        return this.decryptAESCBC(encryptedData, key);
    }
    getKeychainPassword() {
        const variants = this.getKeychainVariants();
        for (const variant of variants) {
            const password = this.execSecurityCommand(variant.service, variant.account);
            if (password)
                return password;
        }
        return null;
    }
    execSecurityCommand(service, account) {
        try {
            // Escape double quotes in service/account to prevent command injection
            const safeService = service.replace(/"/g, '\\"');
            const safeAccount = account.replace(/"/g, '\\"');
            const result = execSync(`security find-generic-password -s "${safeService}" -a "${safeAccount}" -w 2>/dev/null`, { encoding: 'utf8' });
            return result.trim();
        }
        catch {
            return null;
        }
    }
    decryptAESCBC(encryptedData, key) {
        try {
            const ciphertext = encryptedData.subarray(3);
            const iv = Buffer.alloc(16, 0x20);
            const decipher = createDecipheriv('aes-128-cbc', key, iv);
            decipher.setAutoPadding(true);
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            const decryptedStr = decrypted.toString('utf8');
            // Chromium v24+ prepends a 32-byte integrity hash before the actual value
            // Look for JWT token start (eyJ) or other token patterns
            const jwtStart = decryptedStr.indexOf('eyJ');
            if (jwtStart > 0 && jwtStart <= 32) {
                return decryptedStr.substring(jwtStart);
            }
            // If no JWT prefix found but decryption succeeded, check if first 32 bytes are garbage
            if (decrypted.length > 32) {
                const possibleToken = decryptedStr.substring(32);
                if (possibleToken.length > 50 && /^[A-Za-z0-9._-]+$/.test(possibleToken.substring(0, 50))) {
                    return possibleToken;
                }
            }
            return decryptedStr;
        }
        catch {
            return null;
        }
    }
    decryptAESGCM(encryptedData, key) {
        try {
            // Format: v10 (3 bytes) + IV (12 bytes) + ciphertext + auth tag (16 bytes)
            if (encryptedData.length < 3 + 12 + 16)
                return null;
            const iv = encryptedData.subarray(3, 15);
            const authTag = encryptedData.subarray(-16);
            const ciphertext = encryptedData.subarray(15, -16);
            const decipher = createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            return decrypted.toString('utf8');
        }
        catch {
            return null;
        }
    }
    async isTeamsRunning() {
        const processName = this.getProcessName();
        return this.checkProcessRunning(processName);
    }
    getProcessName() {
        return TEAMS_PROCESS_NAMES[this.platform] || TEAMS_PROCESS_NAMES.linux;
    }
    checkProcessRunning(processName) {
        try {
            if (this.platform === 'win32') {
                const result = execSync(`tasklist /FI "IMAGENAME eq ${processName}" 2>nul`, {
                    encoding: 'utf8',
                });
                return result.toLowerCase().includes(processName.toLowerCase());
            }
            else {
                const result = execSync(`pgrep -f "${processName}" 2>/dev/null || true`, {
                    encoding: 'utf8',
                });
                return result.trim().length > 0;
            }
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=token-extractor.js.map