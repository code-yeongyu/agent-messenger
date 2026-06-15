# agent-messenger

Multi-platform messaging **CLI + TypeScript SDK** for AI agents. Sends as *you* (session tokens extracted from desktop apps / browsers), not as a bot — bot tokens also supported. 16 platforms: Slack, Discord, Teams, Webex, Telegram, WhatsApp, LINE, WeChat, Instagram, KakaoTalk, Channel Talk (+ bot variants). Stack: TypeScript (ESM, strict), Bun, Commander, Zod, oxlint/oxfmt. Bun runs TS directly in dev; compiles to Node for npm consumers.

## Structure

```
src/
├── cli.ts              # Root `agent-messenger`/`amsg` dispatcher (Commander, subprocess-delegates to platform CLIs)
├── commands/policy/    # `agent-messenger policy` show/validate/edit (engine lives in src/policy/, not here)
├── platforms/<16>/     # One dir per platform = CLI + SDK client. See src/platforms/AGENTS.md
├── policy/             # Access-control engine + per-platform mappers. See src/policy/AGENTS.md
├── shared/             # Cross-cutting: utils (output/error/config) + chromium cookie extraction. See src/shared/AGENTS.md
├── tui/                # blessed-based unified TUI over all platforms. See src/tui/AGENTS.md
└── vendor/             # Vendored LINE (linejs, linejs-types) — generated; do NOT edit/lint/format
docs/                   # SEPARATE Next.js + fumadocs site, own node_modules. See docs/AGENTS.md
e2e/                    # Per-platform e2e tests (own bunfig, NOT in CI) + README
skills/<16>/SKILL.md    # Agent Skills, one per CLI (version-bumped on release)
scripts/                # postbuild.ts, prepublish.ts (build); kakao-loco-capture.ts (diagnostic, NEVER shipped)
examples/               # SDK listener usage samples
```

## Where to look

| Task | Location |
|------|----------|
| Add/modify a platform command | `src/platforms/<p>/commands/<group>.ts` (+ method in `client.ts`) |
| Add a new platform | `src/platforms/<p>/` + `package.json` bin/exports/typesVersions — see src/platforms/AGENTS.md |
| Access-control / deny rules | `src/policy/` — see src/policy/AGENTS.md |
| CLI output / error formatting | `src/shared/utils/{output,error-handler,cli-output,stderr}.ts` |
| Token extraction (desktop/browser) | `src/platforms/<p>/token-extractor.ts` + `src/shared/chromium/` |
| TUI / new TUI adapter | `src/tui/` — see src/tui/AGENTS.md |
| Docs content | `docs/content/docs/**.mdx` — see docs/AGENTS.md |
| Build / publish mechanics | `scripts/postbuild.ts`, `scripts/prepublish.ts`, `.github/workflows/` |

## CLI Architecture

Commander.js, **two-level subprocess dispatch**. `src/cli.ts` registers each platform as a Commander `executableFile` subcommand → forks that platform's own `cli.ts` as a child process. Only `policy` (in-process) and `tui` (subprocess) are non-platform commands. Each `src/platforms/<p>/cli.ts` is a standalone Commander program: imports `<x>Command` from `./commands/index.ts`, registers a `preAction` hook that runs `ensure<P>Auth()` (skipped for `auth` subcommands), then parses argv. A command file exports one `const <group>Command = new Command('<group>')` with `.action(<group>Action)` handlers. Handler shape: load creds → `client.login()` → policy gate → API call → `console.log(formatOutput(data, opts.pretty))`, all wrapped in `try/catch { handleError(e) }`.

## TypeScript Execution Model

### Local Development

Bun runs TypeScript directly — no compilation step needed.

- `bin` entries in `package.json` point to `./src/*.ts` files
- All CLI entry points use `#!/usr/bin/env bun` shebang
- Run any file: `bun src/cli.ts`
- Run with hot reload: `bun --hot src/cli.ts`

### Production Build (Publish)

`bun run build` compiles to `dist/` for npm consumers who don't have Bun.

1. `tsc` compiles `src/` → `dist/src/` (JS + declarations + source maps)
2. `tsc-alias` resolves `@/*` path aliases in the compiled output
3. `scripts/postbuild.ts` replaces `#!/usr/bin/env bun` → `#!/usr/bin/env node` in CLI files, then copies `src/vendor/` → `dist/src/vendor/`
4. `module` and `main` in `package.json` point to `dist/cli.js`

npm consumers run compiled JS via Node.js. The `prepublishOnly` script runs the build, then `scripts/prepublish.ts` rewrites `bin`/`exports`/`typesVersions` paths from `./src/*.ts` to `dist/src/*.js`. After publish, `postpublish` restores `package.json` via `git checkout`.

### Key Distinction

|             | Local (dev)          | Published (npm)       |
| ----------- | -------------------- | --------------------- |
| Runtime     | Bun                  | Node.js               |
| Entry files | `src/*.ts`           | `dist/src/*.js`       |
| Shebang     | `#!/usr/bin/env bun` | `#!/usr/bin/env node` |
| Compilation | None (Bun runs TS)   | `tsc` → `dist/`       |

## Conventions (deviations only)

