# Common Readonly Patterns

`agent-discord` uses a personal Discord token and must be treated as readonly by default. Never use it for message sends, reactions, uploads, thread writes, DM creation, or other write automation. Use `agent-discordbot` with a Discord bot token for writes.

## Find IDs Before Reading

Discord uses Snowflake IDs for servers, channels, messages, and users. Get IDs from the CLI before reading details.

```bash
agent-discord server list
agent-discord server switch "$SERVER_ID"
agent-discord channel list
agent-discord user list
```

## Operator-Approved Expression Maintenance

The examples below mutate Discord server state. Use them only when the operator has explicitly configured the personal Discord credentials as writable for this task. Default extracted credentials are readonly, and ordinary agent automation should use `agent-discord` only for reads.

### Bulk Upload Custom Emoji

**Use case**: Register a folder of images as server emoji without running out of slots halfway through

```bash
#!/bin/bash

SERVER_ID="123456789012345678"

# Check the allowance first — Discord raises it with the boost level,
# so the free slots depend on premium_tier, not a fixed number.
INFO=$(agent-discord server info "$SERVER_ID")
FREE=$(echo "$INFO" | jq -r '.static_emoji_slots_remaining')
echo "Free emoji slots: $FREE"

UPLOADED=0
for FILE in ./emoji/*.png; do
  if [ "$UPLOADED" -ge "$FREE" ]; then
    echo "Out of slots — stopping. Remaining files were not uploaded."
    break
  fi

  # The name defaults to the filename without its extension, and Discord only
  # accepts letters, digits and underscores. Rename potato-01.png beforehand,
  # or pass --name.
  RESULT=$(agent-discord emoji create "$SERVER_ID" "$FILE")

  if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
    UPLOADED=$((UPLOADED + 1))
  else
    echo "Failed on $FILE: $(echo "$RESULT" | jq -r '.error')"
  fi
done

echo "Uploaded $UPLOADED emoji"
agent-discord emoji list "$SERVER_ID" | jq '{count, static_count}'
```

**Notes**:

- `emoji create` rejects a name outside Discord's rules before the request, so a
  bad filename names itself instead of returning `Invalid Form Body`.
- Roll back a mistake with `agent-discord emoji delete <server-id> <emoji-id>`.

### Upload a Server Sticker

**Use case**: Add a sticker, which has a stricter format than emoji

```bash
#!/bin/bash

SERVER_ID="123456789012345678"

# Discord documents 320x320 for stickers (it accepted a larger PNG in
# practice, but stay on spec). Max 512KB.
sips -z 320 320 ./art/potato.png --out /tmp/potato_320.png

# --tags is the unicode emoji the sticker relates to, and is required.
RESULT=$(agent-discord sticker create "$SERVER_ID" /tmp/potato_320.png \
  --tags 🥔 --name potato --description "A potato")

if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
  echo "Sticker id: $(echo "$RESULT" | jq -r '.id')"
else
  echo "Failed: $(echo "$RESULT" | jq -r '.error')"
fi

agent-discord sticker list "$SERVER_ID"
```

**Notes**:

- Base sticker slots are 5, rising to 15/30/60 with boost tiers 1/2/3.
  `agent-discord server info` reports `sticker_slots_remaining`.
- Sticker names are 2–30 characters. A one-character name is refused locally.
- Lottie JSON uploads only on `VERIFIED` or `PARTNERED` guilds.

## Best Practices

### Read Recent Channel Context

```bash
CHANNEL_ID="1234567890123456789"
agent-discord message list "$CHANNEL_ID" --limit 25
agent-discord channel history "$CHANNEL_ID" --limit 100
```

Use this when the user asks you to summarize a channel, inspect recent context, or verify what happened before taking action elsewhere.

## Search Before Reporting

```bash
agent-discord message search "deployment failed" --limit 10
agent-discord message search "meeting" --channel "$CHANNEL_ID" --sort timestamp --sort-dir desc
agent-discord message search "screenshot" --has image
```

Prefer search when the user gives keywords, incident names, people, or topics instead of exact channel IDs.

## Build A Server Snapshot

```bash
agent-discord snapshot
agent-discord snapshot --full --limit 10
```

Start with the brief snapshot for orientation. Use `--full` only when you need recent messages or member context and the extra output is worth it.

`channel list` and snapshots include text, announcement, voice, stage, forum, media, and directory channels. Only text, announcement, voice, and stage channels have directly fetchable message timelines; inspect forum/media posts through their threads instead.

## Inspect Files

```bash
agent-discord file list "$CHANNEL_ID"
agent-discord file info "$CHANNEL_ID" "$FILE_ID"
```

Use file reads for audits and summaries. Do not re-upload or forward files with personal-token Discord credentials.

## Monitor Without Responding

```bash
agent-discord message list "$CHANNEL_ID" --limit 1
```

For polling scripts, store the last seen message ID locally and print new messages for human review. Any automated response must go through `agent-discordbot`.

## Safe Error Handling

```bash
RESULT=$(agent-discord message list "$CHANNEL_ID" --limit 10)
if echo "$RESULT" | jq -e '.error' > /dev/null; then
  echo "$RESULT" | jq -r '.error'
  exit 1
fi
```

Stop on `policy: read denied` or `policy: write denied`. Do not retry with another channel, DM, or raw Discord API call.
