# src/shared

Cross-cutting utilities and Chromium cookie extraction. No shared base client - each platform's `<P>Client` is standalone; only conventions (`.login(creds?)`, `sendMessage`/`getMessages`, `<P>Error`) are shared.

## utils/

| File | Export | Use |
|---|---|---|
| `output.ts` | `formatOutput(data, pretty?)` | Sole stdout JSON serializer (compact / `--pretty`) |
| `error-handler.ts` | `handleError(err)` | Catch-all: stderr `{"error": err.message}` then exit 1 |
| `cli-output.ts` | `cliOutput(result, pretty?, exitOnError?)` | Bot helper: stdout JSON + auto-exit 1 if `result.error` |
| `stderr.ts` | `info/warn/error/debug()` | Colored stderr progress (red/yellow/dim; plain if not TTY) |
| `config-dir.ts` | `getConfigDir()` | `~/.config/agent-messenger` or `$AGENT_MESSENGER_CONFIG_DIR` |
| `concurrency.ts` | `parallelMap(items, fn, concurrency=5)` | Bounded-parallel map (snapshots) |
| `derived-key-cache.ts` | `DerivedKeyCache` | Caches PBKDF2-derived keys at `~/.config/agent-messenger/.derived-keys/` (mode `0o600`) - stores derived key, never the password |
| `linux-keyring.ts` | `lookupLinuxKeyringPassword(appName)` | `secret-tool` lookup for Chromium Linux keyring |
| `qr.ts` | `displayQR`, `renderTerminalQR`, etc. | QR rendering for auth flows and TUI |

## chromium/

Browser cookie-extraction infra used by platforms whose token-extractor reads Chromium cookies.

- `index.ts` - barrel
- `types.ts` - `BrowserConfig`, `KeychainVariant`
- `browsers.ts` - `CHROMIUM_BROWSERS`, `discoverBrowserProfileDirs`, `getAgentBrowserProfileDirs`, `findLocalStatePath`, `getBrowserBasePath`
- `cookie-reader.ts` - `ChromiumCookieReader`: copies SQLite cookie DB to temp, queries via `bun:sqlite` (fallback `better-sqlite3`)
- `decryptor.ts` - `ChromiumCookieDecryptor`: macOS Keychain, Linux libsecret/keyring, Windows DPAPI via PowerShell
- `cli-options.ts` - `collectBrowserProfileOption`: Commander custom parser for `--browser-profile`

Used by Slack, Discord, Teams, Webex, Channel Talk, and Instagram token extractors.

## Output contract

- **stdout** = JSON via `console.log(formatOutput(data, opts.pretty))`. Success = platform JSON. Business error = `{"error":"..."}` + exit 1. Soft warning = `{"warning":...}` (exit 0).
- **stderr** = `handleError` errors as `{"error":msg}` (red if TTY); progress via `info/warn/debug`.
- **Exit**: 0 success (including soft warnings), 1 error.
- **Two patterns**: older platforms (Slack, Discord) inline `formatOutput` + `process.exit` with `catch -> handleError`; bot platforms return a result then call `cliOutput(result, pretty)`.

## Error pipeline

Any thrown `Error` in a command action -> `catch (e) { handleError(e as Error) }` -> `stderr.error(JSON.stringify({error: err.message}))` -> `process.exit(1)`. `PolicyDeniedError` flows identically -> `{"error":"policy: write denied"}`. No target ids are ever leaked.

## What platforms import

- **Universal**: every command file imports `handleError` (`@/shared/utils/error-handler`) and `formatOutput` (`@/shared/utils/output`).
- **Selective**: `cliOutput` (bot CLIs), `info/warn/debug` (stderr progress), `collectBrowserProfileOption` (`@/shared/chromium`), `DerivedKeyCache` + `lookupLinuxKeyringPassword` (token extractors), `parallelMap` (snapshots), `displayQR` / `renderTerminalQR` (QR auth, TUI).
