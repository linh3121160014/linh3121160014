import { Client } from '@discordjs/core';
import { REST, DefaultRestOptions } from '@discordjs/rest';
import { WebSocketManager, WebSocketShard } from '@discordjs/ws';
import { GatewayOpcodes } from 'discord-api-types/v10';
import { randomUUID } from 'node:crypto';

/**
 * Quest task types supported by Discord quests.
 * @readonly
 * @enum {string}
 */
export const TaskType = Object.freeze({
    WATCH_VIDEO: 'WATCH_VIDEO',
    PLAY_ON_DESKTOP: 'PLAY_ON_DESKTOP',
    STREAM_ON_DESKTOP: 'STREAM_ON_DESKTOP',
    PLAY_ACTIVITY: 'PLAY_ACTIVITY',
    WATCH_VIDEO_ON_MOBILE: 'WATCH_VIDEO_ON_MOBILE',
});

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9215 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36';

// Quest ID excluded from automation (e.g. unsupported or problematic quest)
const EXCLUDED_QUEST_ID = '1412491570820812933';

// Configurable locale and timezone (can be overridden via DISCORD_LOCALE / DISCORD_TIMEZONE env vars)
const DISCORD_LOCALE = process.env.DISCORD_LOCALE || 'en-US';
const DISCORD_TIMEZONE = process.env.DISCORD_TIMEZONE || 'Asia/Saigon';

const CLIENT_PROPS = {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: '1.0.9215',
    os_version: '10.0.19045',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-US',
    has_client_mods: false,
    client_launch_id: randomUUID(),
    browser_user_agent: USER_AGENT,
    browser_version: '37.6.0',
    os_sdk_version: '19045',
    client_build_number: 471091,
    native_build_number: 72186,
    client_event_source: null,
    launch_signature: randomUUID(),
    client_heartbeat_session_id: randomUUID(),
    client_app_state: 'focused',
};

/**
 * Represents a single Discord Quest.
 */
export class Quest {
    #raw;

    constructor(raw) {
        this.#raw = raw;
    }

    static from(raw) {
        return new Quest(raw);
    }

