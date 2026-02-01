---
name: agent-messenger
description: Use when you need to send messages as yourself (not as a bot) across Slack and Discord. Uses personal tokens extracted from desktop apps—no OAuth, no API keys, no admin approval needed.
metadata: {"openclaw":{"emoji":"💬","requires":{"bins":["agent-slack"]}}}
---

# Agent Messenger

Send messages as **yourself** (not as a bot) via Slack and Discord CLI.

## Why use this over OpenClaw's built-in channels?

| Feature | OpenClaw Channels | Agent Messenger |
|---------|-------------------|-----------------|
| Identity | Bot account | **Your personal account** |
| Admin approval | Required | **Not needed** |
| OAuth setup | Required | **Not needed** |
| Credential source | Bot token | Desktop app extraction |

Use this when you want messages to appear from **you**, not a bot.

## Setup

```bash
# Install globally (MUST use bun - npm won't work)
bun install -g agent-messenger

# Extract credentials from desktop apps (run once)
# Requires desktop apps to be running and logged in
agent-slack auth extract    # Needs Slack desktop app
agent-discord auth extract  # Needs Discord desktop app
```

Credentials are stored in `~/.config/agent-messenger/`.

---

## Slack Commands (`agent-slack`)

### Authentication

```bash
# Extract credentials from Slack desktop app
agent-slack auth extract

# Check auth status
agent-slack auth status

# List workspaces
agent-slack workspace list

# Switch workspace
agent-slack workspace switch <workspace-id>
```

### Send Messages

```bash
# Send to channel
agent-slack message send <channel> "<text>"
agent-slack message send general "Hello from CLI!"

# Send threaded reply
agent-slack message send <channel> "<text>" --thread <ts>
```

### Read Messages

```bash
# List recent messages
agent-slack message list <channel>
agent-slack message list general --limit 20

# Search messages
agent-slack message search "<query>"
agent-slack message search "project update" --limit 50

# Get thread replies
agent-slack message replies <channel> <thread_ts>
```

### Reactions

```bash
# Add reaction
agent-slack reaction add <channel> <ts> <emoji>
agent-slack reaction add general 1234567890.123456 thumbsup

# Remove reaction
agent-slack reaction remove <channel> <ts> <emoji>
```

### Channels & Users

```bash
# List channels
agent-slack channel list

# Get channel info
agent-slack channel info <channel>

# List users
agent-slack user list

# Get user info
agent-slack user info <user-id>
```

### Files

```bash
# Upload file
agent-slack file upload <channel> <path>
agent-slack file upload general ./report.pdf
```

### Workspace Snapshot

```bash
# Full snapshot (channels, users, recent messages)
agent-slack snapshot

# Filtered
agent-slack snapshot --channels-only
agent-slack snapshot --users-only
```

### Unread & Activity

```bash
# Get unread counts across workspace
agent-slack unread counts

# Get thread view details
agent-slack unread thread <channel> <ts>

# Mark channel as read
agent-slack unread mark <channel> [ts]

# List activity feed (mentions, reactions, thread replies)
agent-slack activity list
agent-slack activity list --unread
agent-slack activity list --types thread_reply,at_user
```

### Saved Items & Drafts

```bash
# List saved items ("Later" feature)
agent-slack saved list
agent-slack saved list --limit 50

# List message drafts
agent-slack drafts list
agent-slack drafts list --limit 20
```

### Channel Sections

```bash
# List channel sections (sidebar folders)
agent-slack sections list
```

---

## Discord Commands (`agent-discord`)

### Authentication

```bash
# Extract credentials from Discord desktop app
agent-discord auth extract

# Check auth status
agent-discord auth status

# List guilds (servers)
agent-discord guild list

# Switch guild
agent-discord guild switch <guild-id>
```

### Send Messages

```bash
# Send to channel (use channel ID, not name)
agent-discord message send <channel-id> "<content>"
agent-discord message send 123456789012345678 "Hello from CLI!"

# Edit your own message
agent-discord message edit <channel-id> <message-id> "<new-content>"

# Mark message as read
agent-discord message ack <channel-id> <message-id>
```

