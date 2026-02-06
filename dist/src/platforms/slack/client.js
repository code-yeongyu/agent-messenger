import { WebClient } from '@slack/web-api';
export class SlackError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'SlackError';
        this.code = code;
    }
}
const MAX_RETRIES = 3;
const RATE_LIMIT_ERROR_CODE = 'slack_webapi_rate_limited_error';
export class SlackClient {
    client;
    constructor(token, cookie) {
        if (!token) {
            throw new SlackError('Token is required', 'missing_token');
        }
        if (!cookie) {
            throw new SlackError('Cookie is required', 'missing_cookie');
        }
        this.client = new WebClient(token, {
            headers: { Cookie: `d=${cookie}` },
        });
    }
    async withRetry(operation) {
        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (error.code === RATE_LIMIT_ERROR_CODE && attempt < MAX_RETRIES) {
                    const retryAfter = error.retryAfter || 1;
                    await this.sleep(retryAfter * 1000 * (attempt + 1));
                    continue;
                }
                break;
            }
        }
        throw new SlackError(lastError?.message || 'Unknown error', lastError?.code || 'unknown_error');
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    checkResponse(response) {
        if (!response.ok) {
            throw new SlackError(response.error || 'API call failed', response.error || 'api_error');
        }
    }
    async testAuth() {
        return this.withRetry(async () => {
            const response = await this.client.auth.test();
            this.checkResponse(response);
            return {
                user_id: response.user_id,
                team_id: response.team_id,
                user: response.user,
                team: response.team,
            };
        });
    }
    async listChannels() {
        return this.withRetry(async () => {
            const channels = [];
            let cursor;
            do {
                const response = await this.client.conversations.list({
                    cursor,
                    limit: 200,
                    types: 'public_channel,private_channel',
                });
                this.checkResponse(response);
                if (response.channels) {
                    for (const ch of response.channels) {
                        channels.push({
                            id: ch.id,
                            name: ch.name,
                            is_private: ch.is_private || false,
                            is_archived: ch.is_archived || false,
                            created: ch.created || 0,
                            creator: ch.creator || '',
                            topic: ch.topic
                                ? {
                                    value: ch.topic.value || '',
                                    creator: ch.topic.creator || '',
                                    last_set: ch.topic.last_set || 0,
                                }
                                : undefined,
                            purpose: ch.purpose
                                ? {
                                    value: ch.purpose.value || '',
                                    creator: ch.purpose.creator || '',
                                    last_set: ch.purpose.last_set || 0,
                                }
                                : undefined,
                        });
                    }
                }
                cursor = response.response_metadata?.next_cursor;
            } while (cursor);
            return channels;
        });
    }
    async getChannel(id) {
        return this.withRetry(async () => {
            const response = await this.client.conversations.info({ channel: id });
            this.checkResponse(response);
            const ch = response.channel;
            return {
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private || false,
                is_archived: ch.is_archived || false,
                created: ch.created || 0,
                creator: ch.creator || '',
                topic: ch.topic
                    ? {
                        value: ch.topic.value || '',
                        creator: ch.topic.creator || '',
                        last_set: ch.topic.last_set || 0,
                    }
                    : undefined,
                purpose: ch.purpose
                    ? {
                        value: ch.purpose.value || '',
                        creator: ch.purpose.creator || '',
                        last_set: ch.purpose.last_set || 0,
                    }
                    : undefined,
            };
        });
    }
    async sendMessage(channel, text, threadTs) {
        return this.withRetry(async () => {
            const response = await this.client.chat.postMessage({
                channel,
                text,
                thread_ts: threadTs,
            });
            this.checkResponse(response);
            const msg = response.message;
            return {
                ts: response.ts,
                text: msg.text || text,
                type: msg.type || 'message',
                user: msg.user,
                thread_ts: msg.thread_ts,
            };
        });
    }
    async getMessages(channel, limit = 20) {
        return this.withRetry(async () => {
            const response = await this.client.conversations.history({
                channel,
                limit,
            });
            this.checkResponse(response);
            return (response.messages || []).map((msg) => ({
                ts: msg.ts,
                text: msg.text || '',
                type: msg.type || 'message',
                user: msg.user,
                username: msg.username,
                thread_ts: msg.thread_ts,
                reply_count: msg.reply_count,
                replies: msg.replies,
                edited: msg.edited
                    ? {
                        user: msg.edited.user || '',
                        ts: msg.edited.ts || '',
                    }
                    : undefined,
            }));
        });
    }
    async getMessage(channel, ts) {
        return this.withRetry(async () => {
            const response = await this.client.conversations.history({
                channel,
                oldest: ts,
                inclusive: true,
                limit: 1,
            });
            this.checkResponse(response);
            const msg = response.messages?.[0];
            if (!msg || msg.ts !== ts) {
                return null;
            }
            return {
                ts: msg.ts,
                text: msg.text || '',
                type: msg.type || 'message',
                user: msg.user,
                username: msg.username,
                thread_ts: msg.thread_ts,
                reply_count: msg.reply_count,
                replies: msg.replies,
                edited: msg.edited
                    ? {
                        user: msg.edited.user || '',
                        ts: msg.edited.ts || '',
                    }
                    : undefined,
            };
        });
    }
    async updateMessage(channel, ts, text) {
        return this.withRetry(async () => {
            const response = await this.client.chat.update({
                channel,
                ts,
                text,
            });
            this.checkResponse(response);
            const msg = response.message;
            return {
                ts: response.ts,
                text: msg.text || text,
                type: 'message',
                user: msg.user,
            };
        });
    }
    async deleteMessage(channel, ts) {
        return this.withRetry(async () => {
            const response = await this.client.chat.delete({
                channel,
                ts,
            });
            this.checkResponse(response);
        });
    }
    async addReaction(channel, ts, emoji) {
        return this.withRetry(async () => {
            const response = await this.client.reactions.add({
                channel,
                timestamp: ts,
                name: emoji,
            });
            this.checkResponse(response);
        });
    }
    async removeReaction(channel, ts, emoji) {
        return this.withRetry(async () => {
            const response = await this.client.reactions.remove({
                channel,
                timestamp: ts,
                name: emoji,
            });
            this.checkResponse(response);
        });
    }
    async listUsers() {
        return this.withRetry(async () => {
            const users = [];
            let cursor;
            do {
                const response = await this.client.users.list({
                    cursor,
                    limit: 200,
                });
                this.checkResponse(response);
                if (response.members) {
                    for (const member of response.members) {
                        users.push({
                            id: member.id,
                            name: member.name,
                            real_name: member.real_name || member.name || '',
                            is_admin: member.is_admin || false,
                            is_owner: member.is_owner || false,
                            is_bot: member.is_bot || false,
                            is_app_user: member.is_app_user || false,
                            profile: member.profile
                                ? {
                                    email: member.profile.email,
                                    phone: member.profile.phone,
                                    title: member.profile.title,
                                    status_text: member.profile.status_text,
                                }
                                : undefined,
                        });
                    }
                }
                cursor = response.response_metadata?.next_cursor;
            } while (cursor);
            return users;
        });
    }
    async getUser(id) {
        return this.withRetry(async () => {
            const response = await this.client.users.info({ user: id });
            this.checkResponse(response);
            const member = response.user;
            return {
                id: member.id,
                name: member.name,
                real_name: member.real_name || member.name || '',
                is_admin: member.is_admin || false,
                is_owner: member.is_owner || false,
                is_bot: member.is_bot || false,
                is_app_user: member.is_app_user || false,
                profile: member.profile
                    ? {
                        email: member.profile.email,
                        phone: member.profile.phone,
                        title: member.profile.title,
                        status_text: member.profile.status_text,
                    }
                    : undefined,
            };
        });
    }
    async uploadFile(channels, file, filename) {
        return this.withRetry(async () => {
            const response = await this.client.files.uploadV2({
                channel_id: channels[0],
                file,
                filename,
            });
            this.checkResponse(response);
            const f = response.file;
            return {
                id: f.id,
                name: f.name,
                title: f.title || f.name || '',
                mimetype: f.mimetype || 'application/octet-stream',
                size: f.size || 0,
                url_private: f.url_private || '',
                created: f.created || 0,
                user: f.user || '',
                channels: f.channels,
            };
        });
    }
    async listFiles(channel) {
        return this.withRetry(async () => {
            const response = await this.client.files.list({
                channel,
            });
            this.checkResponse(response);
            return (response.files || []).map((f) => ({
                id: f.id,
                name: f.name,
                title: f.title || f.name || '',
                mimetype: f.mimetype || 'application/octet-stream',
                size: f.size || 0,
                url_private: f.url_private || '',
                created: f.created || 0,
                user: f.user || '',
                channels: f.channels,
            }));
        });
    }
    async searchMessages(query, options = {}) {
        return this.withRetry(async () => {
            const response = await this.client.search.messages({
                query,
                sort: options.sort || 'timestamp',
                sort_dir: options.sortDir || 'desc',
                count: options.count || 20,
            });
            this.checkResponse(response);
            const matches = response.messages?.matches || [];
            return matches.map((match) => ({
                ts: match.ts,
                text: match.text || '',
                user: match.user,
                username: match.username,
                channel: {
                    id: match.channel?.id || '',
                    name: match.channel?.name || '',
                },
                permalink: match.permalink || '',
            }));
        });
    }
    async getThreadReplies(channel, threadTs, options = {}) {
        return this.withRetry(async () => {
            const response = await this.client.conversations.replies({
                channel,
                ts: threadTs,
                limit: options.limit || 100,
                oldest: options.oldest,
                latest: options.latest,
                cursor: options.cursor,
            });
            this.checkResponse(response);
            const messages = (response.messages || []).map((msg) => ({
                ts: msg.ts,
                text: msg.text || '',
                type: msg.type || 'message',
                user: msg.user,
                username: msg.username,
                thread_ts: msg.thread_ts,
                reply_count: msg.reply_count,
                edited: msg.edited
                    ? {
                        user: msg.edited.user || '',
                        ts: msg.edited.ts || '',
                    }
                    : undefined,
            }));
            return {
                messages,
                has_more: response.has_more || false,
                next_cursor: response.response_metadata?.next_cursor,
            };
        });
    }
    async getUnreadCounts() {
        return this.withRetry(async () => {
            const response = await this.client.client.counts();
            this.checkResponse(response);
            const channels = (response.channels || []).map((ch) => ({
                id: ch.id || '',
                name: ch.name || '',
                unread_count: ch.unread_count || 0,
                mention_count: ch.mention_count || 0,
            }));
            return {
                channels,
                total_unread: channels.reduce((sum, ch) => sum + ch.unread_count, 0),
                total_mentions: channels.reduce((sum, ch) => sum + ch.mention_count, 0),
            };
        });
    }
    async getThreadView(channelId, ts) {
        return this.withRetry(async () => {
            const response = await this.client.subscriptions.thread.getView({
                channel: channelId,
                thread_ts: ts,
            });
            this.checkResponse(response);
            const view = response.view;
            return {
                channel_id: view.channel_id || channelId,
                thread_ts: view.thread_ts || ts,
                unread_count: view.unread_count || 0,
                last_read: view.last_read || '',
                subscribed: view.subscribed || false,
            };
        });
    }
    async markRead(channelId, ts) {
        return this.withRetry(async () => {
            const response = await this.client.conversations.mark({
                channel: channelId,
                ts,
            });
            this.checkResponse(response);
        });
    }
    async getActivityFeed(options) {
        return this.withRetry(async () => {
            const response = await this.client.activity.feed({
                types: options?.types,
                mode: options?.mode || 'chrono_reads_and_unreads',
                limit: options?.limit || 20,
            });
            this.checkResponse(response);
            const items = (response.items || []).map((item) => ({
                id: item.id || '',
                type: item.type || '',
                channel: item.channel || '',
                ts: item.ts || '',
                text: item.text || '',
                user: item.user || '',
                created: item.created || 0,
            }));
            return items;
        });
    }
    async getSavedItems(cursor) {
        return this.withRetry(async () => {
            const response = await this.client.apiCall('saved.list', {
                cursor,
                limit: 100,
            });
            this.checkResponse(response);
            const items = (response.items || []).map((item) => ({
                type: item.type || 'message',
                message: {
                    ts: item.message?.ts || '',
                    text: item.message?.text || '',
                    user: item.message?.user,
                    username: item.message?.username,
                    type: item.message?.type || 'message',
                    thread_ts: item.message?.thread_ts,
                    reply_count: item.message?.reply_count,
                    replies: item.message?.replies,
                    edited: item.message?.edited
                        ? {
                            user: item.message.edited.user || '',
                            ts: item.message.edited.ts || '',
                        }
                        : undefined,
                },
                channel: {
                    id: item.channel?.id || '',
                    name: item.channel?.name || '',
                },
                date_created: item.date_created || 0,
            }));
            return {
                items,
                has_more: response.has_more || false,
                next_cursor: response.response_metadata?.next_cursor,
            };
        });
    }
    async getChannelSections() {
        return this.withRetry(async () => {
            const response = await this.client.apiCall('users.channelSections.list');
            this.checkResponse(response);
            const sections = response.channel_sections || [];
            return sections.map((section) => ({
                id: section.id,
                name: section.name || '',
                channel_ids: section.channel_ids || [],
                date_created: section.date_created || 0,
                date_updated: section.date_updated || 0,
            }));
        });
    }
    async getDrafts(cursor) {
        return this.withRetry(async () => {
            const response = await this.client.apiCall('drafts.list', {
                cursor,
            });
            this.checkResponse(response);
            const drafts = (response.drafts || []).map((draft) => ({
                id: draft.id || '',
                channel_id: draft.channel_id || '',
                message: draft.message || null,
                date_created: draft.date_created || 0,
                date_updated: draft.date_updated || 0,
            }));
            return {
                drafts,
                next_cursor: response.response_metadata?.next_cursor,
            };
        });
    }
}
//# sourceMappingURL=client.js.map