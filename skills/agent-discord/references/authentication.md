# Authentication Guide

## Overview

agent-discord uses Discord's user token extracted directly from the Discord desktop application. This provides seamless authentication without manual token management.

## Token Extraction

### Automatic Extraction

The simplest way to authenticate:

```bash
agent-discord auth extract

# Use --debug for troubleshooting extraction issues
agent-discord auth extract --debug
```

This command:
1. Detects your operating system (macOS, Linux, Windows)
2. Locates the Discord desktop app data directory
3. Reads the LevelDB storage containing session data
4. Extracts user token
5. Validates token against Discord API before saving
6. Discovers ALL joined guilds (servers)
7. Stores credentials securely in `~/.config/agent-discord/credentials.json`

### Platform-Specific Paths

**macOS:**
```
~/Library/Application Support/discord/
```

**Linux:**
```
~/.config/discord/
```

**Windows:**
```
%APPDATA%\discord\
```

The tool searches within:
- `Local Storage/leveldb/` - Primary token storage

### What Gets Extracted

- **token**: User token (starts with a base64-encoded user ID)
- **guilds**: All servers you're a member of

## Multi-Guild Management

### List Guilds

See all available guilds:

```bash
agent-discord guild list
```

Output:
```json
[
  {
    "id": "1234567890123456789",
    "name": "My Server",
    "current": true
  },
  {
    "id": "9876543210987654321",
    "name": "Another Server",
    "current": false
  }
]
```

### Switch Guild

Change the active guild:

```bash
agent-discord guild switch 9876543210987654321
```

All subsequent commands will use the selected guild until you switch again.

### Current Guild

Check which guild is active:

```bash
agent-discord guild current
```

## Credential Storage

### Location

Credentials are stored in:
```
~/.config/agent-discord/credentials.json
```

### Format

```json
{
  "token": "user_token_here",
  "current_guild": "1234567890123456789",
  "guilds": {
    "1234567890123456789": {
      "guild_id": "1234567890123456789",
      "guild_name": "My Server"
    },
    "9876543210987654321": {
      "guild_id": "9876543210987654321",
      "guild_name": "Another Server"
    }
  }
}
```

### Security

- File permissions: `0600` (owner read/write only)
- Tokens are stored in plaintext (same as Discord desktop app)
- Keep this file secure - it grants full access to your Discord account

## Authentication Status

Check if you're authenticated:

```bash
agent-discord auth status
```

Output when authenticated:
```json
{
  "authenticated": true,
  "user": "username",
  "current_guild": "1234567890123456789",
  "guilds_count": 5
}
```

Output when not authenticated:
```json
{
  "error": "Not authenticated. Run \"auth extract\" first."
}
```

## Token Lifecycle

### When Tokens Expire

Discord user tokens can be invalidated when:
- You change your password
- You enable/disable 2FA
- Discord forces a logout
- You manually log out of the desktop app

### Re-authentication

If commands start failing with auth errors:

```bash
# Re-extract credentials
agent-discord auth extract

# Verify it worked
agent-discord auth status
```

## Troubleshooting

### Using Debug Mode

For any extraction issues, run with `--debug` to see detailed information:

```bash
agent-discord auth extract --debug
```

This shows:
- Which Discord directory was found
- Token extraction progress
- Token validation results
- Guild discovery details

### "Discord desktop app not found"

**Cause**: Discord desktop app not installed or in non-standard location

**Solution**:
1. Install Discord desktop app
2. Log in to your account
3. Run `agent-discord auth extract` again

### "No Discord token found"

**Cause**: Not logged into Discord or token storage corrupted

**Solution**:
1. Open Discord desktop app
2. Make sure you're logged in (can see your servers)
3. Run `agent-discord auth extract --debug` to see details

### "Permission denied reading Discord data"

**Cause**: Insufficient file system permissions

**Solution** (macOS):
1. Grant Terminal/iTerm full disk access in System Preferences
2. Security & Privacy -> Privacy -> Full Disk Access
3. Add your terminal application

### "Token validation failed" errors

**Cause**: Token expired or invalidated

**Solution**:
```bash
# Re-extract fresh credentials
agent-discord auth extract

# Test authentication
agent-discord auth status
```

## Security Considerations

### What agent-discord Can Access

With extracted credentials, agent-discord has the same permissions as you in Discord:
- Read all channels you have access to
- Send messages as you
- Upload/download files
- Manage reactions
- Access user information
- View server member lists

### What agent-discord Cannot Do

- Access channels you don't have permission for
- Perform admin operations (unless you're an admin)
- Access other users' DMs without existing conversation
- Manage server settings (not implemented)

### Best Practices

1. **Protect credentials.json**: Never commit to version control
2. **Use guild switching**: Keep different contexts separate
3. **Re-extract periodically**: Keep tokens fresh
4. **Revoke if compromised**: Change your Discord password to invalidate tokens

## Manual Token Management (Advanced)

If automatic extraction fails, you can manually create credentials:

```bash
# Create config directory
mkdir -p ~/.config/agent-discord

# Create credentials file
cat > ~/.config/agent-discord/credentials.json << 'EOF'
{
  "token": "YOUR_TOKEN_HERE",
  "current_guild": "1234567890123456789",
  "guilds": {
    "1234567890123456789": {
      "guild_id": "1234567890123456789",
      "guild_name": "My Server"
    }
  }
}
EOF

# Set secure permissions
chmod 600 ~/.config/agent-discord/credentials.json
```

To find your token manually:
1. Open Discord in browser (not desktop app)
2. Open DevTools -> Network tab
3. Make any API call (send message, etc.)
4. Find request to `discord.com/api`
5. Copy `Authorization` header value

**Warning**: Self-botting (using user tokens for automation) may violate Discord's Terms of Service. Use responsibly and at your own risk.
