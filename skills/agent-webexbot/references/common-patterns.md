# Common Patterns

## Overview

This guide covers typical workflows for AI agents interacting with Cisco Webex using `agent-webexbot`.

**Note**: Webex uses opaque Base64-encoded IDs for spaces, messages, and people. You can't guess them. Always get IDs from `space list` first. The bot can only interact with spaces it has been added to.

## Auth Patterns

### Pattern 1: Authenticate

**Use case**: First-time setup

```bash
#!/bin/bash

# Set bot token (validates against Webex API)
agent-webexbot auth set YOUR_BOT_TOKEN

# Or with a custom identifier for multi-bot setups
agent-webexbot auth set YOUR_BOT_TOKEN --bot deploy
```

**When to use**: Before any other command, if not already authenticated.

### Pattern 2: Check Auth Status

**Use case**: Verify authentication before running operations

```bash
#!/bin/bash

STATUS=$(agent-webexbot auth status)

if echo "$STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo "Not authenticated. Run 'auth set <token>' first."
  exit 1
fi

BOT_NAME=$(echo "$STATUS" | jq -r '.bot_name')
echo "Authenticated as: $BOT_NAME"
```

**When to use**: Start of any script or workflow.

## Space Patterns

### Pattern 3: List All Spaces

**Use case**: Discover spaces the bot is a member of

```bash
#!/bin/bash

# List all spaces
SPACES=$(agent-webexbot space list)
echo "$SPACES" | jq -r '.spaces[] | "\(.title) (\(.id))"'
```

### Pattern 4: Filter Spaces by Type

**Use case**: Show only group spaces or direct messages

```bash
#!/bin/bash

# Group spaces only
agent-webexbot space list --type group

# Direct messages only
agent-webexbot space list --type direct

# Limit results
agent-webexbot space list --type group --max 10
```

### Pattern 5: Get Space Info

**Use case**: Look up details for a specific space

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

INFO=$(agent-webexbot space info "$SPACE_ID")
TITLE=$(echo "$INFO" | jq -r '.title')
TYPE=$(echo "$INFO" | jq -r '.type')

echo "Space: $TITLE ($TYPE)"
```

### Pattern 6: Find Space by Title

**Use case**: Get a space ID from its title

```bash
#!/bin/bash

find_space_id() {
  local title=$1

  SPACES=$(agent-webexbot space list)
  SPACE_ID=$(echo "$SPACES" | jq -r --arg t "$title" '.spaces[] | select(.title==$t) | .id')

  if [ -z "$SPACE_ID" ]; then
    echo "Space '$title' not found" >&2
    return 1
  fi

  echo "$SPACE_ID"
}

# Usage
ENG_ID=$(find_space_id "Engineering")
if [ $? -eq 0 ]; then
  agent-webexbot message send "$ENG_ID" "Hello Engineering!"
fi
```

**When to use**: When you know the space title but need the ID.

## Message Patterns

### Pattern 7: Send a Simple Message

**Use case**: Post a notification or update

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

RESULT=$(agent-webexbot message send "$SPACE_ID" "Deployment completed successfully!")

if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
  echo "Message sent!"
else
  echo "Failed: $(echo "$RESULT" | jq -r '.error')"
  exit 1
fi
```

### Pattern 8: Send a Markdown Message

**Use case**: Rich formatting in messages

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

agent-webexbot message send "$SPACE_ID" "**Build Status**
- Branch: \`main\`
- Tests: 142 passed, 0 failed
- Coverage: 94.2%" --markdown
```

### Pattern 9: Send a Direct Message

**Use case**: Message someone directly by email, without finding a space ID first

```bash
#!/bin/bash

# Send a DM by email
agent-webexbot message dm alice@example.com "Hey, quick question about the PR"

# Send a DM with markdown
agent-webexbot message dm alice@example.com "**Build failed** - can you check?" --markdown
```

**When to use**: Quick 1:1 messages when you know the recipient's email.

### Pattern 10: Send and Track a Message

**Use case**: Send a message and save its ID for later editing

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

# Send initial status
RESULT=$(agent-webexbot message send "$SPACE_ID" "Deploying v2.1.0...")
MSG_ID=$(echo "$RESULT" | jq -r '.id')

# ... do work ...
sleep 5

# Update the message with final status
agent-webexbot message edit "$MSG_ID" "$SPACE_ID" "Deployed v2.1.0 successfully!"
```

### Pattern 11: List Recent Messages

**Use case**: Read conversation history

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

# Get last 10 messages
MESSAGES=$(agent-webexbot message list "$SPACE_ID" --max 10)

echo "$MESSAGES" | jq -r '.messages[] | "[\(.created)] \(.personEmail): \(.text)"'
```

### Pattern 12: Delete a Message

**Use case**: Remove a message the bot sent

```bash
#!/bin/bash

MESSAGE_ID="Y2lzY29zcGFyazovL..."

agent-webexbot message delete "$MESSAGE_ID"
```

