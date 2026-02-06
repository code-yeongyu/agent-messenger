import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { TeamsError } from './types';
const MSG_API_BASE = 'https://emea.ng.msg.teams.microsoft.com/v1';
const CSA_API_BASE = 'https://teams.microsoft.com/api';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;
export class TeamsClient {
    token;
    tokenExpiresAt;
    buckets = new Map();
    globalRateLimitUntil = 0;
    constructor(token, tokenExpiresAt) {
        if (!token) {
            throw new TeamsError('Token is required', 'missing_token');
        }
        this.token = token;
        if (tokenExpiresAt) {
            this.tokenExpiresAt = new Date(tokenExpiresAt);
        }
    }
    isTokenExpired() {
        if (!this.tokenExpiresAt) {
            return false;
        }
        return this.tokenExpiresAt.getTime() < Date.now();
    }
    getBucketKey(method, path) {
        const normalized = path
            .replace(/\/teams\/[^/]+/, '/teams/{team_id}')
            .replace(/\/channels\/[^/]+/, '/channels/{channel_id}')
            .replace(/\/messages\/[^/]+/, '/messages/{message_id}')
            .replace(/\/users\/[^/]+/, '/users/{user_id}')
            .replace(/\/members\/[^/]+/, '/members/{member_id}');
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
        if (remaining !== null && reset !== null) {
            this.buckets.set(bucketKey, {
                remaining: parseInt(remaining, 10),
                resetAt: parseFloat(reset),
            });
        }
    }
    async handleRateLimitResponse(response) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = parseFloat(retryAfter || '1') * 1000;
        this.globalRateLimitUntil = Date.now() + waitMs;
        await this.sleep(waitMs);
        return waitMs;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async request(method, path, body, baseUrl = MSG_API_BASE) {
        if (this.isTokenExpired()) {
            throw new TeamsError('Token has expired', 'token_expired');
        }
        const url = `${baseUrl}${path}`;
        const bucketKey = this.getBucketKey(method, path);
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            await this.waitForRateLimit(bucketKey);
            const headers = {
                'X-Skypetoken': this.token,
                'Content-Type': 'application/json',
            };
            const options = {
                method,
                headers,
            };
            if (body !== undefined) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            this.updateBucket(bucketKey, response);
            if (response.status === 429) {
                if (attempt < MAX_RETRIES) {
                    await this.handleRateLimitResponse(response);
                    continue;
                }
                const errorBody = (await response.json().catch(() => null));
                throw new TeamsError(errorBody?.message ?? 'Rate limited', 'rate_limited');
            }
            if (response.status >= 500 && attempt < MAX_RETRIES) {
                await this.sleep(BASE_BACKOFF_MS * 2 ** attempt);
                continue;
            }
            if (!response.ok) {
                const errorBody = (await response.json().catch(() => null));
                throw new TeamsError(errorBody?.message ?? `HTTP ${response.status}`, errorBody?.code?.toString() ?? `http_${response.status}`);
            }
            if (response.status === 204) {
                return undefined;
            }
            return response.json();
        }
        throw new TeamsError('Request failed after retries', 'max_retries');
    }
    async requestFormData(path, formData, baseUrl = MSG_API_BASE) {
        if (this.isTokenExpired()) {
            throw new TeamsError('Token has expired', 'token_expired');
        }
        const url = `${baseUrl}${path}`;
        const bucketKey = this.getBucketKey('POST', path);
        await this.waitForRateLimit(bucketKey);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Skypetoken': this.token,
            },
            body: formData,
        });
        this.updateBucket(bucketKey, response);
        if (!response.ok) {
            const errorBody = (await response.json().catch(() => null));
            throw new TeamsError(errorBody?.message ?? `HTTP ${response.status}`, errorBody?.code?.toString() ?? `http_${response.status}`);
        }
        return response.json();
    }
    async testAuth() {
        const props = await this.request('GET', '/users/ME/properties');
        const userDetails = props.userDetails ? JSON.parse(props.userDetails) : {};
        return {
            id: 'ME',
            displayName: userDetails.name || 'Teams User',
        };
    }
    async listTeams() {
        const data = await this.request('GET', '/users/ME/conversations');
        const teamsMap = new Map();
        for (const conv of data.conversations) {
            const tp = conv.threadProperties;
            if (!tp?.groupId)
                continue;
            if (!tp.productThreadType?.includes('Teams') && tp.threadType !== 'space')
                continue;
            if (!teamsMap.has(tp.groupId)) {
                teamsMap.set(tp.groupId, {
                    id: tp.groupId,
                    name: tp.spaceThreadTopic || 'Unknown Team',
                });
            }
        }
        return Array.from(teamsMap.values());
    }
    async getTeam(teamId) {
        return this.request('GET', `/csa/api/v1/teams/${teamId}`, undefined, CSA_API_BASE);
    }
    async listChannels(teamId) {
        return this.request('GET', `/csa/api/v1/teams/${teamId}/channels`, undefined, CSA_API_BASE);
    }
    async getChannel(teamId, channelId) {
        return this.request('GET', `/csa/api/v1/teams/${teamId}/channels/${channelId}`, undefined, CSA_API_BASE);
    }
    async sendMessage(teamId, channelId, content) {
        return this.request('POST', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages`, { content }, CSA_API_BASE);
    }
    async getMessages(teamId, channelId, limit = 50) {
        return this.request('GET', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages?limit=${limit}`, undefined, CSA_API_BASE);
    }
    async getMessage(teamId, channelId, messageId) {
        return this.request('GET', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}`, undefined, CSA_API_BASE);
    }
    async deleteMessage(teamId, channelId, messageId) {
        return this.request('DELETE', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}`, undefined, CSA_API_BASE);
    }
    async addReaction(teamId, channelId, messageId, emoji) {
        return this.request('POST', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}/reactions`, { emoji }, CSA_API_BASE);
    }
    async removeReaction(teamId, channelId, messageId, emoji) {
        return this.request('DELETE', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/messages/${messageId}/reactions/${emoji}`, undefined, CSA_API_BASE);
    }
    async listUsers(teamId) {
        return this.request('GET', `/csa/api/v1/teams/${teamId}/members`, undefined, CSA_API_BASE);
    }
    async getUser(userId) {
        return this.request('GET', `/csa/api/v1/users/${userId}`, undefined, CSA_API_BASE);
    }
    async uploadFile(teamId, channelId, filePath) {
        const fileBuffer = await readFile(filePath);
        const filename = basename(filePath) || 'file';
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), filename);
        return this.requestFormData(`/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/files`, formData, CSA_API_BASE);
    }
    async listFiles(teamId, channelId) {
        return this.request('GET', `/csa/emea/api/v2/teams/${teamId}/channels/${channelId}/files`, undefined, CSA_API_BASE);
    }
}
//# sourceMappingURL=client.js.map