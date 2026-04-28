# agent-messenger

Multi-platform messaging CLI for AI agents (Slack, Discord, Teams).

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
3. `scripts/postbuild.ts` replaces `#!/usr/bin/env bun` → `#!/usr/bin/env node` in CLI files
4. `module` and `main` in `package.json` point to `dist/cli.js`

npm consumers run compiled JS via Node.js. The `prepublishOnly` script runs the build, then `scripts/prepublish.ts` rewrites `bin` paths from `./src/*.ts` to `dist/src/*.js`. After publish, `postpublish` restores `package.json` via `git checkout`.

### Key Distinction

|             | Local (dev)          | Published (npm)       |
| ----------- | -------------------- | --------------------- |
| Runtime     | Bun                  | Node.js               |
| Entry files | `src/*.ts`           | `dist/src/*.js`       |
| Shebang     | `#!/usr/bin/env bun` | `#!/usr/bin/env node` |
| Compilation | None (Bun runs TS)   | `tsc` → `dist/`       |

## Commands

```bash
bun install     # Install dependencies (also run `cd docs && bun install` once for format:check)
bun link        # Link CLI globally for local testing
bun test        # Run unit tests
bun test:e2e    # Run e2e tests
bun typecheck   # Type check without emitting
bun lint        # Lint with oxlint
bun lint:fix    # Lint with oxlint (autofix)
bun format      # Format with oxfmt
```

`docs/` is a separate sub-project with its own `node_modules`. `bun run format:check` resolves Tailwind classes through `docs/src/app/globals.css`, which transitively imports `fumadocs-ui` — so the docs install must have run at least once or the format check will fail with `Can't resolve 'fumadocs-ui/...'`.

## Access Control Module

Foundation lives at `src/policy/`:

- `types.ts` — Zod schemas for `PolicyConfig`, `PolicyRules`, `PolicyTarget`
- `errors.ts` — `PolicyDeniedError` (vague message, never includes target ids)
- `loader.ts` — `loadPolicy(path?)` (env override `AGENT_MESSENGER_POLICY_FILE`, fail-closed on schema/parse error)
- `engine.ts` — `PolicyEngine` (`isDenied` / `assertAllowed` / `filterTargets` / `hasRule`), plus `getPolicyEngine()` cached singleton and `resetPolicyEngine()` for tests

Per-platform mappers at `src/policy/platform-mappers/{slack,discord,teams}.ts` each export:

- `<platform>ChannelToTarget(channel)` — pure mapping
- `shouldResolveChannelForPolicy(engine, direction)` — uses `engine.hasRule`
- `resolve<Platform>ChannelTarget(client, engine, channelId, direction[, teamId])` — resolve-then-map (skips API call when no relevant rules apply)

Adding a guard to a new command: import `getPolicyEngine` and the platform's `resolve<Platform>ChannelTarget`; for writes call `engine.assertAllowed(...)` BEFORE the client mutation; for list ops call `engine.filterTargets(...)`. The existing `handleError` pipeline turns `PolicyDeniedError` into the masked stderr JSON automatically.

Adding a new platform mapper: implement the same 3 exports, mirror Slack as the reference. The engine itself stays platform-agnostic.

## Release

Use the **Release** GitHub Actions workflow (`workflow_dispatch`). It typechecks, lints, tests, bumps version in `package.json` / `.claude-plugin/plugin.json` / `README.md` / `skills/*/SKILL.md`, commits, tags, publishes to npm, and creates a GitHub Release. Tags have no `v` prefix.

### Version Decision

- If the user specifies an exact version (e.g., `1.5.0`), use it as-is.
  Otherwise, the agent decides the bump level based on the changes since the last release (never bump major unless user explicitly asks):
  - **minor** — New features, new commands, new platform support, breaking changes
  - **patch** — Bug fixes, refactors, docs, dependency updates, minor improvements
- Never ask the user which version to bump. Decide and proceed.
