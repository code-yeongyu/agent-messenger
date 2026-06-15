# src/platforms

16 platform dirs, each a standalone CLI + SDK client. Bot variants are leaner.

## Canonical layout

| File | Responsibility |
|---|---|
| `cli.ts` | Commander program; imports from `./commands/index`; `preAction` → `ensure<P>Auth()` |
| `client.ts` | `<P>Client` class; `login(creds?)`, API methods, companion `<P>Error` |
| `types.ts` | Interfaces, Zod schemas, `<P>Credentials`/`<P>Config` |
| `client-mappers.ts` | Raw-API → typed mapping (split to stay under 250 LOC) |
| `index.ts` | SDK barrel: re-exports client, credential-manager, listener, types |
| `credential-manager.ts` | Reads/writes `<p>-credentials.json` under `getConfigDir()` at `0o600` |
| `token-extractor.ts` | Personal only: extract tokens from desktop app / Chromium |
| `ensure-auth.ts` | Personal only: check → refresh → extract → validate → persist |
| `listener.ts` | Optional real-time listener (EventEmitter) |
| `commands/index.ts` | Barrel re-exporting each `<x>Command` |
| `commands/<group>.ts` | One `Command` per file; tests co-located `<group>.test.ts` |

## Commands

Each `commands/<group>.ts` exports `const <group>Command = new Command('<group>')` with nested subcommands. Private async `<sub>Action` functions load workspace creds, call `client.login()`, gate through `engine.assertAllowed('<p>','write',target)` (or `filterTargets` for lists), make the API call, then `console.log(formatOutput(data, opts.pretty))`, all wrapped in `try/catch { handleError(e) }`.

`cli.ts` registers them via `./commands/index.ts`: `import { authCommand, messageCommand, ... }` then `program.addCommand(authCommand)`. Personal platforms add a `preAction` hook skipping auth subcommands.

## Personal vs bot variant

Bot pairs: `slack`/`slackbot`, `discord`/`discordbot`, `telegram`/`telegrambot`, `whatsapp`/`whatsappbot`, `channeltalk`/`channeltalkbot`; `wechatbot` is bot-only.

- Personal: `auth extract` (auto desktop/browser). Bot: `auth set <token>`.
- Bot dirs drop `token-extractor.ts`, `ensure-auth.ts`, `client-mappers.ts`; no `preAction` auth hook.
- Bot creds file: `<p>bot-credentials.json`. Stores token, bot_id, workspace_id; shape `{ current, workspaces }`.
- Bot command set is a subset. Bot listeners: Socket Mode, Gateway, or long-polling.

## Divergences

- `kakaotalk`: `protocol/` subdir (custom LOCO binary protocol) + `auth/kakao-login.ts` + chat-classifier, attachment-router, image-meta, media-upload.
- `telegram`: No `index.ts` (CLI only); `await program.parseAsync(argv)`; `commands/shared.ts` exports `withTelegramClient()` for per-command TDLib sessions; extra `tdlib.ts`, `my-telegram-org.ts`, `chat-utils.ts`, `app-config.ts`; phone-code auth.
- `channeltalk`/`channeltalkbot`: Commands use factory functions `createAuthCommand()` etc. (instantiated at `addCommand` time) plus singleton exports. Only platform diverging from singleton-export.
- `webex`: Extra `encryption.ts` (E2E device-grant), `markdown-to-html.ts`, `app-config.ts`; most complex auth flow.
- `discord`: `readonly-guard.ts` (blocks writes from read-only Electron tokens) + `super-properties.ts` (X-Super-Properties headers); raw fetch with inline rate-limit.
- `line` / `whatsapp`: QR / pairing-code login, no `token-extractor.ts`. `whatsapp` uses Baileys + `suppress-ws-warnings.ts`.

## Recipes

### Add a command to an existing platform

1. Add `<sub>Action` in `commands/<group>.ts`: creds → `client.login()` → policy gate → API call → `formatOutput`.
2. Chain `.addCommand(new Command('<sub>').argument(...).option('--pretty').action(<sub>Action))`.
3. Add client method in `client.ts` if missing; extend `commands/<group>.test.ts`.

### Add a whole new platform (`signal`)

1. Create `src/platforms/signal/`: `cli.ts`, `client.ts` (`SignalClient` + `SignalError`), `types.ts`, `credential-manager.ts`, `token-extractor.ts`, `ensure-auth.ts`, `commands/{index,auth,message}.ts`, `index.ts` (SDK barrel).
2. Register in `package.json`: `"agent-signal": "./src/platforms/signal/cli.ts"` in `bin`; `"signal": ["./src/platforms/signal/index.ts"]` in `typesVersions`; `"./signal": { "types": "...index.ts", "default": "...index.ts" }` in `exports`.
3. If policy-guarded, add `src/policy/platform-mappers/signal.ts` and register the platform string.
4. Bot variant `signalbot` = same minus `token-extractor.ts`, `ensure-auth.ts`, `auth set`, `signalbot-credentials.json`.
