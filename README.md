# 💬 Agent Messenger

**Give your AI agent the power to read and send messages across Slack, Discord, Teams and more**

A unified, agent-friendly CLI for messaging platforms. Zero-config credential extraction from your desktop apps—no OAuth flows, no API keys, no admin approval needed. Works out of the box.

## ✨ Why Agent Messenger?

- 🔑 **No API keys needed** — Automatically extracts credentials from your installed desktop apps
- 🌐 **One interface, multiple platforms** — Learn once, use everywhere (Slack, Discord, Teams)
- 🤖 **AI-agent friendly** — JSON output by default, perfect for LLM tool use
- 👤 **Human friendly too** — Add `--pretty` for readable output

## 📦 Installation

```bash
npm install -g agent-messenger
```

Or use your favorite package manager.

This installs:
- `agent-slack` — Slack CLI
- `agent-discord` — Discord CLI

## 🧩 Agent Skills

Agent Messenger includes [Agent Skills](https://agentskills.io/) that teach your AI agent how to use these CLIs effectively.

### Skills CLI

```bash
npx skills add devxoul/agent-messenger
```

See [skills.sh](https://skills.sh/) for more details.

### Claude Code

```bash
claude plugin marketplace add devxoul/agent-messenger
claude plugin install agent-messenger
```

Or within Claude Code:

```
/plugin marketplace add devxoul/agent-messenger
/plugin install agent-messenger
```

### OpenCode

Add to your `opencode.jsonc`:

```jsonc
{
  "plugins": [
    "agent-messenger@0.1.0"
  ]
}
```

## 🚀 Quick Start

Get up and running in 30 seconds:

```bash
# 1. Extract credentials from your Slack desktop app
agent-slack auth extract

# 2. See your workspace at a glance
agent-slack snapshot --pretty

# 3. Send a message
agent-slack message send general "Hello from the CLI!"
```

That's it. No OAuth flows. No API tokens. No configuration files.

## 🔌 Supported Platforms

| Feature | Slack | Discord |
|---------|:-----:|:-------:|
| Auto credential extraction | ✅ | ✅ |
| Send / List / Search messages | ✅ | ✅ |
| Threads | ✅ | ✅ |
| Channels & Users | ✅ | ✅ |
| Reactions | ✅ | ✅ |
| File uploads | ✅ | ✅ |
| Workspace snapshots | ✅ | ✅ |
| Multi-workspace | ✅ | ✅ |
| Bot support | 🏗️ | 🏗️ |

🔜 **Coming soon**: Microsoft Teams and more

## 📚 Platform Guides

- **[Slack Guide](docs/slack.md)** — Full command reference for Slack
- **[Discord Guide](docs/discord.md)** — Full command reference for Discord

## 💡 Use Cases

**🤖 For AI Agents**
- Give Claude, GPT, or your custom agent the ability to read and send messages
- Automate Slack/Discord workflows with simple CLI commands
- Build integrations without OAuth complexity

**👩‍💻 For Developers**
- Quick message sending from terminal
- Scripted notifications and alerts
- Workspace snapshots for debugging

**👥 For Teams**
- Automate standups and reminders
- Cross-post announcements to multiple platforms
- Build custom notification pipelines

## 🧠 Philosophy

**Why not MCP?** MCP servers expose all tools at once, bloating context and confusing agents. **[Agent Skills](https://agentskills.io/) + agent-friendly CLI** offer a better approach—load what you need, when you need it. Fewer tokens, cleaner context, better output.

**Why not OAuth?** OAuth requires an app and it requires workspace admin approval to install, which can take days. This tool just works—zero setup required. Bot support is on the roadmap for those who prefer it.

Inspired by [agent-browser](https://github.com/vercel-labs/agent-browser) from Vercel Labs.

## 🤝 Contributing

```bash
bun install    # Install dependencies
bun link       # Link CLI globally for local testing
bun test       # Run tests
bun typecheck  # Type check
bun lint       # Lint
bun run build  # Build
```

## 📄 License

MIT
