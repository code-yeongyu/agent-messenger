import { readFile } from 'node:fs/promises';
import { getDiscordHeaders } from './super-properties';
export class DiscordError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'DiscordError';
        this.code = code;
    }
}
const BASE_URL = 'https://discord.com/api/v10';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;
export class DiscordClient {
    token;
    buckets = new Map();
    globalRateLimitUntil = 0;
    constructor(token) {
        if (!token) {
            throw new DiscordError('Token is required', 'missing_token');
        }
        this.token = token;
    }
    getBucketKey(method, path) {
        const normalized = path
            .replace(/\/channels\/\d+/, '/channels/{channel_id}')
            .replace(/\/guilds\/\d+/, '/guilds/{guild_id}')
            .replace(/\/users\/\d+/, '/users/{user_id}')
            .replace(/\/messages\/\d+/, '/messages/{message_id}');
        return `${method}:${normalized}`;
    }
    async waitForRateLimit(bucketKey) {
        const now = Date.now();
        if (this.globalRateLimitUntil > now) {
            await this.sleep(this.globalRateLimitUntil - now);
        }
        const bucket = this.buckets.get(bucketKey);
        if (bucket && bucket.remaining === 0 && bucket.resetAt * 1000 > now) {
            await this.sleep(bucket.resetAt * 1000 - now);
        }
    }
    updateBucket(bucketKey, response) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        const bucketHash = response.headers.get('X-RateLimit-Bucket');
        if (remaining !== null && reset !== null && bucketHash !== null) {
            this.buckets.set(bucketKey, {
                remaining: parseInt(remaining, 10),
                resetAt: parseFloat(reset),
                bucketHash,
            });
        }
    }
    async handleRateLimitResponse(response) {
        const retryAfter = response.headers.get('Retry-After');
        const isGlobal = response.headers.get('X-RateLimit-Global') === 'true';
        const waitMs = parseFloat(retryAfter || '1') * 1000;
        if (isGlobal) {
            this.globalRateLimitUntil = Date.now() + waitMs;
        }
        await this.sleep(waitMs);
        return waitMs;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async request(method, path, body) {
        const url = `${BASE_URL}${path}`;
        const bucketKey = this.getBucketKey(method, path);
        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            await this.waitForRateLimit(bucketKey);
            const headers = getDiscordHeaders(this.token);
            const options = {
                method,
                headers,
            };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            this.updateBucket(bucketKey, response);
            if (response.status === 429) {
                if (attempt < MAX_RETRIES) {
                    await this.handleRateLimitResponse(response);
                    continue;
                }
                const errorBody = await response.json().catch(() => ({}));
                throw new DiscordError(errorBody.message || 'Rate limited', 'rate_limited');
            }
            if (response.status >= 500 && attempt < MAX_RETRIES) {
                await this.sleep(BASE_BACKOFF_MS * 2 ** attempt);
                continue;
            }
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new DiscordError(errorBody.message || `HTTP ${response.status}`, errorBody.code?.toString() || `http_${response.status}`);
            }
            if (response.status === 204) {
                return undefined;
            }
            return response.json();
        }
        throw lastError || new DiscordError('Request failed after retries', 'max_retries');
    }
    async requestFormData(path, formData) {
        const url = `${BASE_URL}${path}`;
        const bucketKey = this.getBucketKey('POST', path);
        await this.waitForRateLimit(bucketKey);
        const headers = getDiscordHeaders(this.token);
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });
        this.updateBucket(bucketKey, response);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new DiscordError(errorBody.message || `HTTP ${response.status}`, errorBody.code?.toString() || `http_${response.status}`);
        }
        return response.json();
    }
    async testAuth() {
        return this.request('GET', '/users/@me');
    }
    async listServers() {
        return this.request('GET', '/users/@me/guilds');
    }
    async getServer(serverId) {
        return this.request('GET', `/guilds/${serverId}`);
    }
    async listChannels(serverId) {
        return this.request('GET', `/guilds/${serverId}/channels`);
    }
    async getChannel(channelId) {
        return this.request('GET', `/channels/${channelId}`);
    }
    async sendMessage(channelId, content) {
        return this.request('POST', `/channels/${channelId}/messages`, { content });
    }
    async getMessages(channelId, limit = 50) {
        return this.request('GET', `/channels/${channelId}/messages?limit=${limit}`);
    }
    async getMessage(channelId, messageId) {
        return this.request('GET', `/channels/${channelId}/messages/${messageId}`);
    }
    async deleteMessage(channelId, messageId) {
        return this.request('DELETE', `/channels/${channelId}/messages/${messageId}`);
    }
    async addReaction(channelId, messageId, emoji) {
        const encodedEmoji = encodeURIComponent(emoji);
        return this.request('PUT', `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`);
    }
    async removeReaction(channelId, messageId, emoji) {
        const encodedEmoji = encodeURIComponent(emoji);
        return this.request('DELETE', `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`);
    }
    async ackMessage(channelId, messageId) {
        return this.request('POST', `/channels/${channelId}/messages/${messageId}/ack`, {
            token: null,
        });
    }
    async listUsers(serverId) {
        const members = await this.request('GET', `/guilds/${serverId}/members?limit=1000`);
        return members.map((m) => m.user);
    }
    async getUser(userId) {
        return this.request('GET', `/users/${userId}`);
    }
    async uploadFile(channelId, filePath) {
        const fileBuffer = await readFile(filePath);
        const filename = filePath.split('/').pop() || 'file';
        const formData = new FormData();
        formData.append('files[0]', new Blob([fileBuffer]), filename);
        const message = await this.requestFormData(`/channels/${channelId}/messages`, formData);
        return message.attachments[0];
    }
    async listFiles(channelId) {
        const messages = await this.request('GET', `/channels/${channelId}/messages?limit=100`);
        const files = [];
        for (const msg of messages) {
            if (msg.attachments && msg.attachments.length > 0) {
                files.push(...msg.attachments);
            }
        }
        return files;
    }
    async listDMChannels() {
        return this.request('GET', '/users/@me/channels');
    }
    async createDM(userId) {
        return this.request('POST', '/users/@me/channels', {
            recipient_id: userId,
        });
    }
    async getMentions(options) {
        const params = new URLSearchParams();
        params.set('limit', (options?.limit ?? 25).toString());
        params.set('roles', 'true');
        params.set('everyone', 'true');
        if (options?.guildId) {
            params.set('guild_id', options.guildId);
        }
        return this.request('GET', `/users/@me/mentions?${params.toString()}`);
    }
    async getUserNote(userId) {
        try {
            return await this.request('GET', `/users/@me/notes/${userId}`);
        }
        catch (error) {
            if (error instanceof DiscordError && error.code === 'http_404') {
                return null;
            }
            throw error;
        }
    }
    async setUserNote(userId, note) {
        return this.request('PUT', `/users/@me/notes/${userId}`, { note });
    }
    async getRelationships() {
        return this.request('GET', '/users/@me/relationships');
    }
    async searchMembers(guildId, query, limit = 10) {
        const params = new URLSearchParams();
        params.set('query', query);
        params.set('limit', limit.toString());
        return this.request('GET', `/guilds/${guildId}/members/search?${params.toString()}`);
    }
    async searchMessages(guildId, query, options = {}) {
        const params = new URLSearchParams();
        params.set('content', query);
        if (options.channelId) {
            params.set('channel_id', options.channelId);
        }
        if (options.authorId) {
            params.set('author_id', options.authorId);
        }
        if (options.has) {
            params.set('has', options.has);
        }
        if (options.sortBy) {
            params.set('sort_by', options.sortBy);
        }
        if (options.sortOrder) {
            params.set('sort_order', options.sortOrder);
        }
        if (options.limit !== undefined) {
            params.set('limit', Math.max(1, Math.min(options.limit, 25)).toString());
        }
        if (options.offset !== undefined) {
            params.set('offset', options.offset.toString());
        }
        const response = await this.request('GET', `/guilds/${guildId}/messages/search?${params.toString()}`);
        const results = response.messages
            .flat()
            .filter((msg) => msg.hit)
            .map((msg) => ({
            id: msg.id,
            channel_id: msg.channel_id,
            guild_id: msg.guild_id,
            content: msg.content,
            author: msg.author,
            timestamp: msg.timestamp,
            hit: msg.hit,
        }));
        return {
            results,
            total: response.total_results,
        };
    }
    async getUserProfile(userId) {
        return this.request('GET', `/users/${userId}/profile`);
    }
    async createThread(channelId, name, options) {
        return this.request('POST', `/channels/${channelId}/threads`, {
            name,
            ...options,
        });
    }
    async archiveThread(threadId, archived = true) {
        return this.request('PATCH', `/channels/${threadId}`, { archived });
    }
}
//# sourceMappingURL=client.js.map