## Member Patterns

### Pattern 13: List Space Members

**Use case**: See who's in a space

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

MEMBERS=$(agent-webexbot member list "$SPACE_ID")
echo "$MEMBERS" | jq -r '.members[] | "\(.personDisplayName) (\(.personEmail))"'
```

### Pattern 14: Find a Specific Member

**Use case**: Look up a person in a space

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."
SEARCH_NAME="alice"

MEMBERS=$(agent-webexbot member list "$SPACE_ID")
MATCH=$(echo "$MEMBERS" | jq -r --arg name "$SEARCH_NAME" \
  'first(.members[] | select(.personDisplayName | ascii_downcase | contains($name | ascii_downcase)))')

if [ -z "$MATCH" ] || [ "$MATCH" = "null" ]; then
  echo "No member matching '$SEARCH_NAME'"
  exit 1
fi

echo "Found: $(echo "$MATCH" | jq -r '.personDisplayName') ($(echo "$MATCH" | jq -r '.personEmail'))"
```

## Real-Time Event Patterns

### Pattern 15: Stream All Events

**Use case**: Monitor a bot's activity in real time

```bash
#!/bin/bash

# Stream events as NDJSON (Ctrl+C to stop)
agent-webexbot listen
```

### Pattern 16: Filter to Specific Events

**Use case**: Only care about new messages

```bash
#!/bin/bash

agent-webexbot listen --events message_created
```

### Pattern 17: React to Messages

**Use case**: Respond to keywords in real time

```bash
#!/bin/bash

agent-webexbot listen --events message_created | while read -r line; do
  TEXT=$(echo "$line" | jq -r '.payload.text // ""')
  SPACE=$(echo "$line" | jq -r '.payload.roomId // ""')

  if echo "$TEXT" | grep -qi "status"; then
    agent-webexbot message send "$SPACE" "All systems operational."
  fi

  if echo "$TEXT" | grep -qi "help"; then
    agent-webexbot message send "$SPACE" "Available commands: \`status\`, \`help\`"
  fi
done
```

### Pattern 18: Log Events to File

**Use case**: Audit trail of bot activity

```bash
#!/bin/bash

LOG_FILE="/var/log/webexbot-events.ndjson"

agent-webexbot listen >> "$LOG_FILE"
```

## Pipeline Patterns

### Pattern 19: Send to Multiple Spaces

**Use case**: Broadcast a message across spaces

```bash
#!/bin/bash

MESSAGE="System maintenance in 30 minutes"
SPACE_NAMES=("Engineering" "Product" "General")

# Get all spaces once
SPACES=$(agent-webexbot space list)

for name in "${SPACE_NAMES[@]}"; do
  SPACE_ID=$(echo "$SPACES" | jq -r --arg t "$name" '.spaces[] | select(.title==$t) | .id')

  if [ -z "$SPACE_ID" ]; then
    echo "Space '$name' not found, skipping"
    continue
  fi

  echo "Posting to $name..."
  RESULT=$(agent-webexbot message send "$SPACE_ID" "$MESSAGE")

  if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
    echo "  Sent to $name"
  else
    echo "  Failed: $(echo "$RESULT" | jq -r '.error')"
  fi

  # Rate limit: don't spam the API
  sleep 1
done
```

### Pattern 20: Conditional Messaging

**Use case**: Send different messages based on conditions

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."
BUILD_STATUS=$1  # "success" or "failure"

if [ "$BUILD_STATUS" = "success" ]; then
  agent-webexbot message send "$SPACE_ID" "Build passed. All tests green." --markdown
else
  agent-webexbot message send "$SPACE_ID" "**Build failed.** Check CI logs for details." --markdown
fi
```

### Pattern 21: Error Handling with Retry

**Use case**: Robust message sending for production scripts

```bash
#!/bin/bash

send_with_retry() {
  local space_id=$1
  local message=$2
  local max_attempts=3
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    RESULT=$(agent-webexbot message send "$space_id" "$message")

    if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
      echo "Message sent successfully!"
      return 0
    fi

    ERROR=$(echo "$RESULT" | jq -r '.error // "Unknown error"')
    echo "Attempt $attempt failed: $ERROR"

    # Don't retry on auth errors
    if echo "$ERROR" | grep -qi "401\|unauthorized\|not authenticated\|no credentials"; then
      echo "Authentication error. Fix credentials and try again."
      return 1
    fi

    # Don't retry on not-found errors
    if echo "$ERROR" | grep -qi "not found\|404"; then
      echo "Resource not found. Check your IDs."
      return 1
    fi

    if [ $attempt -lt $max_attempts ]; then
      SLEEP_TIME=$((attempt * 2))
      echo "Retrying in ${SLEEP_TIME}s..."
      sleep $SLEEP_TIME
    fi

    attempt=$((attempt + 1))
  done

  echo "Failed after $max_attempts attempts"
  return 1
}