    get id() { return this.#raw.id; }
    get config() { return this.#raw.config; }
    get userStatus() { return this.#raw.user_status; }
    get preview() { return this.#raw.preview; }

    isExpired(now = new Date()) {
        return now.getTime() > new Date(this.#raw.config.expires_at).getTime();
    }

    isCompleted() {
        return Boolean(this.userStatus?.completed_at);
    }

    isEnrolled() {
        return Boolean(this.userStatus?.enrolled_at);
    }

    isClaimed() {
        return Boolean(this.userStatus?.claimed_at);
    }

    refreshStatus(status) {
        this.#raw.user_status = status;
    }

    detectTaskType() {
        const tasks = this.config.task_config?.tasks;
        if (!tasks) return null;
        return [
            TaskType.WATCH_VIDEO,
            TaskType.PLAY_ON_DESKTOP,
            TaskType.STREAM_ON_DESKTOP,
            TaskType.PLAY_ACTIVITY,
            TaskType.WATCH_VIDEO_ON_MOBILE,
        ].find((t) => tasks[t] != null) ?? null;
    }

    getTarget() {
        const taskType = this.detectTaskType();
        if (!taskType) return 900;
        return this.config.task_config.tasks[taskType]?.target ?? 900;
    }

    getProgress() {
        const taskType = this.detectTaskType();
        if (!taskType) return 0;
        return this.userStatus?.progress?.[taskType]?.value ?? 0;
    }

    getRemaining() {
        return Math.max(0, this.getTarget() - this.getProgress());
    }

    getRewardLabel() {
        const rewards = this.config.rewards_config?.rewards;
        if (!rewards?.length) return 'Unknown';
        if (rewards[0].orb_quantity) return `${rewards[0].orb_quantity} Orbs`;
        return rewards[0].messages?.name ?? 'Unknown';
    }

    get name() {
        return this.config.messages.quest_name?.trim() || this.id;
    }
}

async function patchedFetch(url, init) {
    if (init.headers) {
        const h = new Headers(init.headers);
        if (h.has('User-Agent')) h.set('User-Agent', USER_AGENT);
        if (h.has('Authorization')) h.set('Authorization', h.get('Authorization').replace('Bot ', ''));
        h.append('accept-language', DISCORD_LOCALE.split('-')[0]);
        h.append('origin', 'https://discord.com');
        h.append('pragma', 'no-cache');
        h.append('priority', 'u=1, i');
        h.append('referer', 'https://discord.com/channels/@me');
        h.append('sec-ch-ua', '"Not)A;Brand";v="8", "Chromium";v="138"');
        h.append('sec-ch-ua-mobile', '?0');
        h.append('sec-ch-ua-platform', '"Windows"');
        h.append('sec-fetch-dest', 'empty');
        h.append('sec-fetch-mode', 'cors');
        h.append('sec-fetch-site', 'same-origin');
        h.append('x-debug-options', 'bugReporterEnabled');
        h.append('x-discord-locale', DISCORD_LOCALE);
        h.append('x-discord-timezone', DISCORD_TIMEZONE);
        h.append('x-super-properties', Buffer.from(JSON.stringify(CLIENT_PROPS)).toString('base64'));
        init.headers = h;
    }
    return DefaultRestOptions.makeRequest(url, init);
}

const origSend = WebSocketShard.prototype.send;
WebSocketShard.prototype.send = async function (payload) {
    if (payload.op === GatewayOpcodes.Identify) {
        payload.d = {
            token: payload.d.token,
            properties: { ...CLIENT_PROPS, is_fast_connect: false, gateway_connect_reasons: 'AppSkeleton' },
            capabilities: 0,
            presence: payload.d.presence,
            compress: payload.d.compress,
            client_state: { guild_versions: {} },
        };
    }
    return origSend.call(this, payload);
};

/**
 * Main HieuTool client that wraps the Discord Client.
 */
export class HieuTool extends Client {
    quests = null;

    constructor(token) {
        const rest = new REST({ version: '10', makeRequest: patchedFetch }).setToken(token);
        const gw = new WebSocketManager({ token, intents: 0, rest });
        gw.fetchGatewayInformation = () =>
            Promise.resolve({
                url: 'wss://gateway.discord.gg',
                shards: 1,
                session_start_limit: { total: 1000, remaining: 1000, reset_after: 14400000, max_concurrency: 1 },
            });
        super({ rest, gateway: gw });
        this.ws = gw;
    }

    start() {
        return this.ws.connect();
    }

    async loadQuests() {
        const res = await this.rest.get('/quests/@me');
        this.quests = new QuestStore(this, res.quests.map((q) => Quest.from(q)));
        return this.quests;
    }

    async getBalance() {
        return this.rest.get('/users/@me/virtual-currency/balance');
    }

    async claimReward(questId) {
        return this.rest.post(`/quests/${questId}/claim-reward`, { body: {} });
    }
}

/**
 * Manages a collection of Quests and orchestrates their execution.
 */
export class QuestStore {
    #pool = new Map();
    #engine;

    constructor(engine, list = []) {
        this.#engine = engine;
        list.forEach((q) => this.#pool.set(q.id, q));
    }

    [Symbol.iterator]() { return this.#pool.values(); }
    get count() { return this.#pool.size; }
    all() { return Array.from(this.#pool.values()); }
    find(id) { return this.#pool.get(id); }

    pending() {
        return this.all().filter((q) =>
            q.id !== EXCLUDED_QUEST_ID && !q.isCompleted() && !q.isExpired(),
        );
    }

    claimable() {
        return this.all().filter((q) => q.isCompleted() && !q.isClaimed());
    }

    async enroll(questId) {
        const res = await this.#engine.rest.post(`/quests/${questId}/enroll`, {
            body: { location: 11, is_targeted: false, metadata_raw: null },
        });
        this.find(questId)?.refreshStatus(res);
    }

    async grabReward(questId) {
        try {
            return await this.#engine.claimReward(questId);
        } catch {
            return null;
        }
    }

    async grabAllRewards() {
        for (const q of this.claimable()) {
            await this.grabReward(q.id);
        }
    }

    #sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async execute(quest) {
        const taskType = quest.detectTaskType();
        if (!taskType) return;

        if (!quest.isEnrolled()) {
            await this.enroll(quest.id);
        }

        const target = quest.getTarget();
        let done = quest.getProgress();

        if (taskType === TaskType.WATCH_VIDEO || taskType === TaskType.WATCH_VIDEO_ON_MOBILE) {
            const enrolledAt = new Date(quest.userStatus?.enrolled_at).getTime();
            let finished = false;

            while (true) {
                const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + 10;
                const diff = maxAllowed - done;
                const next = done + 7;

                if (diff >= 7) {
                    // Add a small fractional offset (0–1s) to simulate realistic non-integer playback timestamps
                    const res = await this.#engine.rest.post(`/quests/${quest.id}/video-progress`, {
                        body: { timestamp: Math.min(target, next + Math.random()) },
                    });
                    finished = res.completed_at != null;
                    done = Math.min(target, next);
                }

                if (next >= target) break;
                await this.#sleep(1000);
            }

            if (!finished) {
                await this.#engine.rest.post(`/quests/${quest.id}/video-progress`, {
                    body: { timestamp: target },
                });
            }
        } else if (taskType === TaskType.PLAY_ON_DESKTOP) {
            while (!quest.isCompleted()) {
                const res = await this.#engine.rest.post(`/quests/${quest.id}/heartbeat`, {
                    body: { application_id: quest.config.application.id, terminal: false },
                });
                quest.refreshStatus(res);
                await this.#sleep(60_000);
            }
            const res = await this.#engine.rest.post(`/quests/${quest.id}/heartbeat`, {
                body: { application_id: quest.config.application.id, terminal: true },
            });
            quest.refreshStatus(res);
        } else {
            return;
        }

        await this.grabReward(quest.id);
    }
}
