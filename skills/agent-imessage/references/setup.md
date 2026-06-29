# imsg Setup (Operator Guide)

iMessage has no public API. `agent-imessage` runs **on a Mac** and uses [imsg](https://github.com/openclaw/imsg) — a native Swift CLI — to read the local Messages database and send through Messages.app. The agent must run on the same Mac (imsg is local-only; there is no network/server).

## Requirements

- **macOS 14+** (Sonoma or newer). imsg supports macOS 26/Tahoe with caveats (group sends via AppleScript can fail; imsg reports the failure honestly rather than lying).
- **Messages.app signed in** to your Apple ID. A **dedicated Apple ID** is recommended to avoid mixing automated traffic with your personal account.
- **imsg installed**: `brew install steipete/tap/imsg`.
- **Full Disk Access** and **Automation → Messages** permissions (see below).

## One-time setup

1. **Install imsg**
   ```bash
   brew install steipete/tap/imsg
   imsg --version
   ```
2. **Sign Messages.app into iMessage** with your (dedicated) Apple ID.
3. **Grant Full Disk Access** — System Settings → Privacy & Security → Full Disk Access → add the app/terminal that will launch `agent-messenger`. This is required to read `~/Library/Messages/chat.db`.
4. **Grant Automation → Messages** — triggered on first send; approve the prompt (System Settings → Privacy & Security → Automation → Messages).
5. **Verify and save an account**
   ```bash
   agent-imessage setup      # guided: checks imsg + permissions, saves account
   agent-imessage doctor     # re-check anytime
   ```

### The parent-process permission caveat (important)

macOS grants Full Disk Access and Automation to the **process that launches imsg** — i.e. the terminal, IDE, or agent runtime that runs `agent-imessage`, not `imsg` in isolation. If `doctor` reports `full_disk_access: denied`, grant Full Disk Access to **that launching app** and restart it.

## Feature tiers

- **Core (no SIP):** list/search chats, read history, send text, watch new messages, standard tapbacks (to the most recent incoming message). This is all that `agent-imessage` v1 uses.
- **Bridge (advanced):** typing indicators, read receipts, edit/unsend, group create/rename/members, and reacting to a *specific* message or with custom emoji. These require `imsg launch` (which injects into IMCore) and **disabling SIP**. Not used by v1; documented for completeness.

## Multi-account

Each `agent-imessage` account is an imsg configuration (binary path + default region). Messages.app has no from-selector, so **send is single-account** per Mac. Configure additional accounts only if you run multiple imsg binaries/setups:
```bash
agent-imessage auth set --bin /opt/homebrew/bin/imsg --region US --account home --current
agent-imessage auth use home
```

## Reliability notes

- The Mac must stay awake and logged in for live `watch` to keep receiving.
- imsg's watcher uses filesystem events + polling and re-arms across Messages database (WAL) rotation, so it keeps up on busy/iCloud-synced databases.
- Pin macOS updates if stability matters — major updates can change AppleScript/IMCore behavior.