- **Path alias** `@/*` → `src/*` (tsconfig). 6 vendor overrides redirect LINE JSR packages (`@jsr/evex__linejs-types`, `@jsr/evex__loose-types`, …) → `src/vendor/`.
- **Format**: oxfmt — `printWidth: 120`, **no semicolons**, single quotes, auto `sortImports`. NOT Prettier/Biome. No `.editorconfig`.
- **Lint**: oxlint with **zero rule overrides** (defaults only). Ignores `dist/`, `e2e/`, `scripts/`, `src/vendor/`.
- **tsconfig**: `noUnusedLocals` / `noUnusedParameters` are **false**; test files excluded from `tsc` (Bun runs them). No `engines` field.
- **Tests**: `bun test` runs `bun test src/` (bunfig root `./src`), co-located `*.test.ts`. E2E: `bun test:e2e` (`bunfig.e2e.toml`, root `./e2e`, preload `setup.ts`, 30s timeout). Mocks are hand-rolled `bun:test` `mock()` + inline fixtures — no `__mocks__`, no mock libs.
- **SDK exports**: 15 subpaths `agent-messenger/<platform>` (`types`+`default` → src index). `agent-telegram` (user) is **CLI-only** — no SDK subpath.
- **No shared base client** — each platform's `client.ts` is standalone; only patterns are shared (`.login(creds?)`, companion `<P>Error` class).

## Commands

```bash
bun install            # deps (also run `cd docs && bun install` once — required for format:check)
bun test               # unit tests (bun test src/)
bun test:e2e           # e2e tests (bunfig.e2e.toml)
bun typecheck          # tsc --noEmit (does NOT cover docs/)
bun lint               # oxlint
bun lint:fix           # oxlint --fix
bun format             # oxfmt --write .
bun format:check       # oxfmt --check . (needs docs/ installed — see below)
bun run build          # tsc && tsc-alias, then postbuild (shebang bun→node + copy vendor/)
```

`docs/` is a separate sub-project with its own `node_modules`. `bun run format:check` resolves Tailwind classes through `docs/src/app/globals.css`, which transitively imports `fumadocs-ui` — so the docs install must have run at least once or the format check will fail with `Can't resolve 'fumadocs-ui/...'`.

## Anti-Patterns (this project)

- **No `as any` / `@ts-ignore`** — strict TS, parse-don't-validate with Zod at boundaries.
- **Policy denials leak nothing** — `PolicyDeniedError` carries only `read|write`, never channel/user ids. Don't special-case it; let the `handleError` pipeline mask it to stderr JSON.
- **`engine.assertAllowed(...)` BEFORE the client mutation**; use `engine.filterTargets(...)` for list ops. Details in src/policy/AGENTS.md.
- **Credential files written `0o600`** on every write (TODO: not honored on Windows). Passwords are never stored/transmitted/logged — only PBKDF2-**derived** keys are cached (`src/shared/utils/derived-key-cache.ts`).
- **Policy loader fails closed** — corrupt/invalid policy throws `policy: invalid configuration`; only a *missing* file means "no restrictions".
- **`scripts/` is never shipped** to npm and may contain PII bypasses (kakao-loco-capture redacts before any disk write). Never import `scripts/` from `src/`.
- **Never edit/lint/format `src/vendor/`** — vendored LINE, regenerated upstream.
- **Files over ~250 pure LOC** are an architectural smell — split (e.g. `client.ts` + `client-mappers.ts`).

## Access Control Module (summary)

Deny-list policy at `~/.config/agent-messenger/policy.json` (override `AGENT_MESSENGER_POLICY_FILE`). v1 is **deny-only**, platforms `slack`/`discord`/`teams`. Foundation lives at `src/policy/`:

- `types.ts` — Zod schemas for `PolicyConfig`, `PolicyRules`, `PolicyTarget`
- `errors.ts` — `PolicyDeniedError` (vague message, never includes target ids)
- `loader.ts` — `loadPolicy(path?)` (env override `AGENT_MESSENGER_POLICY_FILE`, fail-closed on schema/parse error)
- `engine.ts` — `PolicyEngine` (`isDenied` / `assertAllowed` / `filterTargets` / `hasRule`), plus `getPolicyEngine()` cached singleton and `resetPolicyEngine()` for tests
- `platform-mappers/{slack,discord,teams}.ts` — each exports the 3-function mapper contract; Slack is the reference

Full engine API, the 3-export mapper contract, and the recipes for **adding a guard** / **adding a platform mapper** → **src/policy/AGENTS.md**. User-facing reference → README "Access Control".

## Release

Use the **Release** GitHub Actions workflow (`workflow_dispatch`). It typechecks, lints, tests, bumps version in `package.json` / `.claude-plugin/plugin.json` / `README.md` / `skills/*/SKILL.md`, commits, tags, publishes to npm, and creates a GitHub Release. Tags have no `v` prefix.

### Version Decision

- If the user specifies an exact version (e.g., `1.5.0`), use it as-is.
  Otherwise, the agent decides the bump level based on the changes since the last release (never bump major unless user explicitly asks):
  - **minor** — New features, new commands, new platform support, breaking changes
  - **patch** — Bug fixes, refactors, docs, dependency updates, minor improvements
- Never ask the user which version to bump. Decide and proceed.
