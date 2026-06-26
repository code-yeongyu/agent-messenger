# Authentication

iMessage authentication is unlike the other platforms: there are **no tokens, cookies, or login flow**. `agent-imessage` drives the local [imsg](https://github.com/openclaw/imsg) tool, which relies on **macOS permissions** (Full Disk Access + Automation) granted to the process that launches it. "Authentication" here means: imsg is installed, Messages.app is signed into your Apple ID, and the permissions are granted.

## What gets stored

The credential manager stores an **account record with no secrets** in `~/.config/agent-messenger/imessage-credentials.json` (mode `0600`):

```jsonc
{
  "current": "default",
  "accounts": {
    "default": {
      "account_id": "default",
      "provider": "imsg",          // backend-agnostic discriminator
      "binary_path": "/opt/homebrew/bin/imsg",  // optional; defaults to "imsg" on PATH
      "region": "US",               // optional; default region for local-format phone numbers
      "created_at": "…",
      "updated_at": "…"
    }
  }
}
```

There is no password/token field — access is governed entirely by macOS TCC permissions.

## Configuring an account

Guided:
```bash
agent-imessage setup            # verifies imsg + permissions (honors --bin/--region), then saves
```

Scriptable:
```bash
agent-imessage auth set --bin /opt/homebrew/bin/imsg --region US --current
agent-imessage auth status      # via: agent-imessage doctor
agent-imessage auth list
agent-imessage auth use <account-id>
agent-imessage auth remove <account-id>
agent-imessage auth logout      # clears all stored accounts
```

## Credential resolution order

When a command runs, the active configuration is resolved as:

1. `--account <id>` (explicit account selection), then
2. `AGENT_IMESSAGE_BIN` / `AGENT_IMESSAGE_REGION` environment variables (runtime override — **never persisted to disk**), then
3. the stored **current** account, then
4. defaults (`imsg` on PATH, no region).

If nothing resolves, commands exit with `{ "code": "not_authenticated" }` and point to `agent-imessage setup`.

## Permissions (the real "auth")

imsg needs two macOS permissions, granted to the **parent process** (the terminal / agent runtime that launches `agent-messenger`), not to `imsg` in isolation:

- **Full Disk Access** — to read `~/Library/Messages/chat.db`. Missing → `{ "code": "full_disk_access" }`.
- **Automation → Messages** — to send. Missing → `{ "code": "automation_denied" }`.

These are user-consent TCC grants and **cannot be scripted**. See [permissions](permissions.md) for the exact steps and the parent-process caveat. Run `agent-imessage doctor` to check status.

## Multi-account

Each account is an imsg configuration (binary path + default region). Messages.app has no from-selector, so **send is single-account per Mac**; multiple accounts are only meaningful if you run distinct imsg setups.
