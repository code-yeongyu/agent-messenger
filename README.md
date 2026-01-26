# Agent Slack

A TypeScript CLI tool that enables AI agents and humans to interact with Slack workspaces through a simple command interface.

## Features

- **Seamless Authentication**: Zero-config token extraction from Slack desktop app
- **Multi-Workspace Support**: Manage multiple Slack workspaces with easy switching
- **AI-Friendly Refs**: Session-scoped entity references (@c1, @m1, @u1, @f1)
- **JSON Output**: Default JSON output for AI consumption, `--pretty` flag for humans
- **Comprehensive Commands**: Messages, channels, users, reactions, files, and snapshots
- **Type-Safe**: Built with TypeScript in strict mode
- **Well-Tested**: 236 passing tests with TDD workflow

## Installation

```bash
# Install globally
bun install -g agent-slack

# Or use with bunx
bunx agent-slack --help
```

## Quick Start

```bash
# 1. Extract credentials from Slack desktop app (zero-config!)
agent-slack auth extract

# 2. Get workspace snapshot with refs
agent-slack snapshot

# 3. Send a message
agent-slack message send general "Hello from AI agent!"

# 4. Use refs for AI-friendly interaction
agent-slack message send @c1 "Message to first channel"
```

## Authentication

### Seamless Token Extraction

agent-slack automatically extracts your Slack credentials from the desktop app:

```bash
agent-slack auth extract
```

This command:
- Auto-detects your platform (macOS/Linux/Windows)
- Finds Slack desktop app data directory
- Extracts xoxc token and xoxd cookie
- Discovers ALL logged-in workspaces
- Stores credentials securely in `~/.config/agent-slack/`

### Multi-Workspace Management

```bash
# List all authenticated workspaces
agent-slack workspace list

# Switch to a different workspace
agent-slack workspace switch <workspace-id>

# Show current workspace
agent-slack workspace current

# Check auth status
agent-slack auth status
```

## Commands

### Message Commands

```bash
# Send a message
agent-slack message send <channel> <text>
agent-slack message send general "Hello world"
agent-slack message send @c1 "Using ref"

# Send a threaded reply
agent-slack message send general "Reply" --thread <ts>

# List messages
agent-slack message list <channel>
agent-slack message list general --limit 50

# Update a message
agent-slack message update <channel> <ts> <new-text>

# Delete a message
agent-slack message delete <channel> <ts> --force
```

### Channel Commands

```bash
# List channels
agent-slack channel list
agent-slack channel list --type public

# Get channel info
agent-slack channel info <channel>
agent-slack channel info @c1
```

### User Commands

```bash
# List users
agent-slack user list
agent-slack user list --include-bots

# Get user info
agent-slack user info <user>
agent-slack user info @u1

# Get current user
agent-slack user me
```

### Reaction Commands

```bash
# Add reaction
agent-slack reaction add <channel> <ts> <emoji>
agent-slack reaction add @c1 @m5 thumbsup

# Remove reaction
agent-slack reaction remove <channel> <ts> <emoji>

# List reactions
agent-slack reaction list <channel> <ts>
```

### File Commands

```bash
# Upload file
agent-slack file upload <channel> <path>
agent-slack file upload general ./report.pdf

# List files
agent-slack file list
agent-slack file list --channel general

# Get file info
agent-slack file info <file-id>
```

### Snapshot Command

Get comprehensive workspace state for AI agents:

```bash
# Full snapshot
agent-slack snapshot

# Filtered snapshots
agent-slack snapshot --channels-only
agent-slack snapshot --users-only

# Limit messages per channel
agent-slack snapshot --limit 10
```

## Ref System

agent-slack uses AI-friendly references for entities:

- **Channels**: `@c1`, `@c2`, `@c3`, ...
- **Messages**: `@m1`, `@m2`, `@m3`, ...
- **Users**: `@u1`, `@u2`, `@u3`, ...
- **Files**: `@f1`, `@f2`, `@f3`, ...

Refs are session-scoped and included in all command outputs.

## AI Agent Integration

See `skills/agent-slack/` directory for:
- Complete skill documentation
- Reference guides
- Runnable templates

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Lint
bun run lint
```

## License

MIT
