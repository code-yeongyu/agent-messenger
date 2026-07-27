# Upstream Merge Report

## Upstream

- Repo: agent-messenger/agent-messenger
- Branch: main
- SHA: 1f83a9d7b4947afc8225fe9dae4cea8e9b7dd563
- Merge commit: 9960ff73065f1943c6e2865c203c5c0b4930e5c1
- Pin commit: 09a64576
- Synced at: 2026-07-27T16:44:41Z

## Preserved Fork Commits

- Fork side parent preserved: bd0fa824643b35b033530a81eef304a41712ed40
- Notable current fork-side commits since the previous upstream pin include:
  - bd0fa824 Merge pull request #53 from code-yeongyu/automation/sync-upstream-33281a18d613-29898027659
  - ecf77d65 merge: sync main with upstream/main
- Existing fork history, including Discord readonly personal-token protections and automation workflow commits, was preserved with a history-preserving `git merge --no-ff`. No rebase, force-push, tag, PR, or release operation was performed.

## Conflicts

- `skills/agent-discord/SKILL.md`
  - Kept fork readonly `agent-discord` description and safety guidance that directs write automation to `agent-discordbot`.
  - Took upstream version bump to `2.33.0`.
  - Combined SDK example content by keeping the fork read-only message read example and adding upstream `getMyGuildMember` / `listRoles` examples.
  - Left upstream write examples out of the `agent-discord` skill to preserve the fork's readonly personal-token intent.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "1f83a9d7b4947afc8225fe9dae4cea8e9b7dd563",
  "synced_at": "2026-07-27T16:44:41Z"
}
```

## QA

All requested commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` - 3754 pass, 0 fail
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Result

Clean PR-ready branch with committed upstream merge, upstream pin, and merge report.
