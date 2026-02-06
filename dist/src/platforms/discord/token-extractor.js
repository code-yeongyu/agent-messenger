import { execSync, spawn } from 'node:child_process';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DerivedKeyCache } from '../../shared/utils/derived-key-cache';
const TOKEN_REGEX = /[\w-]{24}\.[\w-]{6}\.[\w-]{25,110}/;
const MFA_TOKEN_REGEX = /mfa\.[\w-]{84}/;
const ENCRYPTED_PREFIX = 'dQw4w9WgXcQ:';
export const CDP_PORT = 9222;
export const CDP_TIMEOUT = 5000;
export const DISCORD_STARTUP_WAIT = 4000;
export const TOKEN_EXTRACTION_JS = `(webpackChunkdiscord_app.push([[''], {}, e => { m = []; for (let c in e.c) m.push(e.c[c]); }]), m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken()`;
const DISCORD_PROCESS_NAMES = {
    stable: { darwin: 'Discord', win32: 'Discord.exe', linux: 'discord' },
    canary: { darwin: 'Discord Canary', win32: 'DiscordCanary.exe', linux: 'discordcanary' },
    ptb: { darwin: 'Discord PTB', win32: 'DiscordPTB.exe', linux: 'discordptb' },
};
const DISCORD_APP_PATHS = {
    stable: { darwin: '/Applications/Discord.app/Contents/MacOS/Discord' },
    canary: { darwin: '/Applications/Discord Canary.app/Contents/MacOS/Discord Canary' },
    ptb: { darwin: '/Applications/Discord PTB.app/Contents/MacOS/Discord PTB' },
};
export class DiscordTokenExtractor {
    platform;
    startupWait;
    killWait;
    keyCache;
    cachedKey = null;
    constructor(platform, startupWait, killWait, keyCache) {
        this.platform = platform ?? process.platform;
        this.startupWait = startupWait ?? DISCORD_STARTUP_WAIT;
        this.killWait = killWait ?? 1000;
        this.keyCache = keyCache ?? new DerivedKeyCache();
    }
    getDiscordDirs() {
        switch (this.platform) {
            case 'darwin':
                return [
                    join(homedir(), 'Library', 'Application Support', 'Discord'),
                    join(homedir(), 'Library', 'Application Support', 'discordcanary'),
                    join(homedir(), 'Library', 'Application Support', 'discordptb'),
                ];
            case 'linux':
                return [
                    join(homedir(), '.config', 'discord'),
                    join(homedir(), '.config', 'discordcanary'),
                    join(homedir(), '.config', 'discordptb'),
                ];
            case 'win32': {
                const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
                return [
                    join(appdata, 'Discord'),
                    join(appdata, 'discordcanary'),
                    join(appdata, 'discordptb'),
                ];
            }
            default:
                return [];
        }
    }
    getKeychainVariants() {
        return [
            // Modern Discord (lowercase)
            { service: 'discord Safe Storage', account: 'discord Key' },
            { service: 'discordcanary Safe Storage', account: 'discordcanary Key' },
            { service: 'discordptb Safe Storage', account: 'discordptb Key' },
            // Legacy Discord (capitalized)
            { service: 'Discord Safe Storage', account: 'Discord' },
            { service: 'Discord Canary Safe Storage', account: 'Discord Canary' },
            { service: 'Discord PTB Safe Storage', account: 'Discord PTB' },
        ];
    }
    getVariantFromPath(path) {
        const lowerPath = path.toLowerCase();
        if (lowerPath.includes('canary'))
            return 'canary';
        if (lowerPath.includes('ptb'))
            return 'ptb';
        return 'stable';
    }
    isValidToken(token) {
        if (!token || token.length === 0)
            return false;
        return TOKEN_REGEX.test(token) || MFA_TOKEN_REGEX.test(token);
    }
    isEncryptedToken(token) {
        return token.startsWith(ENCRYPTED_PREFIX);
    }
    async extract() {
        await this.loadCachedKey();
        const levelDbToken = await this.extractFromLevelDB();
        if (levelDbToken) {
            return levelDbToken;
        }
        if (this.platform === 'darwin') {
            const cdpToken = await this.tryExtractViaCDP();
            if (cdpToken) {
                return { token: cdpToken };
            }
        }
        return null;
    }
    async loadCachedKey() {
        if (this.platform !== 'darwin')
            return;
        const cached = await this.keyCache.get('discord');
        if (cached) {
            this.cachedKey = cached;
        }
    }
    async clearKeyCache() {
        await this.keyCache.clear('discord');
        this.cachedKey = null;
    }
    async tryExtractViaCDP() {
        const token = await this.extractViaCDP();
        if (token) {
            return token;
        }
        for (const variant of ['stable', 'canary', 'ptb']) {
            try {
                const appPath = this.getAppPath(variant);
                if (!existsSync(appPath))
                    continue;
                await this.launchDiscordWithDebug(variant);
                const extractedToken = await this.extractViaCDP();
                if (extractedToken) {
                    return extractedToken;
                }
            }
            catch { }
        }
        return null;
    }
    async extractFromLevelDB() {
        const dirs = this.getDiscordDirs();
        for (const dir of dirs) {
            if (!existsSync(dir))
                continue;
            const token = await this.extractFromDir(dir);
            if (token) {
                return { token };
            }
        }
        return null;
    }
    async extractFromDir(discordDir) {
        const levelDbPath = join(discordDir, 'Local Storage', 'leveldb');
        if (!existsSync(levelDbPath))
            return null;
        const tokens = this.extractTokensFromLDBFiles(levelDbPath, discordDir);
        return tokens.length > 0 ? tokens[0] : null;
    }
    extractTokensFromLDBFiles(dbPath, discordDir) {
        const tokens = [];
        try {
            const files = readdirSync(dbPath).filter((f) => f.endsWith('.ldb') || f.endsWith('.log'));
            for (const file of files) {
                const filePath = join(dbPath, file);
                const content = readFileSync(filePath);
                const extracted = this.extractTokensFromBuffer(content, discordDir);
                tokens.push(...extracted);
            }
        }
        catch {
            return tokens;
        }
        return [...new Set(tokens)];
    }
    extractTokensFromBuffer(buffer, discordDir) {
        const tokens = [];
        const content = buffer.toString('utf8');
        const encryptedMatches = content.match(new RegExp(`${ENCRYPTED_PREFIX}[A-Za-z0-9+/=]+`, 'g'));
        if (encryptedMatches) {
            for (const match of encryptedMatches) {
                try {
                    const decrypted = this.decryptToken(match, discordDir);
                    if (decrypted && this.isValidToken(decrypted)) {
                        tokens.push(decrypted);
                    }
                }
                catch { }
            }
        }
        const standardMatches = content.match(TOKEN_REGEX);
        if (standardMatches) {
            for (const match of standardMatches) {
                if (this.isValidToken(match)) {
                    tokens.push(match);
                }
            }
        }
        const mfaMatches = content.match(MFA_TOKEN_REGEX);
        if (mfaMatches) {
            for (const match of mfaMatches) {
                tokens.push(match);
            }
        }
        return tokens;
    }
    decryptToken(encryptedToken, discordDir) {
        if (!encryptedToken.startsWith(ENCRYPTED_PREFIX))
            return null;
        const encryptedData = Buffer.from(encryptedToken.substring(ENCRYPTED_PREFIX.length), 'base64');
        if (this.platform === 'win32') {
            return this.decryptWindowsToken(encryptedData, discordDir);
        }
        else if (this.platform === 'darwin') {
            return this.decryptMacToken(encryptedData, discordDir);
        }
        return null;
    }
    decryptWindowsToken(encryptedData, discordDir) {
        try {
            const localStatePath = join(discordDir, 'Local State');
            if (!existsSync(localStatePath))
                return null;
            const localState = JSON.parse(readFileSync(localStatePath, 'utf8'));
            const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
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
    decryptMacToken(encryptedData, discordDir) {
        if (this.cachedKey) {
            const decrypted = this.decryptAESCBC(encryptedData, this.cachedKey);
            if (decrypted)
                return decrypted;
        }
        const variant = this.getVariantFromPath(discordDir);
        const keychainVariants = this.getKeychainVariants().filter((v) => {
            const lowerAccount = v.account.toLowerCase();
            if (variant === 'stable')
                return lowerAccount === 'discord' || lowerAccount === 'discord key';
            if (variant === 'canary')
                return lowerAccount === 'discord canary' || lowerAccount === 'discordcanary key';
            if (variant === 'ptb')
                return lowerAccount === 'discord ptb' || lowerAccount === 'discordptb key';
            return false;
        });
        for (const keychainVariant of keychainVariants) {
            try {
                const password = execSync(`security find-generic-password -s "${keychainVariant.service}" -a "${keychainVariant.account}" -w 2>/dev/null`, { encoding: 'utf8' }).trim();
                const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
                const decrypted = this.decryptAESCBC(encryptedData, key);
                if (decrypted) {
                    this.cachedKey = key;
                    this.keyCache.set('discord', key).catch(() => { });
                    return decrypted;
                }
            }
            catch { }
        }
        return null;
    }
    decryptAESCBC(encryptedData, key) {
        try {
            const ciphertext = encryptedData.subarray(3);
            const iv = Buffer.alloc(16, 0x20);
            const decipher = createDecipheriv('aes-128-cbc', key, iv);
            decipher.setAutoPadding(true);
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            return decrypted.toString('utf8');
        }
        catch {
            return null;
        }
    }
    decryptAESGCM(encryptedData, key) {
        try {
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
    async isDiscordRunning(variant) {
        const variants = variant ? [variant] : ['stable', 'canary', 'ptb'];
        for (const v of variants) {
            const processName = this.getProcessName(v);
            if (this.checkProcessRunning(processName)) {
                return true;
            }
        }
        return false;
    }
    getProcessName(variant) {
        const platformKey = this.platform;
        return DISCORD_PROCESS_NAMES[variant][platformKey] || DISCORD_PROCESS_NAMES[variant].linux;
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
    async killDiscord(variant) {
        const variants = variant ? [variant] : ['stable', 'canary', 'ptb'];
        for (const v of variants) {
            const processName = this.getProcessName(v);
            this.killProcess(processName);
        }
        await new Promise((resolve) => setTimeout(resolve, this.killWait));
    }
    killProcess(processName) {
        try {
            if (this.platform === 'win32') {
                execSync(`taskkill /F /IM "${processName}" 2>nul`, { encoding: 'utf8' });
            }
            else {
                execSync(`pkill -f "${processName}" 2>/dev/null || true`, { encoding: 'utf8' });
            }
        }
        catch { }
    }
    async launchDiscordWithDebug(variant, port = CDP_PORT) {
        const appPath = this.getAppPath(variant);
        if (!existsSync(appPath)) {
            throw new Error(`Discord ${variant} not found at ${appPath}`);
        }
        await this.killDiscord(variant);
        const args = [`--remote-debugging-port=${port}`];
        if (this.platform === 'darwin') {
            spawn(appPath, args, {
                detached: true,
                stdio: 'ignore',
            }).unref();
        }
        else if (this.platform === 'win32') {
            spawn(appPath, args, {
                detached: true,
                stdio: 'ignore',
                shell: true,
            }).unref();
        }
        else {
            spawn(appPath, args, {
                detached: true,
                stdio: 'ignore',
            }).unref();
        }
        await new Promise((resolve) => setTimeout(resolve, this.startupWait));
    }
    getAppPath(variant) {
        if (this.platform === 'darwin') {
            return DISCORD_APP_PATHS[variant].darwin;
        }
        else if (this.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
            const appName = variant === 'stable' ? 'Discord' : variant === 'canary' ? 'DiscordCanary' : 'DiscordPTB';
            return join(localAppData, appName, 'Update.exe');
        }
        else {
            return variant === 'stable' ? 'discord' : `discord${variant}`;
        }
    }
    async discoverCDPTargets(port = CDP_PORT) {
        try {
            const response = await fetch(`http://localhost:${port}/json`, {
                signal: AbortSignal.timeout(CDP_TIMEOUT),
            });
            if (!response.ok) {
                return [];
            }
            return (await response.json());
        }
        catch {
            return [];
        }
    }
    findDiscordPageTarget(targets) {
        const discordTarget = targets.find((t) => t.type === 'page' &&
            (t.url.includes('discord.com') || t.title.toLowerCase().includes('discord')));
        return discordTarget ?? null;
    }
    async executeJSViaCDP(webSocketUrl, expression) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(webSocketUrl);
            const messageId = 1;
            let timeoutId;
            const cleanup = () => {
                clearTimeout(timeoutId);
                ws.close();
            };
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('CDP execution timeout'));
            }, CDP_TIMEOUT);
            ws.onopen = () => {
                const message = {
                    id: messageId,
                    method: 'Runtime.evaluate',
                    params: {
                        expression,
                        returnByValue: true,
                    },
                };
                ws.send(JSON.stringify(message));
            };
            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.id === messageId) {
                        cleanup();
                        if (response.error) {
                            reject(new Error(response.error.message));
                        }
                        else {
                            resolve(response.result?.result?.value);
                        }
                    }
                }
                catch (e) {
                    cleanup();
                    reject(e);
                }
            };
            ws.onerror = (error) => {
                cleanup();
                reject(error);
            };
        });
    }
    async extractViaCDP(port = CDP_PORT) {
        const targets = await this.discoverCDPTargets(port);
        if (targets.length === 0) {
            return null;
        }
        const discordTarget = this.findDiscordPageTarget(targets);
        if (!discordTarget) {
            return null;
        }
        try {
            const result = await this.executeJSViaCDP(discordTarget.webSocketDebuggerUrl, TOKEN_EXTRACTION_JS);
            if (typeof result === 'string' && this.isValidToken(result)) {
                return result;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=token-extractor.js.map