# Refs System

## Overview

The refs system provides AI-friendly short references for Slack entities. Instead of using long IDs like `C06ABCD1234` or `1234567890.123456`, you can use simple refs like `@c1` or `@m5`.

## Why Refs?

### Problem: Long IDs Are Hard for AI

Slack uses long, opaque identifiers:
- Channel: `C06ABCD1234` (11 chars)
- Message timestamp: `1234567890.123456` (17 chars)
- User: `U06WXYZ5678` (11 chars)
- File: `F06LMNOP901` (11 chars)

These are:
- Hard to remember in conversation
- Verbose in prompts/responses
- Error-prone to copy/paste
- Waste tokens in AI context

### Solution: Short Sequential Refs

agent-slack assigns short refs:
- `@c1`, `@c2`, `@c3` for channels
- `@m1`, `@m2`, `@m3` for messages
- `@u1`, `@u2`, `@u3` for users
- `@f1`, `@f2`, `@f3` for files

Benefits:
- **Concise**: 3-4 chars vs 11-17 chars
- **Memorable**: Sequential numbering
- **Natural**: Looks like mentions
- **Token-efficient**: Saves AI context

## Ref Types

### Channel Refs: `@c{N}`

Format: `@c1`, `@c2`, `@c3`, ...

Maps to: Channel IDs (e.g., `C06ABCD1234`)

Assigned to:
- Public channels
- Private channels
- Direct messages
- Multi-person DMs

Example:
```json
{
  "ref": "@c1",
  "id": "C06ABCD1234",
  "name": "general",
  "is_channel": true
}
```

### Message Refs: `@m{N}`

Format: `@m1`, `@m2`, `@m3`, ...

Maps to: Message timestamps (e.g., `1234567890.123456`)

Assigned to:
- Channel messages
- Thread replies
- DM messages

Example:
```json
{
  "ref": "@m1",
  "ts": "1234567890.123456",
  "text": "Hello world",
  "channel": "C06ABCD1234",
  "user": "U06WXYZ5678"
}
```

### User Refs: `@u{N}`

Format: `@u1`, `@u2`, `@u3`, ...

Maps to: User IDs (e.g., `U06WXYZ5678`)

Assigned to:
- Workspace members
- Bots (if `--include-bots` used)

Example:
```json
{
  "ref": "@u1",
  "id": "U06WXYZ5678",
  "name": "john.doe",
  "real_name": "John Doe"
}
```

### File Refs: `@f{N}`

Format: `@f1`, `@f2`, `@f3`, ...

Maps to: File IDs (e.g., `F06LMNOP901`)

Assigned to:
- Uploaded files
- Shared files

Example:
```json
{
  "ref": "@f1",
  "id": "F06LMNOP901",
  "name": "report.pdf",
  "size": 102400
}
```

## Ref Lifecycle

### Session-Scoped

Refs are **only valid within a single CLI invocation**. They do NOT persist across commands.

**Wrong** (refs don't persist):
```bash
# Command 1: Get snapshot
agent-slack snapshot > workspace.json

# Command 2: Try to use ref from previous command
agent-slack message send @c1 "Hello"  # ❌ @c1 not defined in this session
```

**Right** (use IDs or names):
```bash
# Command 1: Get snapshot
agent-slack snapshot > workspace.json

# Command 2: Use channel name or ID
agent-slack message send general "Hello"  # ✅ Use name
agent-slack message send C06ABCD1234 "Hello"  # ✅ Use ID
```

### Assignment Order

Refs are assigned **sequentially** in order of appearance:

```bash
agent-slack snapshot
```

Output:
```json
{
  "channels": [
    {"ref": "@c1", "name": "general"},      // First channel
    {"ref": "@c2", "name": "random"},       // Second channel
    {"ref": "@c3", "name": "engineering"}   // Third channel
  ],
  "messages": [
    {"ref": "@m1", "text": "Latest msg"},   // First message
    {"ref": "@m2", "text": "Second msg"},   // Second message
    {"ref": "@m3", "text": "Third msg"}     // Third message
  ]
}
```

Order depends on:
- **Channels**: Alphabetical by name
- **Messages**: Reverse chronological (newest first)
- **Users**: Alphabetical by username
- **Files**: Reverse chronological (newest first)

## Using Refs

### In Commands

Any command that accepts a channel/message/user/file ID can accept a ref:

```bash
# Send message to channel ref
agent-slack message send @c1 "Hello"

# Add reaction to message ref
agent-slack reaction add @c1 @m5 thumbsup

# Get user info by ref
agent-slack user info @u1

# Get file info by ref
agent-slack file info @f1
```

### Ref Resolution

When you use a ref, agent-slack:
1. Checks if ref exists in current session
2. Resolves ref to actual ID
3. Uses ID in Slack API call

If ref doesn't exist:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REF",
    "message": "Ref @c99 not found. Run snapshot to assign refs."
  }
}
```

## Refs in Output

### All Commands Include Refs

Every command that returns entities includes refs:

```bash
agent-slack channel list
```

```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "ref": "@c1",
        "id": "C06ABCD1234",
        "name": "general"
      }
    ]
  }
}
```

### Refs Mapping

The `snapshot` command includes a refs mapping for easy lookup:

```json
{
  "refs": {
    "channels": {
      "@c1": "C06ABCD1234",
      "@c2": "C06EFGH5678"
    },
    "messages": {
      "@m1": "1234567890.123456",
      "@m2": "1234567891.234567"
    },
    "users": {
      "@u1": "U06WXYZ5678",
      "@u2": "U06ABCD1234"
    }
  }
}
```

## AI Agent Workflow

### Recommended Pattern

1. **Get snapshot** to assign refs
2. **Parse refs** from snapshot
3. **Use refs** in subsequent operations
4. **All in same script/session**

Example:
```bash
#!/bin/bash

