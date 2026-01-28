# Agent Slack - Claude Code Plugin

Slack workspace interaction skill for AI agents and Claude Code.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add devxoul/agent-slack

# Install the plugin
claude plugin install agent-slack
```

Or within Claude Code:

```
/plugin marketplace add devxoul/agent-slack
/plugin install agent-slack
```

## What it does

Enables AI agents to interact with Slack workspaces through a CLI interface:

- **Send messages** to channels and threads
- **Read channels** and message history
- **Manage reactions** (add/remove/list)
- **Upload files** to channels
- **Search messages** across workspace
- **Multi-workspace support** with easy switching

## Key Features

### Zero-Config Authentication

Automatically extracts credentials from your Slack desktop app - no manual token copying needed:

```bash
agent-slack auth extract
```

### AI-Friendly References

Uses session-scoped references for entities:
- Channels: `@c1`, `@c2`, `@c3`, ...
- Messages: `@m1`, `@m2`, `@m3`, ...
- Users: `@u1`, `@u2`, `@u3`, ...
- Files: `@f1`, `@f2`, `@f3`, ...

### JSON Output

All commands output JSON by default for easy AI consumption. Use `--pretty` for human-readable output.

## Requirements

- Slack desktop app installed and logged in
- Node.js 18+ or Bun runtime

## Quick Start

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

## Example Usage

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

## More Information

- [GitHub Repository](https://github.com/devxoul/agent-slack)
- [Full Documentation](https://github.com/devxoul/agent-slack/blob/main/skills/agent-slack/SKILL.md)