# Usage
SPACE_ID="Y2lzY29zcGFyazovL..."
send_with_retry "$SPACE_ID" "Important notification!"
```

### Pattern 22: Daily Summary Report

**Use case**: Generate a workspace activity summary

```bash
#!/bin/bash

SPACE_ID="Y2lzY29zcGFyazovL..."

# Get recent messages
MESSAGES=$(agent-webexbot message list "$SPACE_ID" --max 50)
MSG_COUNT=$(echo "$MESSAGES" | jq '.messages | length')

# Get members
MEMBERS=$(agent-webexbot member list "$SPACE_ID")
MEMBER_COUNT=$(echo "$MEMBERS" | jq '.members | length')

# Get unique authors from recent messages
AUTHORS=$(echo "$MESSAGES" | jq -r '[.messages[].personEmail] | unique | length')

SUMMARY="**Daily Summary**
- Messages (last 50): $MSG_COUNT
- Active authors: $AUTHORS
- Total members: $MEMBER_COUNT"

agent-webexbot message send "$SPACE_ID" "$SUMMARY" --markdown
```

### Pattern 23: Multi-Bot Deployment Workflow

**Use case**: Use different bots for different environments

```bash
#!/bin/bash

ENVIRONMENT=$1  # "staging" or "production"
SPACE_ID="Y2lzY29zcGFyazovL..."

if [ "$ENVIRONMENT" = "production" ]; then
  agent-webexbot --bot prod-alerts message send "$SPACE_ID" "Production deploy started"
else
  agent-webexbot --bot staging-alerts message send "$SPACE_ID" "Staging deploy started"
fi
```

## Best Practices

### 1. Always Check for Success

```bash
# Good
RESULT=$(agent-webexbot message send "$SPACE_ID" "Hello")
if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
  echo "Success!"
else
  echo "Failed: $(echo "$RESULT" | jq -r '.error')"
fi

# Bad
agent-webexbot message send "$SPACE_ID" "Hello"  # No error checking
```

### 2. Cache Space Lists

```bash
# Good - fetch once, reuse
SPACES=$(agent-webexbot space list)
for title in "${SPACE_TITLES[@]}"; do
  id=$(echo "$SPACES" | jq -r --arg t "$title" '.spaces[] | select(.title==$t) | .id')
  agent-webexbot message send "$id" "$MESSAGE"
done

# Bad - fetch repeatedly
for title in "${SPACE_TITLES[@]}"; do
  SPACES=$(agent-webexbot space list)  # Wasteful!
  id=$(echo "$SPACES" | jq -r --arg t "$title" '.spaces[] | select(.title==$t) | .id')
  agent-webexbot message send "$id" "$MESSAGE"
done
```

### 3. Rate Limit Your Requests

```bash
# Good - respect Webex API limits (~600 req/min)
for space_id in "${SPACE_IDS[@]}"; do
  agent-webexbot message send "$space_id" "$MESSAGE"
  sleep 1
done

# Bad - rapid-fire requests
for space_id in "${SPACE_IDS[@]}"; do
  agent-webexbot message send "$space_id" "$MESSAGE"
done
```

### 4. Use the Listen Command for Real-Time Needs

```bash
# Good - event-driven, no polling
agent-webexbot listen --events message_created | while read -r line; do
  # handle event
done

# Bad - polling wastes API quota and adds latency
while true; do
  agent-webexbot message list "$SPACE_ID" --max 1
  sleep 5
done
```

### 5. Don't Spam Spaces

```bash
# Bad - sends 100 messages
for i in {1..100}; do
  agent-webexbot message send "$SPACE_ID" "Item $i"
done

# Good - batch into single message
MESSAGE="Updates:"
for i in {1..100}; do
  MESSAGE="$MESSAGE\n$i. Item $i"
done
agent-webexbot message send "$SPACE_ID" "$MESSAGE"
```

## Anti-Patterns

### Don't Ignore Auth Errors

```bash
# Bad
agent-webexbot message send "$SPACE_ID" "Hello"
# Continues even if not authenticated

# Good
RESULT=$(agent-webexbot message send "$SPACE_ID" "Hello")
if echo "$RESULT" | grep -qi "401\|unauthorized\|no credentials"; then
  echo "Auth failed. Run 'auth set <token>' to re-authenticate."
  exit 1
fi
```

### Don't Hardcode IDs Without Context

```bash
# Bad - mystery ID
agent-webexbot message send "Y2lzY29zcGFyazovL..." "Hello"

# Good - document what the ID refers to
ENGINEERING_SPACE="Y2lzY29zcGFyazovL..."  # Engineering space
agent-webexbot message send "$ENGINEERING_SPACE" "Hello"
```

### Don't Use agent-webexbot for User-Level Access

```bash
# Wrong tool for the job
agent-webexbot auth set YOUR_USER_TOKEN  # Will fail - not a bot token

# Right tool
agent-webex auth login  # For user-level access
```

## See Also

- [Authentication Guide](authentication.md) - Token types, storage, and troubleshooting
