# Authentication Guide

## Overview

agent-discord supports two ways to authenticate:

- **QR code sign-in (`auth qr`) — recommended.** Scan a QR code with the Discord mobile app to sign in through Discord's own Remote Auth flow. This is the safest and most reliable method: it never reads stored credentials off disk, works without a desktop app or browser, and uses Discord's official login confirmation on your phone.
- **Token extraction (`auth extract`).** Reads Discord's user token from the desktop application, with automatic fallback to Chromium browser profiles (Chrome, Chrome Canary, Edge, Arc, Brave, Vivaldi, Chromium). Best for automated/headless environments where no phone is available to scan.

> **Recommendation:** Prefer `agent-discord auth qr` whenever you can scan a QR code. Use `auth extract` for headless/CI setups where interactive scanning isn't possible.

## QR Code Sign-In (Recommended)

Sign in by scanning a QR code with the Discord mobile app — no desktop app or browser token extraction required. This runs Discord's official Remote Auth protocol, so you authenticate through Discord's own login confirmation rather than by reading stored credentials.

```bash
# Generate a QR code and wait for you to scan it
agent-discord auth qr

# Show protocol details while debugging
agent-discord auth qr --debug

# Human-readable output
agent-discord auth qr --pretty
```

How it works:

1. Opens a WebSocket to Discord's remote-auth gateway and performs an RSA key exchange
2. Renders a QR code in your terminal (and opens it in the browser as a fallback)
3. You scan it with the Discord mobile app: **Settings → Scan QR Code**, then confirm on your phone
4. Discord returns an encrypted ticket, which is exchanged for your user token, validated, and stored like `auth extract` — along with all discovered servers

Notes:

- **Requires the Discord mobile app** (logged in) to scan. Because it's interactive, it cannot run headlessly — use `auth extract` for CI.
- The QR code expires after about 150 seconds. Re-run `agent-discord auth qr` to generate a fresh one.
- If Discord presents a captcha challenge during the token exchange, the CLI surfaces a typed error directing you to fall back to `auth extract`.

## Token Extraction

### Automatic Extraction

The simplest way to authenticate:

```bash
agent-discord auth extract

# Use --debug for troubleshooting extraction issues
agent-discord auth extract --debug

# Scan custom Chromium profile/user-data dirs (repeatable or comma-separated)
agent-discord auth extract --browser-profile ~/browser-data
agent-discord auth extract --browser-profile ~/work-profile --browser-profile ~/personal-profile
```

This command:

1. Detects your operating system (macOS, Linux, Windows)
2. Locates the Discord desktop app data directory
3. Reads the LevelDB storage containing session data
4. Scans Chromium browser profiles for Discord tokens when the desktop app isn't found, or when custom `--browser-profile` paths are provided
5. Extracts user token (handles encrypted tokens on all platforms)
6. Validates token against Discord API before saving
7. Discovers ALL joined servers
8. Stores credentials securely in `~/.config/agent-messenger/discord-credentials.json`

Use `--browser-profile <path>` for agent-browser profiles, custom Chrome user data dirs, or portable browser profiles. The option can be repeated or given comma-separated paths; explicit paths are prioritized so they are not masked by default desktop/browser locations.

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
- **servers**: All servers you're a member of

## Multi-Server Management

### List Servers

See all available servers:

```bash
agent-discord server list
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

### Switch Server

Change the active server:

```bash
agent-discord server switch 9876543210987654321
```

All subsequent commands will use the selected server until you switch again.

### Current Server

Check which server is active:

```bash
agent-discord server current
```

## Credential Storage

### Location

Credentials are stored in:

```
~/.config/agent-messenger/discord-credentials.json
```

### Format

```json
{
  "token": "user_token_here",
  "current_server": "1234567890123456789",
  "servers": {
    "1234567890123456789": {
      "server_id": "1234567890123456789",
      "server_name": "My Server"
    },
    "9876543210987654321": {
      "server_id": "9876543210987654321",
      "server_name": "Another Server"
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
  "current_server": "1234567890123456789",
  "servers_count": 5
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
# Recommended: re-authenticate with a QR code
agent-discord auth qr

# Or re-extract credentials from the desktop app / browser
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
- Server discovery details

### "Discord desktop app not found"

**Cause**: Discord desktop app not installed or in non-standard location

**Solution**:

1. Recommended: run `agent-discord auth qr` and scan the QR code with the Discord mobile app — no desktop app or browser required
2. Or log in to discord.com in a Chromium browser (Chrome, Edge, Arc, Brave) — the CLI will extract from browser automatically
3. Or install the Discord desktop app, log in, and run `agent-discord auth extract` again

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

1. **Prefer QR sign-in**: Use `auth qr` when possible — it authenticates through Discord's official flow instead of reading credentials off disk
2. **Protect credentials.json**: Never commit to version control
3. **Use server switching**: Keep different contexts separate
4. **Re-authenticate periodically**: Keep tokens fresh
5. **Revoke if compromised**: Change your Discord password to invalidate tokens

## Manual Token Management (Advanced)

If automatic extraction fails, you can manually create the credentials file:

```bash
# Create config directory
mkdir -p ~/.config/agent-messenger

# Create credentials file
cat > ~/.config/agent-messenger/discord-credentials.json << 'EOF'
{
  "token": "YOUR_TOKEN_HERE",
  "current_server": "1234567890123456789",
  "servers": {
    "1234567890123456789": {
      "server_id": "1234567890123456789",
      "server_name": "My Server"
    }
  }
}
EOF

# Set secure permissions
chmod 600 ~/.config/agent-messenger/discord-credentials.json
```

If the user already has a token value, they can populate the file above. Otherwise, always prefer `agent-discord auth extract` to obtain the token automatically from the desktop app.

**Warning**: Self-botting (using user tokens for automation) may violate Discord's Terms of Service. Use responsibly and at your own risk.
