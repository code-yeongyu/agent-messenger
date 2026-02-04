---
name: agent-messenger
description: Use when you need to send messages as yourself (not as a bot) across Slack, Discord, and Teams. Uses personal tokens extracted from desktop apps—no OAuth, no API keys, no admin approval needed.
metadata: {"openclaw":{"emoji":"💬","requires":{"bins":["agent-slack","agent-discord","agent-teams"]}}}
---

# Agent Messenger

Send messages as **yourself** (not as a bot) via Slack, Discord, and Teams CLI.

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
agent-teams auth extract    # Needs Teams desktop app
```

Credentials are stored in `~/.config/agent-messenger/`.

---

## 중요: 파일 업로드 관련

파일 업로드 명령어 실행 시 에러 메시지(`"undefined is not an object"` 등)가 나와도 **실제로는 업로드가 성공한 경우가 많음**. 응답 파싱 버그로 인한 것이므로, 에러가 나면 채널에서 파일이 올라갔는지 직접 확인할 것.

---

## Slack Commands (`agent-slack`)

### Authentication

```bash
agent-slack auth extract              # Extract credentials from Slack desktop app
agent-slack auth status               # Check auth status
agent-slack auth logout [workspace]   # Logout from workspace
```

### Workspace Management

```bash
agent-slack workspace list            # List workspaces
agent-slack workspace switch <id>     # Switch workspace
agent-slack workspace current         # Show current workspace
```

### Messages

```bash
agent-slack message send <channel> "<text>"           # Send to channel
agent-slack message send <channel> "<text>" --thread <ts>  # Send threaded reply
agent-slack message send <channel> "<text>" --workspace <name>  # 특정 워크스페이스로 전송
agent-slack message list <channel> [--limit N]        # List recent messages
agent-slack message get <channel> <ts>                # Get specific message
agent-slack message update <channel> <ts> "<text>"    # Update message
agent-slack message delete <channel> <ts>             # Delete message
agent-slack message search "<query>" [--limit N]      # Search messages
agent-slack message replies <channel> <thread_ts>    # Get thread replies
```

> **팁**: `--workspace` 옵션으로 워크스페이스 지정 가능 (예: `--workspace indent`)

### Channels

```bash
agent-slack channel list              # List channels
agent-slack channel info <channel>    # Get channel info
agent-slack channel history <channel> # Get message history
```

### Users

```bash
agent-slack user list                 # List workspace users
agent-slack user info <user>          # Show user details
agent-slack user me                   # Show current authenticated user
```

### Reactions

```bash
agent-slack reaction add <channel> <ts> <emoji>       # Add reaction
agent-slack reaction remove <channel> <ts> <emoji>    # Remove reaction
agent-slack reaction list <channel> <ts>              # List reactions
```

### Files

```bash
agent-slack file upload <channel> <path>  # Upload file
agent-slack file upload <channel> <path> --filename "name.ext"  # Upload with custom filename
agent-slack file list                     # List files
agent-slack file info <file>              # Show file details
```

> **주의**: 파일 업로드 시 에러 메시지가 나와도 실제로는 업로드가 성공한 경우가 있음!
> `"undefined is not an object"` 에러가 나와도 채널에서 파일이 올라갔는지 확인할 것.
> 응답 파싱 버그로 인해 성공해도 에러처럼 보일 수 있음.

### Snapshot

```bash
agent-slack snapshot                  # Full snapshot (channels, users, messages)
agent-slack snapshot --channels-only  # Channels only
agent-slack snapshot --users-only     # Users only
agent-slack snapshot --limit N        # Limit messages per channel
```

### Unread & Activity

```bash
agent-slack unread counts             # Get unread counts
agent-slack unread threads            # Get unread threads with replies
agent-slack unread mark <channel> <ts> # Mark as read
agent-slack activity list             # List activity feed
agent-slack activity list --unread    # Unread activity only
```

### Saved Items & Drafts

```bash
agent-slack saved list [--limit N]    # List saved items ("Later")
agent-slack drafts list [--limit N]   # List message drafts
```

### Channel Sections

```bash
agent-slack sections list             # List channel sections (sidebar folders)
```

---

## Discord Commands (`agent-discord`)

### 중요: Discord 답장 규칙

**Discord에서 메시지에 답장할 때는 항상 `--reply` 옵션을 사용할 것.**

```bash
# 올바른 답장 방법
agent-discord message send <channel-id> "<content>" --reply <msg-id>

