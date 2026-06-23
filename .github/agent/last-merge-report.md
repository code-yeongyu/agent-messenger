# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `2f2a628e24a06432853fe09321fea305f9eff538`
- Pre-merge fork HEAD: `d012f19c05de0e2e675fcb9b7da71d1846cf30a0`
- Merge commit: `300316d`
- Upstream pin commit: `437057e`
- Synced at: `2026-06-23T07:13:49Z`

## Preserved Fork Commits

The merge preserved the existing fork history with a `git merge --no-ff upstream/main`.

Recent fork commits preserved at the merge point:

- `d012f19` Merge pull request #19 from code-yeongyu/automation/sync-upstream-6d5b39184147-28004079262
- `0fa6d61` style(webex): format merged message tests
- `35df793` merge: sync main with upstream/main

The longer fork-only history remains reachable through the first parent of merge commit `300316d`.

## Conflicts

Resolved one content conflict:

- `skills/agent-discord/SKILL.md`

Resolution:

- Kept the fork's readonly/personal-token safety description for `agent-discord`.
- Took upstream's `2.26.0` skill version bump.
- Kept upstream's new `agent-discord auth qr` documentation.
- Kept the fork's guidance that message writes should use `agent-discordbot`.

No lockfile, `.github/upstream.json`, `src/vendor/**`, or `scripts/**` merge conflicts occurred.

## QA

All requested commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3406 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Result

Branch is PR-ready with the upstream merge and upstream pin recorded.
