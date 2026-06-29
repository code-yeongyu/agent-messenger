# macOS Permissions for imsg

`agent-imessage` drives [imsg](https://github.com/openclaw/imsg), which needs two macOS permissions. These are TCC (Transparency, Consent, and Control) grants that **cannot be scripted** — a human must approve them once in System Settings.

## Full Disk Access (required for everything)

imsg reads the Messages database at `~/Library/Messages/chat.db`, which macOS protects behind Full Disk Access.

- **Grant to:** the app/terminal/agent-runtime that launches `agent-messenger` — **the parent process**, not `imsg` alone.
- **Where:** System Settings → Privacy & Security → Full Disk Access → enable your terminal/app → restart it.
- **Symptom when missing:** `agent-imessage doctor` reports `full_disk_access: denied`; commands return `{ "code": "full_disk_access" }`.

## Automation → Messages (required to send)

Sending uses AppleScript automation of Messages.app.

- **Grant to:** same parent process.
- **Where:** System Settings → Privacy & Security → Automation → (your app) → enable **Messages**. macOS prompts automatically on the first send attempt.
- **Symptom when missing:** sends fail with `{ "code": "automation_denied" }`.

## Contacts (optional)

Used only to resolve sender names. Nothing breaks without it; `from_name` is simply absent.

## Why these can't be automated

TCC grants are deliberately user-consent-only. `tccutil` can reset permissions but cannot grant them, and the TCC database is protected by SIP. There is no supported way to grant Full Disk Access or Automation programmatically on an unmanaged Mac — plan for a one-time manual approval (a quick Screen Sharing/VNC session works for a headless Mac).

## SIP and the advanced bridge

Core features (send/read/watch/standard tapbacks) need **no SIP changes**. Only the advanced bridge (`imsg launch`: typing, edit/unsend, group management, targeted/custom reactions) requires **disabling SIP**, which is a separate, deliberate step and out of scope for the core `agent-imessage` features.
