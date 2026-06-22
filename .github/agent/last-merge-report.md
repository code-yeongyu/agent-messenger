# Upstream Merge Report

## Result

Merged `upstream/main` into the current automation branch with a history-preserving `git merge --no-ff`.

## Upstream

- Repository: `agent-messenger/agent-messenger`
- Branch: `main`
- SHA: `79b53ef7640e17f8473207c9f3f592f729d7d1ea`
- Merge commit: `c26d6779dd17489677b714386be36198a582e379`

## Preserved Fork Commits

The existing fork history was preserved with no rebase or history rewrite. Recent fork-only commits retained on the branch include:

- `f41b1a3` Merge pull request #17 from `code-yeongyu/automation/sync-upstream-14041e1804e1-27968516509`
- `7fe68c6` chore: remove upstream agent report
- `3615d19` sync: record upstream merge report
- `5867b5b` sync: record upstream pin 14041e1
- `85b404c` Merge pull request #16 from `code-yeongyu/automation/sync-upstream-80c0b7e61dea-27962154393`
- `ebabe6e` fix(webex): preserve reply output refs after merge
- `2a8808d` fix: satisfy discord readonly guard lint
- `e611aaf` ci(upstream): wait for PR checks to appear

## Conflicts

Resolved one content conflict:

- `skills/agent-discord/SKILL.md`
  - Kept the fork's readonly/personal-token safety description.
  - Took upstream's `2.24.1` skill version bump.

No vendored files were edited by hand. No lockfiles required regeneration.

## Upstream Pin

Updated `.github/upstream.json` in the merge commit:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: `79b53ef7640e17f8473207c9f3f592f729d7d1ea`
- `synced_at`: `2026-06-22T18:23:55Z`

## QA

All requested checks passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3389 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Notes

No release was run, no tags were created, no PRs were opened or edited, and nothing was pushed.
