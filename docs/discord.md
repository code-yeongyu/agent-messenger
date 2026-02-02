# Discord Integration

Detailed documentation for Discord integration in agent-messenger.

> **Note**: `agent-discord` is a convenient shortcut for `agent-messenger discord`.

## Quick Start

```bash
# 1. Extract credentials from Discord desktop app (zero-config!)
agent-discord auth extract

# 2. Get server snapshot
agent-discord snapshot

# 3. Send a message
agent-discord message send <channel-id> "Hello from AI agent!"
```

## Authentication

### Seamless Token Extraction

agent-discord automatically extracts your Discord credentials from the desktop app:

```bash
agent-discord auth extract

# Use --debug for troubleshooting
agent-discord auth extract --debug
```

This command:
- Auto-detects your platform (macOS/Linux/Windows)
- Extracts Discord user token from the desktop app
- Validates token against Discord API
- Discovers ALL joined servers
- Stores credentials securely in `~/.config/agent-messenger/`

### Authentication Commands

```bash
# Check auth status
agent-discord auth status

# Logout (clear stored credentials)
agent-discord auth logout
```

## Server Management

You must select a server before using most commands.

```bash
# List all servers
agent-discord server list

# Switch to a different server
agent-discord server switch <server-id>

# Show current server
agent-discord server current

# Get server info
agent-discord server info <server-id>
```

## Commands

### Message Commands

```bash
# Send a message
agent-discord message send <channel-id> <content>
agent-discord message send 123456789 "Hello world"

# List messages
agent-discord message list <channel-id>
agent-discord message list 123456789 --limit 50

# Get a specific message
agent-discord message get <channel-id> <message-id>

# Delete a message
agent-discord message delete <channel-id> <message-id> --force
```

### Channel Commands

```bash
# List channels in current server
agent-discord channel list

# Get channel info
agent-discord channel info <channel-id>

# Get channel message history
agent-discord channel history <channel-id>
agent-discord channel history 123456789 --limit 100
```

### User Commands

```bash
# List server members
agent-discord user list

# Get user info
agent-discord user info <user-id>

# Get current authenticated user
agent-discord user me
```

### Reaction Commands

```bash
# Add reaction
agent-discord reaction add <channel-id> <message-id> <emoji>
agent-discord reaction add 123456789 987654321 thumbsup

# Remove reaction
agent-discord reaction remove <channel-id> <message-id> <emoji>

# List reactions on a message
agent-discord reaction list <channel-id> <message-id>
```

### File Commands

```bash
# Upload file to channel
agent-discord file upload <channel-id> <path>
agent-discord file upload 123456789 ./report.pdf

# List files in channel
agent-discord file list <channel-id>

# Get file info
agent-discord file info <channel-id> <file-id>
```

### Snapshot Command

Get comprehensive server state for AI agents:

```bash
# Full snapshot (channels, members, recent messages)
agent-discord snapshot

# Filtered snapshots
agent-discord snapshot --channels-only
agent-discord snapshot --users-only

# Limit messages per channel
agent-discord snapshot --limit 10
```

## Global Options

All commands support these options:

```bash
--pretty    # Pretty-print JSON output (default is compact JSON)
--server <id>  # Use specific server (overrides current server)
```

## Key Differences from Slack

| Concept | Slack | Discord |
|---------|-------|---------|
| Server | Workspace | Server |
| Channel ID | Alphanumeric (C01234567) | Numeric snowflake (123456789012345678) |
| Message ID | Timestamp (1234567890.123456) | Numeric snowflake (123456789012345678) |
| User ID | Alphanumeric (U01234567) | Numeric snowflake (123456789012345678) |
| Threads | Thread timestamps | Thread channels |

## AI Agent Integration

See `skills/agent-messenger/` directory for:
- Complete skill documentation
- Runnable templates