# 단순 메시지 전송 (답장이 아닐 때만)
agent-discord message send <channel-id> "<content>"
```

이렇게 해야 Discord에서 어떤 메시지에 대한 답장인지 문맥이 명확하게 표시됨.

### Authentication

```bash
agent-discord auth extract            # Extract credentials from Discord desktop app
agent-discord auth status             # Check auth status
agent-discord auth logout             # Logout
```

### Guild Management

```bash
agent-discord guild list              # List all guilds
agent-discord guild info <guild-id>   # Get guild info
agent-discord guild switch <guild-id> # Switch to guild
agent-discord guild current           # Show current guild
```

### Messages

```bash
agent-discord message send <channel-id> "<content>"               # Send message
agent-discord message send <channel-id> "<content>" --reply <msg-id>  # Reply to message
agent-discord message edit <channel-id> <msg-id> "<new-content>"  # Edit message
agent-discord message list <channel-id> [--limit N]               # List messages
agent-discord message get <channel-id> <msg-id>                   # Get specific message
agent-discord message delete <channel-id> <msg-id> --force        # Delete message
agent-discord message ack <channel-id> <msg-id>                   # Mark as read
agent-discord message search "<query>" [--guild <id>] [--limit N] # Search messages
agent-discord message search "<query>" --author <user-id>         # Search by author
agent-discord message search "<query>" --channel <channel-id>     # Search in channel
agent-discord message pin <channel-id> <msg-id>                   # Pin message
agent-discord message unpin <channel-id> <msg-id>                 # Unpin message
agent-discord message pins <channel-id>                           # List pinned messages
```

### Channels

```bash
agent-discord channel list            # List channels in current guild
agent-discord channel info <channel-id>   # Get channel info
agent-discord channel history <channel-id> # Get message history
```

### Users

```bash
agent-discord user list               # List guild members
agent-discord user info <user-id>     # Get user info
agent-discord user me                 # Show current authenticated user
```

### Reactions

```bash
agent-discord reaction add <channel-id> <msg-id> <emoji>     # Add reaction
agent-discord reaction remove <channel-id> <msg-id> <emoji>  # Remove reaction
agent-discord reaction list <channel-id> <msg-id>            # List reactions
```

### Files

```bash
agent-discord file upload <channel-id> <path>  # Upload file
agent-discord file list <channel-id>           # List files
agent-discord file info <channel-id> <file>    # Show file details
```

> **주의**: 파일 업로드 시 에러 메시지가 나와도 실제로는 업로드가 성공한 경우가 있음!
> 응답 파싱 버그로 인해 성공해도 에러처럼 보일 수 있으니 채널에서 직접 확인할 것.

### Snapshot

```bash
agent-discord snapshot                # Full snapshot
agent-discord snapshot --channels-only
agent-discord snapshot --users-only
agent-discord snapshot --limit N
```

### DM Channels

```bash
agent-discord dm list                 # List DM channels
agent-discord dm create <user-id>     # Create DM channel with user
agent-discord dm send <user-id> "<message>"  # Send DM (creates channel if needed)
```

### Mentions

```bash
agent-discord mention list            # List recent mentions
agent-discord mention list --limit N
agent-discord mention list --guild <guild-id>
```

### Friends & Relationships

```bash
agent-discord friend list             # List friends/relationships
```

### User Notes

```bash
agent-discord note get <user-id>      # Get note for user
agent-discord note set <user-id> "<note>"  # Set note for user
```

### Member Search

```bash
agent-discord member search <guild-id> <query>  # Search members
agent-discord member search <guild-id> <query> --limit N
```

### User Profiles

```bash
agent-discord profile get <user-id>   # Get user profile (bio, accounts, etc.)
```

### Threads

```bash
agent-discord thread create <channel-id> "<name>"  # Create thread
agent-discord thread archive <thread-id>           # Archive thread
```

---

## Teams Commands (`agent-teams`)

### Authentication

```bash
agent-teams auth extract              # Extract credentials from Teams desktop app
agent-teams auth status               # Check auth status
agent-teams auth logout               # Logout
```

> **Note**: Teams tokens expire in 60-90 minutes. Re-run `auth extract` when expired.

### Team Management

```bash
agent-teams team list                 # List all teams
agent-teams team info <team-id>       # Get team info
agent-teams team switch <team-id>     # Switch to team
agent-teams team current              # Show current team
agent-teams team remove <team-id>     # Remove team from config
```

### Messages

```bash
agent-teams message send <team-id> <channel-id> "<content>"   # Send message
agent-teams message list <team-id> <channel-id> [--limit N]   # List messages
agent-teams message get <team-id> <channel-id> <msg-id>       # Get specific message
agent-teams message delete <team-id> <channel-id> <msg-id>    # Delete message
```

### Channels

```bash
agent-teams channel list <team-id>                  # List channels
agent-teams channel info <team-id> <channel-id>     # Get channel info
agent-teams channel history <team-id> <channel-id>  # Get message history
```

### Users

```bash
agent-teams user list <team-id>       # List team members
agent-teams user info <user-id>       # Get user info
agent-teams user me                   # Show current authenticated user
```

### Reactions

```bash
agent-teams reaction add <team-id> <channel-id> <msg-id> <emoji>     # Add reaction
agent-teams reaction remove <team-id> <channel-id> <msg-id> <emoji>  # Remove reaction
```

### Files

```bash
agent-teams file upload <team-id> <channel-id> <path>  # Upload file
agent-teams file list <team-id> <channel-id>           # List files
agent-teams file info <team-id> <channel-id> <file>    # Show file details
```

### Snapshot

```bash
agent-teams snapshot                  # Full snapshot
agent-teams snapshot --channels-only
agent-teams snapshot --users-only
agent-teams snapshot --team-id <id>
agent-teams snapshot --limit N
```

---

## Key Differences: Slack vs Discord vs Teams

| Concept | Slack | Discord | Teams |
|---------|-------|---------|-------|
| Server | Workspace | Guild | Team |
| Channel ID | `C01234567` | `123456789012345678` | GUID |
| Message ID | `1234567890.123456` (timestamp) | `123456789012345678` (snowflake) | GUID |
| Token expiry | Long-lived | Long-lived | 60-90 mins |

---

## Output Format

By default, all commands output **compact JSON** (ideal for AI agents).

Add `--pretty` for human-readable output:

```bash
agent-slack snapshot --pretty
agent-discord channel list --pretty
agent-teams team list --pretty
```

---

## Common Workflows

### Post a status update

```bash
agent-slack message send general "Daily standup: Working on feature X"
agent-discord message send 123456789012345678 "Same update for Discord"
agent-teams message send team-id channel-id "Teams update"
```

### React to a message

```bash
agent-slack reaction add general 1712345678.123456 thumbsup
agent-discord reaction add 123456789012345678 987654321098765432 👍
```

### Search messages

```bash
agent-slack message search "deployment" --limit 20
agent-discord message search "deployment failed" --limit 10
```

### Check unread activity

```bash
agent-slack unread counts
agent-slack activity list --unread
agent-discord mention list
```

### Send a DM

```bash
agent-discord dm send 123456789012345678 "Hey, can you review my PR?"
```

### Edit a sent message

```bash
agent-discord message edit 123456789012345678 987654321098765432 "Fixed typo"
```

### Pin an important message

```bash
agent-discord message pin 123456789012345678 987654321098765432
agent-discord message pins 123456789012345678  # List all pinned
```

### Create a thread

```bash
agent-discord thread create 123456789012345678 "Sprint Planning Discussion"
```

### Find users

```bash
agent-discord member search 123456789012345678 "john"
agent-discord profile get 987654321098765432
```

### Review saved items

```bash
agent-slack saved list
agent-slack drafts list
```
