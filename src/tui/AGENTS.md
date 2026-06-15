# src/tui

blessed terminal UI aggregating all platforms behind a unified adapter layer. Launched via `agent-messenger tui`.

## Structure

- [`app.ts`](app.ts) — monolithic orchestrator (~890 LOC): `createApp()` builds every widget, owns state, routes input
- [`adapters/`](adapters/) — 10 `PlatformAdapter` implementations + [`adapters/types.ts`](adapters/types.ts) (the interface + unified types)
- [`views/`](views/) — `channel-picker.ts` + `workspace-picker.ts` (near-identical fuzzy overlays)
- [`cli.ts`](cli.ts) — thin Commander action that dynamic-imports and calls `createApp()`
- [`utils.ts`](utils.ts) — `formatTimestamp`, `truncate`, `fuzzyMatch`, `stripHtml` (the only file with tests)

## Architecture

`createApp()` owns everything in closure scope: blessed widgets (screen/header/sidebar/messageLog/inputBox/statusBar), plain mutable state (no state lib), 4 modes (`selection`|`read`|`write`|`auth`), 3 nav levels (`platform`|`workspace`|`channel`), and a `platformStates` array — one `PlatformState` per platform (adapter, label, enabled, channels, workspaces, listening, lastChannelId).

Each platform is wrapped in a `LazyPlatformAdapter` proxy (`app.ts:10-81`) that defers the real adapter's `import()`, memoizes it, delegates `PlatformAdapter` methods, and optional-chains the optional ones.

`PlatformAdapter` (`adapters/types.ts:30-43`): `name`, `login`, `getChannels`, `getMessages`, `sendMessage`, optional `startListening`/`stopListening`/`getWorkspaces`/`switchWorkspace`/`getCurrentWorkspace`, `getAuthHint`, `authenticate(io)`. Unified types: `UnifiedChannel`, `UnifiedMessage`, `Workspace`, `AuthHint`, `AuthIO` (`print`/`prompt` for in-TUI auth).

## Launch

`agent-messenger tui` → `src/cli.ts` registers `tui` as an `executableFile` subcommand → [`cli.ts`](cli.ts) → `createApp()` in [`app.ts`](app.ts).

## Conventions

- Adapters load via dynamic-import factories in the `platformStates` array — nothing loads until a platform is selected.
- Each adapter guards with a private `ensureClient()` (throws before `login()`).
- Messages mapped reversed (newest last); `screen.render()` after every mutation.
- Fuzzy pickers: `Ctrl+K` channels, `Ctrl+W` workspaces (via `fuzzyMatch`).
- `fullUnicode: true` is the only CJK/wide-char handling — no explicit wcwidth.
- Only Slack and Discord implement `startListening` (real-time streaming); the rest are poll-on-open.

## Add a platform

1. Create `adapters/<p>-adapter.ts` implementing `PlatformAdapter` (use [`adapters/slack-adapter.ts`](adapters/slack-adapter.ts) as reference — it has workspaces + listening + auth IO).
2. Register a block in the `platformStates` array in [`app.ts`](app.ts) (lazy-import factory + label). No other file changes.

## Note

[`app.ts`](app.ts) is ~890 LOC, far over the ~250-LOC ceiling. The `platformStates` registration (10 lazy factories) is the bloat to extract into a registry.