### Read Messages

```bash
# List recent messages (includes embeds)
agent-discord message list <channel-id>
agent-discord message list 123456789012345678 --limit 20

# Get specific message
agent-discord message get <channel-id> <message-id>

# Search messages in guild
agent-discord message search "<query>"
agent-discord message search "deploy" --guild <guild-id> --limit 10
agent-discord message search "error" --author <user-id> --channel <channel-id>
```

### Reactions

```bash
# Add reaction
agent-discord reaction add <channel-id> <message-id> <emoji>

# Remove reaction
agent-discord reaction remove <channel-id> <message-id> <emoji>
```

### Channels & Users

```bash
# List channels in current guild
agent-discord channel list

# Get channel info
agent-discord channel info <channel-id>

# List guild members
agent-discord user list

# Get user info
agent-discord user info <user-id>
```

### Files

```bash
# Upload file
agent-discord file upload <channel-id> <path>
```

### Guild Snapshot

```bash
# Full snapshot
agent-discord snapshot

# Filtered
agent-discord snapshot --channels-only
agent-discord snapshot --users-only
```

### DM Channels

```bash
# List DM channels
agent-discord dm list

# Create DM channel with user
agent-discord dm create <user-id>

# Send DM directly to user (creates channel automatically)
agent-discord dm send <user-id> "<message>"
agent-discord dm send 123456789012345678 "Hey, quick question..."
```

### Mentions

```bash
# List mentions across servers
agent-discord mention list
agent-discord mention list --limit 50
agent-discord mention list --guild <guild-id>
```

### Friends & Relationships

```bash
# List friends/relationships
agent-discord friend list
```

### User Notes

```bash
# Get note for a user
agent-discord note get <user-id>

# Set note for a user
agent-discord note set <user-id> "<note>"
```

### Member Search

```bash
# Search members in a guild
agent-discord member search <guild-id> <query>
agent-discord member search 123456789012345678 "john" --limit 20
```

### User Profiles

```bash
# Get user profile (bio, connected accounts, etc.)
agent-discord profile get <user-id>
```

### Threads

```bash
# Create a thread in channel
agent-discord thread create <channel-id> "<thread-name>"
agent-discord thread create 123456789012345678 "Bug Discussion"

# Archive a thread
agent-discord thread archive <thread-id>
```

---

## Key Differences: Slack vs Discord

| Concept | Slack | Discord |
|---------|-------|---------|
| Server | Workspace | Guild |
| Channel ID | `C01234567` | `123456789012345678` |
| Message ID | `1234567890.123456` (timestamp) | `123456789012345678` (snowflake) |

---

## Output Format

By default, all commands output **compact JSON** (ideal for AI agents).

Add `--pretty` for human-readable output:

```bash
agent-slack snapshot --pretty
agent-discord channel list --pretty
```

---

## Common Workflows

### Post a status update to Slack

```bash
agent-slack message send general "Daily standup: Working on feature X today"
```

### React to acknowledge a message

```bash
agent-slack reaction add general 1712345678.123456 white_check_mark
```

### Search and summarize discussions

```bash
agent-slack message search "deployment" --limit 20
```

### Cross-post to Discord

```bash
agent-discord message send 123456789012345678 "Same update for Discord team"
```

### Check unread activity

```bash
# Slack
agent-slack unread counts
agent-slack activity list --unread

# Discord
agent-discord mention list
```

### Review saved items and drafts

```bash
agent-slack saved list
agent-slack drafts list
```

### Find users in Discord

```bash
agent-discord member search 123456789012345678 "john"
agent-discord profile get 987654321098765432
```

### Edit a message you sent

```bash
agent-discord message edit 123456789012345678 987654321098765432 "Updated: Fixed the typo"
```

### Send a DM to someone

```bash
agent-discord dm send 123456789012345678 "Hey, can you review my PR?"
```

### Search for messages

```bash
agent-discord message search "deployment failed" --limit 10
```

### Create a thread for discussion

```bash
agent-discord thread create 123456789012345678 "Sprint Planning"
```
