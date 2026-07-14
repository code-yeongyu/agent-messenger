# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `001a824ac8f23cb5506a2ee1a40c44e10afaa93c`
- Merge commit: `3029d7c1`
- Upstream pin: updated `.github/upstream.json` to `001a824ac8f23cb5506a2ee1a40c44e10afaa93c` at `2026-07-14T09:35:45Z`

## Preserved Fork Commits

Preserved 199 fork-side commits already present on the automation branch before this merge.
Most recent preserved commits:

- `0cba8d4e` Merge pull request #44 from code-yeongyu/automation/sync-upstream-3a76f0e44cb5-29302446464
- `6bd9d11d` chore: remove upstream agent report
- `bfddf35f` sync: record upstream merge report
- `6e9c8437` merge: sync main with upstream/main
- `358f5b3b` Merge pull request #43 from code-yeongyu/automation/sync-upstream-f31d1005115e-29251164469
- `2a03a01c` chore: remove upstream agent report
- `78086f0e` sync: record upstream merge report
- `d5296428` merge: sync main with upstream/main
- `640ffba3` Merge pull request #42 from code-yeongyu/automation/sync-upstream-930ad2b6e747-29104918518
- `abfc7753` chore: remove upstream agent report

## Upstream Work Merged

- `001a824a` Merge pull request #307 from agent-messenger/fix/discord-user-message-lookup
- `56d41e48` Enable Discord message lookup E2E coverage
- `abea1d27` Type Discord message reactions
- `2ec91448` Fix Discord user message lookup

## Conflicts Resolved

- `src/platforms/discord/client.ts`: preserved the fork's `replyToMessage` method and accepted upstream's `getMessages(..., { around })` support plus `getMessage` lookup-by-around behavior.
- `src/platforms/discord/commands/reaction.ts`: preserved the fork's read-only write guard for reaction mutations and accepted upstream's typed `message.reactions ?? []` access after `DiscordMessage` gained `reactions`.

No vendored files, lockfiles, scripts, or GitHub workflow files required conflict resolution.

## QA Results

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, 740 files checked
- `bun run test`: passed, 3694 tests across 270 files
- `bun run build`: passed, compiled and postbuild copied vendored LINE runtime
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
