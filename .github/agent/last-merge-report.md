# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `8d6b147e94f439b91cff6f897725e54dbbb69af5`
- Merge commit: `d4e2ddcd122631d1769e99424ec5767ff734b3e5`
- Pin commit: `8e54c2b1`
- Synced at: `2026-07-30T01:34:06Z`

## Preserved Fork Commits

Preserved 239 fork-side commits from the pre-merge fork branch, including the upstream sync automation, access-control policy work, readonly Discord personal-token guardrails, reply command support across platforms, iMessage support, and prior upstream sync history. The merge parent kept the fork head `163fedf4a14329acf2affc0cc7095e913f322334` intact.

Recent preserved fork commits:

- `163fedf4` Merge pull request #54 from code-yeongyu/automation/sync-upstream-1f83a9d7b494-30285905894
- `11598a73` chore: remove upstream agent report
- `731681d8` sync: record upstream merge report
- `09a64576` sync: record upstream pin 1f83a9d7
- `9960ff73` merge: sync main with upstream/main

## Conflicts Resolved

- `docs/content/docs/cli/discord.mdx`: kept the fork's readonly personal-token guidance for `agent-discord` thread writes, and added upstream's new `dm create` and `dm unread` documentation.
- `skills/agent-discord/SKILL.md`: kept the fork's safety-focused skill description that forbids personal-token write automation, took upstream's `2.34.0` version bump, and added upstream's new `dm create` and `dm unread` command notes.

No lockfile, vendor, script, or upstream pin conflicts were present during the merge.

## QA Results

All requested commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` — 3772 pass, 0 fail
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`
