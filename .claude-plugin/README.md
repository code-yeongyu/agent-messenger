# Agent Messenger - Claude Code Plugin

Messaging platform interaction skills for AI agents and Claude Code. Supports Slack workspaces and Discord servers.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add devxoul/agent-messenger

# Install the plugin
claude plugin install agent-messenger
```

Or within Claude Code:

```
/plugin marketplace add devxoul/agent-messenger
/plugin install agent-messenger
```

## What it does

Enables AI agents to interact with messaging platforms through CLI interfaces:

### Slack (`agent-slack`)
- **Send messages** to channels and threads
- **Read channels** and message history
- **Manage reactions** (add/remove/list)
- **Upload files** to channels
- **Search messages** across workspace
- **Multi-workspace support** with easy switching

### Discord (`agent-discord`)
- **Send messages** to channels
- **Read channels** and message history
- **Manage reactions** (add/remove/list)
- **Upload files** to channels
- **Multi-guild support** with easy switching

## Key Features

### Zero-Config Authentication

Automatically extracts credentials from desktop apps - no manual token copying needed:

```bash
# Slack
agent-slack auth extract

# Discord
agent-discord auth extract
```

### AI-Friendly References (Slack)

Uses session-scoped references for entities:
- Channels: `@c1`, `@c2`, `@c3`, ...
- Messages: `@m1`, `@m2`, `@m3`, ...
- Users: `@u1`, `@u2`, `@u3`, ...
- Files: `@f1`, `@f2`, `@f3`, ...

### JSON Output

All commands output JSON by default for easy AI consumption. Use `--pretty` for human-readable output.

## Requirements

- Slack desktop app and/or Discord desktop app installed and logged in
- Node.js 18+ or Bun runtime

## Quick Start

### Slack

```bash
# 1. Extract credentials from Slack desktop app
agent-slack auth extract

# 2. Get workspace snapshot with refs
agent-slack snapshot

# 3. Send a message
agent-slack message send general "Hello from AI agent!"

# 4. Use refs for AI-friendly interaction
agent-slack message send @c1 "Message to first channel"
```

### Discord

```bash
# 1. Extract credentials from Discord desktop app
agent-discord auth extract

# 2. Get guild snapshot
agent-discord snapshot

# 3. Send a message (use channel ID)
agent-discord message send <channel-id> "Hello from AI agent!"
```

## Example Usage

### Slack

```bash
# List channels
agent-slack channel list

# Read recent messages
agent-slack message list general --limit 20

# Search messages
agent-slack message search "project update"

# Add reaction to a message
agent-slack reaction add @c1 @m5 thumbsup

# Upload a file
agent-slack file upload general ./report.pdf
```

### Discord

```bash
# List channels
agent-discord channel list

# Read recent messages
agent-discord message list <channel-id> --limit 20

# Add reaction to a message
agent-discord reaction add <channel-id> <message-id> thumbsup

# Upload a file
agent-discord file upload <channel-id> ./report.pdf
```

## More Information

- [GitHub Repository](https://github.com/devxoul/agent-messenger)
- [Slack Skill Documentation](https://github.com/devxoul/agent-messenger/blob/main/skills/agent-slack/SKILL.md)
- [Discord Skill Documentation](https://github.com/devxoul/agent-messenger/blob/main/skills/agent-discord/SKILL.md)
