# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `9d268f9a0cfc2f839074e4b426b07e7133f89203`
- Merge commit: `c45dd9c4`
- Upstream pin: `.github/upstream.json` updated to `9d268f9a0cfc2f839074e4b426b07e7133f89203`

## Preserved Fork Commits

Preserved the fork side of history from `34426a5e4554692d27298a962180a24fe88c50ca`, including 105 non-merge fork commits not present on upstream. Recent preserved commits include:

- `7402cf5f chore: remove upstream agent report`
- `f0278af1 sync: record upstream merge report`
- `386d983f style(discord): format merged message tests`
- `279f6e6e sync: record upstream pin f727283`

The preserved fork line also includes the existing access-control work, reply command support across platforms, Discord read-only guard work, upstream automation workflow changes, and prior upstream sync report/pin commits.

## Conflicts Resolved

- `skills/agent-whatsapp/SKILL.md`: kept both fork reply command docs and upstream edit command docs.
- `src/platforms/discordbot/commands/message.test.ts`: kept fork `replyAction` coverage and upstream renamed `editAction` import.
- `src/platforms/whatsapp/client.test.ts`: combined both add/add test files, preserving fork store persistence tests and upstream `summarizeMessage` edit-unwrapping tests.
- `src/platforms/whatsapp/commands/message.ts`: exposed both `message reply` and upstream `message edit` subcommands.
- `src/platforms/whatsapp/commands/message.test.ts`: kept mocks and coverage for both reply and edit commands.

No vendored files were edited by hand.

## QA Results

- `bun install --frozen-lockfile`: passed, no lockfile changes.
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no lockfile changes.
- `bun run typecheck`: passed.
- `bun run lint`: passed with 0 warnings and 0 errors.
- `bun run format:check`: passed.
- `bun run test`: passed, 3659 pass, 0 fail.
- `bun run build`: passed.
- `node dist/src/cli.js --help`: passed.
- `node dist/src/cli.js slack --help`: passed.

## Result

The branch is clean and PR-ready after merging upstream `9d268f9a0cfc2f839074e4b426b07e7133f89203`.