# Get snapshot and parse
SNAPSHOT=$(agent-slack snapshot)

# Extract channel ref for "general"
GENERAL_REF=$(echo "$SNAPSHOT" | jq -r '.data.channels[] | select(.name=="general") | .ref')

# Use ref to send message
agent-slack message send "$GENERAL_REF" "Hello from AI agent!"
```

### Multi-Step Operations

For complex workflows, maintain refs in memory:

```typescript
// Get snapshot
const snapshot = await exec('agent-slack snapshot');
const data = JSON.parse(snapshot);

// Build ref lookup
const channelRefs = new Map();
for (const channel of data.channels) {
  channelRefs.set(channel.name, channel.ref);
}

// Use refs in operations
const generalRef = channelRefs.get('general');
await exec(`agent-slack message send ${generalRef} "Hello"`);
```

## Limitations

### No Persistence

Refs are **ephemeral** - they only exist during command execution.

**Cannot do:**
- Store refs in database
- Use refs across different CLI invocations
- Share refs between different AI agents

**Must do:**
- Re-run snapshot to get fresh refs
- Use IDs/names for persistent references
- Keep refs in memory during single workflow

### No Custom Refs

You cannot create or modify refs. They are auto-assigned.

**Cannot do:**
```bash
agent-slack channel list --ref-prefix "ch"  # ❌ Not supported
```

**Must do:**
```bash
agent-slack channel list  # ✅ Use auto-assigned @c1, @c2, ...
```

### Ref Collisions

Different entity types use different prefixes, so no collisions:
- `@c1` is always a channel
- `@m1` is always a message
- `@u1` is always a user
- `@f1` is always a file

## Best Practices

### 1. Use Snapshot for Ref Assignment

Always start with snapshot to get refs:

```bash
# Good: Get refs first
SNAPSHOT=$(agent-slack snapshot)
CHANNEL_REF=$(echo "$SNAPSHOT" | jq -r '.data.channels[0].ref')
agent-slack message send "$CHANNEL_REF" "Hello"

# Bad: Guess refs
agent-slack message send @c1 "Hello"  # Might not exist
```

### 2. Keep Operations in Same Session

Don't split across multiple commands:

```bash
# Good: Single script
#!/bin/bash
SNAPSHOT=$(agent-slack snapshot)
# ... use refs from snapshot ...

# Bad: Separate commands
agent-slack snapshot > snapshot.json
# Later...
agent-slack message send @c1 "Hello"  # @c1 not defined
```

### 3. Fallback to Names/IDs

For persistent references, use names or IDs:

```bash
# Good: Use channel name
agent-slack message send general "Hello"

# Good: Use channel ID
agent-slack message send C06ABCD1234 "Hello"

# Risky: Use ref (only works in same session)
agent-slack message send @c1 "Hello"
```

### 4. Parse Refs from Output

Don't hardcode refs - always parse from command output:

```bash
# Good: Parse from output
CHANNEL_REF=$(agent-slack channel list | jq -r '.data.channels[] | select(.name=="general") | .ref')

# Bad: Hardcode
CHANNEL_REF="@c1"  # Might not be general
```

## Examples

### Example 1: Send Message Using Ref

```bash
#!/bin/bash

# Get snapshot
SNAPSHOT=$(agent-slack snapshot)

# Find channel ref
CHANNEL_REF=$(echo "$SNAPSHOT" | jq -r '.data.channels[] | select(.name=="general") | .ref')

# Send message
agent-slack message send "$CHANNEL_REF" "Hello from script!"
```

### Example 2: React to Latest Message

```bash
#!/bin/bash

# Get channel history
HISTORY=$(agent-slack message list general --limit 1)

# Extract message ref
MESSAGE_REF=$(echo "$HISTORY" | jq -r '.data.messages[0].ref')
CHANNEL_REF=$(echo "$HISTORY" | jq -r '.data.messages[0].channel_ref')

# Add reaction
agent-slack reaction add "$CHANNEL_REF" "$MESSAGE_REF" thumbsup
```

### Example 3: Mention User in Message

```bash
#!/bin/bash

# Get users
USERS=$(agent-slack user list)

# Find user ID (not ref - mentions need real IDs)
USER_ID=$(echo "$USERS" | jq -r '.data.users[] | select(.name=="john.doe") | .id')

# Send message with mention
agent-slack message send general "Hey <@$USER_ID>, check this out!"
```

Note: Slack mentions require actual user IDs (e.g., `<@U06WXYZ5678>`), not refs.
