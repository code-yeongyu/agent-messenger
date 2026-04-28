<div align="center">

# Agent Messenger

[![npm](https://img.shields.io/npm/v/agent-messenger?color=E67E22)](https://www.npmjs.com/package/agent-messenger) [![platform](https://img.shields.io/badge/platform-slack-4A154B)](https://agent-messenger.dev/docs/cli/slack) [![platform](https://img.shields.io/badge/platform-discord-5865F2)](https://agent-messenger.dev/docs/cli/discord) [![platform](https://img.shields.io/badge/platform-teams-6264A7)](https://agent-messenger.dev/docs/cli/teams) [![platform](https://img.shields.io/badge/platform-webex-00BCF2)](https://agent-messenger.dev/docs/cli/webex) [![platform](https://img.shields.io/badge/platform-telegram-2AABEE)](https://agent-messenger.dev/docs/cli/telegram) [![platform](https://img.shields.io/badge/platform-whatsapp-25D366)](https://agent-messenger.dev/docs/cli/whatsapp) [![platform](https://img.shields.io/badge/platform-line-06C755)](https://agent-messenger.dev/docs/cli/line) [![platform](https://img.shields.io/badge/platform-instagram-E4405F)](https://agent-messenger.dev/docs/cli/instagram) [![platform](https://img.shields.io/badge/platform-kakaotalk-FEE500)](https://agent-messenger.dev/docs/cli/kakaotalk) [![platform](https://img.shields.io/badge/platform-channel_talk-3B3FE4)](https://agent-messenger.dev/docs/cli/channeltalk)

**Your agent messages as you — not as a bot**

</div>

One CLI for Slack, Discord, Teams, Webex, Telegram, WhatsApp, LINE, Instagram, KakaoTalk, and Channel Talk. Credentials extracted from desktop apps and browsers, or authenticated in seconds — no API keys, no OAuth, no admin approval. TypeScript SDK included.

## Table of Contents

- [Why Agent Messenger?](#why-agent-messenger)
- [Installation](#installation)
- [Agent Skills](#agent-skills)
  - [SkillPad](#skillpad)
  - [Skills CLI](#skills-cli)
  - [Claude Code Plugin](#claude-code-plugin)
- [Quick Start](#quick-start)
- [SDK](#sdk)
- [TUI (Experimental)](#tui-experimental)
- [Access Control](#access-control)
- [Supported Platforms](#supported-platforms)
- [Platform Guides](#platform-guides)
- [Use Cases](#use-cases)
  - [Gathering Context](#gathering-context)
  - [Communicating & Reporting](#communicating--reporting)
  - [Automation & Pipelines](#automation--pipelines)
  - [...and More](#and-more)
- [Philosophy](#philosophy)
- [Contributing](#contributing)
- [Thanks](#thanks)
- [License](#license)

## Why Agent Messenger?

**You shouldn't need a bot token to send a message.**

Every platform gates API access behind OAuth apps that need admin approval — days of waiting just to send a message. And even then, your agent is a **bot**, not you. Different name, different permissions, different context.

Agent Messenger reads session tokens from your Slack, Discord, Teams, KakaoTalk, or Channel Talk desktop app — zero config. If the desktop app isn't installed, it falls back to extracting from Chromium browsers. Webex and Instagram tokens are extracted directly from browsers. Telegram authenticates with a one-time phone code, and WhatsApp with a QR code or pairing code. Either way, your agent operates **as you** — same name, same permissions, same context. Bot tokens are fully supported too for server-side and CI/CD use cases.

- **Auto-Extract Auth** — Reads tokens from Slack, Discord, Teams, KakaoTalk, and Channel Talk desktop apps, with browser fallback. Webex and Instagram tokens extracted from Chromium browsers. Telegram and WhatsApp authenticate with a one-time code — still under a minute
- **Act As Yourself** — Extracts your user session — not a bot token. Your agent sends messages, reacts, and searches as you. Need bot mode? Bot CLIs are included too
- **One Interface** — Consistent command style across 7 platforms for supported actions (e.g. message send, message search, channel list, snapshot). Learn once
- **Agent-Native Output** — JSON by default for LLM tool use. `--pretty` for human-readable. Structured output your agent can parse and act on
- **Token Efficient** — CLI, not MCP. One skill file, one shell command per action. No server to run, no tool registration. ([Why not MCP?](#philosophy))
- **Persistent Memory** — Stores workspace IDs, channel mappings, and preferences in ~/.config so your agent never asks twice
- **TypeScript SDK** — Import clients directly into your app. Full type safety with Zod schemas

## Installation

**CLI** (global install for terminal / AI agent use):

```bash
npm install -g agent-messenger
```

**SDK** (project dependency for programmatic use):

```bash
npm install agent-messenger
```

The global install gives you all platform CLIs. The project install gives you both CLIs and the TypeScript SDK.

This installs:

- `agent-slack` — Slack CLI (user token, zero-config)
- `agent-slackbot` — Slack Bot CLI (bot token, for server-side/CI/CD)
- `agent-discord` — Discord CLI
- `agent-discordbot` — Discord Bot CLI (bot token, for server-side/CI/CD)
- `agent-teams` — Microsoft Teams CLI
- `agent-webex` — Cisco Webex CLI (browser token extraction with e2e encryption + OAuth Device Grant, zero-config)
- `agent-telegram` — Telegram CLI (user account via TDLib)
- `agent-whatsapp` — WhatsApp CLI (user account via Baileys, QR code or pairing code auth)
- `agent-whatsappbot` — WhatsApp Bot CLI (Cloud API, for server-side/CI/CD)
- `agent-line` — LINE CLI (QR code login, Thrift protocol)
- `agent-wechatbot` — WeChat Bot CLI (Official Account API, for server-side/CI/CD)
- `agent-instagram` — Instagram DM CLI (browser cookie extraction + username/password auth)
- `agent-kakaotalk` — KakaoTalk CLI (sub-device login, LOCO protocol)
- `agent-channeltalk` — Channel Talk CLI (beta, zero-config, extracted cookies)
- `agent-channeltalkbot` — Channel Talk Bot CLI (beta, API credentials, for server-side/CI/CD)

## Agent Skills

Agent Messenger includes [Agent Skills](https://agentskills.io/) that teach your AI agent how to use each CLI above. One skill per CLI — install only what you need.

### SkillPad

SkillPad is a GUI app for Agent Skills. See [skillpad.dev](https://skillpad.dev/) for more details.

[![Available on SkillPad](https://badge.skillpad.dev/agent-slack/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-slack) [![Available on SkillPad](https://badge.skillpad.dev/agent-slackbot/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-slackbot) [![Available on SkillPad](https://badge.skillpad.dev/agent-discord/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-discord) [![Available on SkillPad](https://badge.skillpad.dev/agent-discordbot/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-discordbot) [![Available on SkillPad](https://badge.skillpad.dev/agent-teams/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-teams) [![Available on SkillPad](https://badge.skillpad.dev/agent-webex/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-webex) [![Available on SkillPad](https://badge.skillpad.dev/agent-telegram/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-telegram) [![Available on SkillPad](https://badge.skillpad.dev/agent-whatsapp/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-whatsapp) [![Available on SkillPad](https://badge.skillpad.dev/agent-whatsappbot/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-whatsappbot) [![Available on SkillPad](https://badge.skillpad.dev/agent-line/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-line) [![Available on SkillPad](https://badge.skillpad.dev/agent-wechatbot/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-wechatbot) [![Available on SkillPad](https://badge.skillpad.dev/agent-instagram/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-instagram) [![Available on SkillPad](https://badge.skillpad.dev/agent-kakaotalk/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-kakaotalk) [![Available on SkillPad](https://badge.skillpad.dev/agent-channeltalk/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-channeltalk) [![Available on SkillPad](https://badge.skillpad.dev/agent-channeltalkbot/dark.svg)](https://skillpad.dev/install/agent-messenger/agent-messenger/agent-channeltalkbot)

### Skills CLI

Skills CLI is a CLI tool for Agent Skills. See [skills.sh](https://skills.sh/) for more details.

```bash
npx -y skills add agent-messenger/agent-messenger
```

### Claude Code Plugin

```bash
claude plugin marketplace add agent-messenger/agent-messenger
claude plugin install agent-messenger
```

Or within Claude Code:

```
/plugin marketplace add agent-messenger/agent-messenger
/plugin install agent-messenger
```

## Quick Start

Get up and running in 30 seconds:

```bash
# 1. See your workspace at a glance
agent-slack snapshot --pretty

# 2. Send a message
agent-slack message send general "Hello from the CLI!"
```

That's it. Credentials are extracted automatically from your Slack desktop app on first run. No OAuth flows. No API tokens. No configuration files.

## Telegram Quick Start

Get up and running with Telegram in a minute:

```bash
bunx --package agent-messenger agent-telegram auth login

# Send a message
bunx --package agent-messenger agent-telegram message send <chat-id-or-@username> "Hello from the CLI!"
```

The CLI automatically provisions API credentials via my.telegram.org if needed. For CI/CD, set `AGENT_TELEGRAM_API_ID` and `AGENT_TELEGRAM_API_HASH` environment variables.

## SDK

Use Agent Messenger as a TypeScript library. Each platform exports a typed client, credential manager, types, and Zod schemas.

### Quick Example

```typescript
import { SlackClient } from 'agent-messenger/slack'

const slack = await new SlackClient().login()
const channels = await slack.listChannels()
await slack.sendMessage(channels[0].id, 'Hello from the SDK!')
```

Credentials are resolved the same way as the CLI — auto-extracted from your desktop apps. Call `.login()` with no arguments for auto-extraction, or pass credentials explicitly:

```typescript
const slack = await new SlackClient().login({ token: 'xoxc-...', cookie: 'xoxd-...' })
```

### Available Imports

| Import Path | Client |
| --- | --- |
| `agent-messenger/slack` | `SlackClient` |
| `agent-messenger/slackbot` | `SlackBotClient` |
| `agent-messenger/discord` | `DiscordClient` |
| `agent-messenger/discordbot` | `DiscordBotClient` |
| `agent-messenger/teams` | `TeamsClient` |
| `agent-messenger/webex` | `WebexClient` |
| `agent-messenger/whatsapp` | `WhatsAppClient` |
| `agent-messenger/whatsappbot` | `WhatsAppBotClient` |
| `agent-messenger/line` | `LineClient` |
| `agent-messenger/wechatbot` | `WeChatBotClient` |
| `agent-messenger/instagram` | `InstagramClient` |
| `agent-messenger/kakaotalk` | `KakaoTalkClient` |
| `agent-messenger/channeltalk` | `ChannelClient` |
| `agent-messenger/channeltalkbot` | `ChannelBotClient` |

Each module also exports its credential manager, Zod schemas, and TypeScript types:

```typescript
import { SlackClient, SlackCredentialManager, SlackMessageSchema } from 'agent-messenger/slack'
import type { SlackMessage, SlackChannel } from 'agent-messenger/slack'
```

### Manual Credential Setup

Every client supports `.login()` with explicit credentials for advanced use cases:

```typescript
import { SlackClient } from 'agent-messenger/slack'

const client = await new SlackClient().login({ token: 'xoxc-...', cookie: 'xoxd-...' })
const messages = await client.getMessages('C01234567')
```

### Real-time Events (Slack)

```typescript
import { SlackClient, SlackListener } from 'agent-messenger/slack'

const client = await new SlackClient().login()
const listener = new SlackListener(client)
listener.on('message', (event) => {
  console.log(`New message in ${event.channel}: ${event.text}`)
})
await listener.start()
```

### Real-time Events (KakaoTalk)

```typescript
import { KakaoTalkClient, KakaoTalkListener } from 'agent-messenger/kakaotalk'

const client = await new KakaoTalkClient().login()
const listener = new KakaoTalkListener(client)
listener.on('message', (event) => {
  console.log(`New message in ${event.chat_id}: ${event.message}`)
})
await listener.start()
```

## TUI (Experimental)

A unified terminal interface for all your messaging platforms in one screen. Navigate between Slack, Discord, Teams, Webex, Telegram, WhatsApp, LINE, Instagram, KakaoTalk, and Channel Talk — all from your terminal.

> **Note**: The TUI is a showcase of what's possible with Agent Messenger's SDK. It demonstrates the power of having a unified adapter layer across all platforms.

```bash
agent-messenger tui
```

![Agent Messenger TUI](docs/public/tui.png)

Key features:
- **Multi-platform** — All 10 platforms in one sidebar, auto-login on startup
- **Real-time messages** — Live message streaming for supported platforms
- **Fuzzy pickers** — `Ctrl+K` for channels, `Ctrl+W` for workspaces
- **Interactive auth** — Authenticate platforms that aren't set up yet, right in the TUI

See the [TUI docs](https://agent-messenger.dev/docs/tui) for keybindings, architecture, and more.

## Access Control

When agents act with your full credentials, you may want to keep certain channels — personal DMs, private channels, sensitive users — completely off-limits. A deny-list policy file lets you block reads and writes by channel type, channel ID, or user ID without changing any code.

Drop a `policy.json` at `~/.config/agent-messenger/policy.json` (override via `AGENT_MESSENGER_POLICY_FILE`):

```json
{
  "slack": {
    "read":  { "deny": { "channelTypes": ["dm", "mpim"] } },
    "write": { "deny": { "channelTypes": ["dm", "mpim", "private"] } }
  },
  "discord": {
    "write": { "deny": { "userIds": ["123456789012345678"] } }
  }
}
```

Each platform key supports `read` and `write` rules. Both accept a `deny` object with optional `channelTypes`, `channelIds`, and `userIds`. v1 is deny-only — there is no allow-list mode.

`channelTypes` values per platform:

| Platform | Types |
| --- | --- |
| Slack | `dm`, `mpim`, `private`, `public` |
| Discord | `dm`, `mpim`, `channel` |
| Teams | `channel` |

### Recipe: public-only agent

If you want the agent to only see and post in public channels — never personal DMs, group DMs, or private channels — deny every non-public channel type for both `read` and `write`.

```json
{
  "slack": {
    "read":  { "deny": { "channelTypes": ["dm", "mpim", "private"] } },
    "write": { "deny": { "channelTypes": ["dm", "mpim", "private"] } }
  },
  "discord": {
    "read":  { "deny": { "channelTypes": ["dm", "mpim"] } },
    "write": { "deny": { "channelTypes": ["dm", "mpim"] } }
  }
}
```

**Slack** — list, info, history, message send/update/delete, reactions, files, pins, bookmarks, and `message search` all honor this rule. Public channels remain fully usable.

**Discord** — blocks 1:1 DMs and group DMs. Guild text channels remain accessible because Discord v1 normalizes all guild channels to `channel`. Note: this does NOT separate public/private guild channels (Discord uses permission overwrites — out of scope for v1).

**Teams** — not included on purpose. Teams currently models only `channel` (no DM type) in v1, so a `channelTypes` deny rule for Teams would block everything or nothing. If you need a tighter Teams scope, list specific `channelIds` you want blocked instead.

Semantics:

- `list` operations filter denied items out of the output entirely. `message search` is also filtered when `channelTypes` rules apply
- Single-target reads (`info`, `history`, `get`, `search`) exit 1 with `{"error":"policy: read denied"}`
- Writes (`send`, `update`, `delete`, `react`, etc.) exit 1 with `{"error":"policy: write denied"}`
- Error messages never include target identifiers to avoid information leakage
- No policy file means no restrictions — zero behavior change
- A corrupt policy file fails closed with `{"error":"policy: invalid configuration"}`

Manage the policy from the CLI:

```bash
agent-messenger policy show [--pretty]          # print effective config
agent-messenger policy validate [--file <path>]  # lint a policy file
agent-messenger policy edit                      # open $EDITOR on the policy file
```

`edit` creates an empty `{}` file at mode `0o600` if one doesn't exist.

Out of scope for v1: allow-list mode, content or regex pattern matching, hot-reload, Discord guild public/private split via permission overwrites, Teams DM modeling, audit log of denials, an override flag, and the other 11 platforms (LINE, Telegram, WhatsApp, etc.).

See [AGENTS.md](AGENTS.md#access-control-module) for the contributor view.

## Supported Platforms

| Feature                    | Slack | Discord | Teams | Webex | Telegram | WhatsApp | LINE  | Instagram | KakaoTalk | Channel Talk (beta) |
| -------------------------- | :---: | :-----: | :---: | :---: | :------: | :------: | :---: | :-------: | :-------: | :-----------------: |
| Auto credential extraction |  ✅   |   ✅    |  ✅   |  ✅   |    —     |    —     |   —   |    ✅     |    ✅     |         ✅          |
| Send & list messages       |  ✅   |   ✅    |  ✅   |  ✅   |    ✅     |    ✅     |  ✅   |    ✅     |    ✅     |         ✅          |
| Direct messages            |  ✅   |   ✅    |  ✅   |  ✅   |    ✅     |    ✅     |  ✅   |    ✅     |    ✅     |         ✅          |
| Search messages            |  ✅   |   ✅    |   —   |   —   |    —     |    ✅     |   —   |    ✅     |    —      |         ✅          |
| Threads                    |  ✅   |   ✅    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Channels & Users           |  ✅   |   ✅    |  ✅   |  ✅   | partial  |    —     |  ✅   |     —     |    —      |         ✅          |
| Reactions                  |  ✅   |   ✅    |  ✅   |   —   |    —     |    ✅     |   —   |     —     |    —      |         —           |
| File uploads               |  ✅   |   ✅    |  ✅   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| File downloads             |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Workspace snapshots        |  ✅   |   ✅    |  ✅   |  ✅   |    —     |    —     |   —   |     —     |    —      |         ✅          |
| Multi-workspace / account  |  ✅   |   ✅    |  ✅   |   —   |    ✅     |    ✅     |  ✅   |    ✅     |    ✅     |         ✅          |
| Activity feed              |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Drafts                     |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Saved items                |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Unread messages            |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Sidebar sections           |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Pins & bookmarks           |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Scheduled messages         |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Channel management         |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Reminders                  |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| User groups                |  ✅   |    —    |   —   |   —   |    —     |    —     |   —   |     —     |    —      |         —           |
| Real-time events (SDK)     |  ✅   |    ✅    |   —   |   —   |    —     |    —     |  ✅   |    ✅     |    ✅      |         —           |
| Bot support                |  ✅   |   ✅    |   —   |   —   |    —     |    ✅     |   —   |     —     |    —      |         ✅          |

> ⚠️ **Teams tokens expire in 60-90 minutes.** Re-run `agent-teams auth extract` to refresh. See [Teams Guide](skills/agent-teams/SKILL.md) for details.

## Platform Guides

- **[Slack Guide](https://agent-messenger.dev/docs/cli/slack)** — Full command reference for Slack
- **[Slack Bot Guide](https://agent-messenger.dev/docs/cli/slackbot)** — Bot token integration for server-side and CI/CD
- **[Discord Guide](https://agent-messenger.dev/docs/cli/discord)** — Full command reference for Discord
- **[Discord Bot Guide](https://agent-messenger.dev/docs/cli/discordbot)** — Bot token integration for server-side and CI/CD
- **[Teams Guide](https://agent-messenger.dev/docs/cli/teams)** — Full command reference for Microsoft Teams
- **[Webex Guide](skills/agent-webex/SKILL.md)** — Browser token extraction, OAuth Device Grant auth, and Cisco Webex command reference
- **[Telegram Guide](https://agent-messenger.dev/docs/cli/telegram)** — TDLib setup and Telegram command reference
- **[WhatsApp Guide](https://agent-messenger.dev/docs/cli/whatsapp)** — Baileys-based WhatsApp integration via QR code or pairing code
- **[WhatsApp Bot Guide](https://agent-messenger.dev/docs/cli/whatsappbot)** — Cloud API integration for WhatsApp Business
- **[LINE Guide](https://agent-messenger.dev/docs/cli/line)** — QR code login and Thrift protocol integration
- **[WeChat Bot Guide](https://agent-messenger.dev/docs/cli/wechatbot)** — Official Account API integration for WeChat
- **[Instagram Guide](https://agent-messenger.dev/docs/cli/instagram)** — Browser cookie extraction and Instagram DM integration
- **[KakaoTalk Guide](https://agent-messenger.dev/docs/cli/kakaotalk)** — Sub-device login and LOCO protocol integration
- **[Channel Talk Guide](https://agent-messenger.dev/docs/cli/channeltalk)** — Full command reference for Channel Talk (beta, zero-config)
- **[Channel Talk Bot Guide](https://agent-messenger.dev/docs/cli/channeltalkbot)** — Bot API integration for Channel Talk (beta)

## Use Cases

### Gathering Context

Pull context from conversations before you start working — no tab-switching, no skimming.

> "Read the #incident-api-outage thread in Slack and summarize the root cause, timeline, and action items so I can write the postmortem."

> "Search our Discord #architecture channel for any previous discussion about event sourcing before I write a proposal."

> "Check my unread messages across all Slack channels and tell me if anything needs my attention."

> "Look through #frontend in Slack for messages about the login page redesign from the past two weeks and summarize the decisions made."

> "Search Teams for any messages mentioning 'API deprecation' so I know if this was discussed before."

### Communicating & Reporting

Send updates, file reports, and notify your team — all from a prompt.

> "Post a deployment summary to #releases in Slack with the commit hash, changelog, and deploy status."

> "Send a message to the #standup channel with what I worked on yesterday, what I'm doing today, and any blockers."

> "Cross-post this announcement to #general in Slack, the announcements channel in Discord, and the General channel in Teams."

> "Upload the latest test coverage report to #ci-results in Slack."

> "React with ✅ to the last message in #deploy-requests to confirm I've handled it."

### Automation & Pipelines

Wire messaging into your CI, scripts, or agent workflows.

> "After every CI run, post the build status and test results to #builds in Slack — include the branch name and commit link."

> "When a long-running migration finishes, notify me in Discord with the final row count and elapsed time."

> "Every morning at 9am, snapshot my Slack workspace and post a summary of active channels to #team-pulse."

> "Send an alert to #oncall in Slack whenever the error rate exceeds 1% — include the service name and a link to the dashboard."

> "Read the latest message in #releases, then cross-post it to our Discord announcements channel."

### ...and More

These are just starting points. Your agent has full read/write access to Slack, Discord, Teams, Telegram, WhatsApp, LINE, Instagram, KakaoTalk, and Channel Talk — anything you'd do manually in a chat app, it can handle for you. If you build something cool with Agent Messenger, [let me know](https://x.com/devxoul)!

## Philosophy

### Why CLI, not MCP?

MCP servers expose all tools at once, bloating context and confusing agents.

| MCP Approach | Agent Skills + CLI |
| --- | --- |
| All tools loaded at once | Load only what you need |
| Bloated context window | Minimal token usage |
| Agent confused by options | Focused, relevant tools |
| Requires a running server | One shell command per action |

With Agent Messenger, your agent loads the skill it needs, uses the CLI, and moves on. No wasted tokens. The SDK complements the CLI for when you need programmatic access—same credentials, same platform coverage, full type safety.

### Why not OAuth?

OAuth requires creating an app and workspace admin approval—days of waiting just to send a message. Agent Messenger skips all of that. Your desktop apps already have valid session tokens; Agent Messenger extracts them directly so you can start messaging immediately. For platforms like Telegram, WhatsApp, and LINE, a one-time authentication flow gets you in fast.

For server-side bots and CI/CD, bot tokens are fully supported via [`agent-slackbot`](skills/agent-slackbot/SKILL.md), [`agent-discordbot`](skills/agent-discordbot/SKILL.md), [`agent-whatsappbot`](skills/agent-whatsappbot/SKILL.md), [`agent-wechatbot`](skills/agent-wechatbot/SKILL.md), and [`agent-channeltalkbot`](skills/agent-channeltalkbot/SKILL.md).

Inspired by [agent-browser](https://github.com/vercel-labs/agent-browser) from Vercel Labs.

## Contributing

```bash
bun install    # Install dependencies
bun link       # Link CLI globally for local testing
bun test       # Run tests
bun test:e2e   # Run e2e tests
bun typecheck  # Type check
bun lint       # Lint
bun lint:fix   # Lint with autofix
bun format     # Format
bun run build  # Build
```

## Thanks

- [@goden-park](https://github.com/goden-park)

## License

MIT
