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

## Read Recent Channel Context

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
