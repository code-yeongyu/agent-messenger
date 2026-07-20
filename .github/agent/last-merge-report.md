# Upstream Merge Report

- Result: clean PR-ready merge
- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 82344759d2f59863cacc8c3312fb381659cf108a
- Merge commit: 069ea7e2
- Upstream pin commit: 6b323eba
- Synced at: 2026-07-20T15:37:19Z

## Preserved Fork Commits

All pre-existing fork history was preserved with a no-ff merge. The branch had 223 fork-side commits not present in upstream/main before this sync; after the merge and upstream-pin commit, `git rev-list --count upstream/main..HEAD` reported 225 commits.

Recent preserved fork-side commits include:

- 9c031daf Merge pull request #50 from code-yeongyu/automation/sync-upstream-1da9624b7999-29736951018
- e956181e Merge remote-tracking branch 'upstream/main' into automation/sync-upstream-1da9624b7999-29736951018
- c3af3c88 chore: remove upstream agent report
- 59068054 sync: record upstream merge report
- dad07708 sync: record upstream pin 4f4a1b4
- f57c3575 fix(discord): default personal tokens to readonly
- de2ff564 docs(discord): prefer bot automation tokens
- 28a352e9 feat(discord): block readonly utility writes
- a20c2950 feat(discord): block readonly message writes
- ba05d06e feat(discord): add readonly account guard

## Conflicts

Resolved one conflict:

- `skills/agent-discord/SKILL.md`: kept the fork's personal-token readonly description and safety warnings, and took upstream's `2.32.1` version bump.

No lockfile conflicts occurred. No vendored files were edited by hand.

## QA

Passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` - 3739 pass, 0 fail
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

