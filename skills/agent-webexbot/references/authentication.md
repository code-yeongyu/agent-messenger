# Authentication Guide

## Overview

`agent-webexbot` uses **bot tokens** issued at [developer.webex.com](https://developer.webex.com/my-apps/new/bot). Unlike `agent-webex` which supports browser extraction and OAuth Device Grant, `agent-webexbot` uses a single, simple auth model: set a token once, and it works forever.

Bot tokens never expire. They're the right choice for CI/CD pipelines, long-running automations, and any server-side integration.

## Creating a Bot Token

1. Go to [developer.webex.com](https://developer.webex.com/my-apps/new/bot)
2. Sign in with your Webex account
3. Click **Create a New App** → **Create a Bot**
4. Fill in the bot name, username, and icon
5. Click **Add Bot**
6. Copy the **Bot Access Token** shown on the confirmation page

The token is shown only once. Save it immediately. If you lose it, you can regenerate it from the bot's settings page — but the old token will be invalidated.

## Setting Up Credentials

```bash
# Set bot token (validates against Webex API before saving)
agent-webexbot auth set YOUR_BOT_TOKEN

# Set with a custom bot identifier for multi-bot setups
agent-webexbot auth set YOUR_BOT_TOKEN --bot deploy

# Check auth status
agent-webexbot auth status

# Clear all stored credentials
agent-webexbot auth clear
```

When you run `auth set`, the CLI validates the token against the Webex API and confirms it's a bot token (not a user token). If validation fails, the token won't be stored.

## Multi-Bot Support

You can store multiple bot tokens and switch between them:

```bash
# Store multiple bots
agent-webexbot auth set TOKEN_A --bot deploy
agent-webexbot auth set TOKEN_B --bot alerts

# List all configured bots
agent-webexbot auth list

# Switch active bot
agent-webexbot auth use deploy

# Use a specific bot for a single command (without switching)
agent-webexbot --bot alerts message send <space-id> "Alert!"

# Remove a bot
agent-webexbot auth remove alerts
```

The `--bot <id>` flag on any command overrides the active bot for that invocation only.

## Checking Status

```bash
agent-webexbot auth status
```

Output when authenticated:

```json
{
  "valid": true,
  "bot_id": "Y2lz...",
  "bot_name": "Deploy Bot"
}
```

Output when not authenticated:

```json
{
  "valid": false,
  "error": "No credentials configured. Run \"auth set <token>\" first."
}
```

## Credential Storage

### Location

```
~/.config/agent-messenger/webexbot-credentials.json
```

Override with the `AGENT_MESSENGER_CONFIG_DIR` environment variable.

### Format

```json
{
  "current": { "bot_id": "deploy" },
  "bots": {
    "deploy": {
      "bot_id": "deploy",
      "bot_name": "Deploy Bot",
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

`bots` is keyed by `bot_id`, and the active bot is tracked by the top-level `current` field. `current` is `null` when no bot is selected.

### Security

- File permissions: `0600` (owner read/write only)
- Credentials are stored in plaintext (same approach as other agent-messenger platforms)
- Keep this file secure. It grants full access to your bot's Webex spaces
- Bot tokens never expire — treat them like passwords
- If a token is compromised, regenerate it at [developer.webex.com/my-apps](https://developer.webex.com/my-apps)

## Token Lifecycle

```
Create bot at developer.webex.com → Bot token issued → Valid forever
                                                              |
                                                    Only invalidated if:
                                                    - You regenerate the token
                                                    - The bot is deleted
```

Bot tokens are ideal for automation. No refresh logic needed, no expiry to track.

## Troubleshooting

### "No credentials configured"

No bot token stored. Set one first:

```bash
agent-webexbot auth set YOUR_BOT_TOKEN
```

### "Token is not a bot token"

The token you provided belongs to a user account, not a bot. Use `agent-webex` for user tokens, or create a bot at [developer.webex.com](https://developer.webex.com/my-apps/new/bot) to get a proper bot token.

### "401 Unauthorized"

Bot tokens don't expire, so a 401 usually means:

- The token was copied incorrectly (missing characters, extra whitespace)
- The bot was deleted or the token was regenerated

Double-check the full token, then re-run:

```bash
agent-webexbot auth set YOUR_BOT_TOKEN
```

### "Bot not found" when using `--bot <id>`

The bot identifier doesn't match any stored bot. List available bots:

```bash
agent-webexbot auth list
```

### Permission errors on credentials file

```bash
chmod 600 ~/.config/agent-messenger/webexbot-credentials.json
```

## Security Considerations

### What agent-webexbot Can Access

With a valid bot token, `agent-webexbot` can:

- Read and send messages in any space the bot has been added to
- List members of spaces the bot is in
- Send direct messages to any Webex user by email

### What agent-webexbot Cannot Do

- Access spaces the bot hasn't been added to
- Perform admin operations
- Read messages from before the bot was added to a space
- Create or delete spaces

### Best Practices

1. **Use separate bots for separate purposes** — one for CI/CD alerts, one for interactive commands
2. **Protect credentials.json** — never commit to version control
3. **Revoke compromised tokens** — regenerate at [developer.webex.com/my-apps](https://developer.webex.com/my-apps) if a token is exposed
4. **Use `AGENT_MESSENGER_CONFIG_DIR`** for CI/CD sandboxes to isolate credentials per environment

## Manual Credential Setup (Advanced)

If you need to create the credentials file manually:

```bash
# Create config directory
mkdir -p ~/.config/agent-messenger

# Write credentials
cat > ~/.config/agent-messenger/webexbot-credentials.json << 'EOF'
{
  "current": { "bot_id": "default" },
  "bots": {
    "default": {
      "bot_id": "default",
      "bot_name": "My Bot",
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
EOF

# Set secure permissions
chmod 600 ~/.config/agent-messenger/webexbot-credentials.json
```

Always prefer `agent-webexbot auth set` over manual file creation. The `auth set` command validates the token and handles the file format correctly.
