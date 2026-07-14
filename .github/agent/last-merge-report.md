# Upstream Merge Report

- Result: clean PR ready
- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 4c25bfdd43418b7c45f4a42a524e0a3c1d8d42ed
- Merge commit: 44c8a0a5e75a35d2774600a70107168a020f4870
- Synced at: 2026-07-14T12:29:13Z

## Upstream Work Integrated

- 4c25bfdd 2.32.0
- a8e52b4b Merge pull request #309 from agent-messenger/docs/discord-unread-mentions-sdk
- defd6670 Document Discord unread mentions in the SDK

## Preserved Fork Commits

The merge preserved the fork branch first parent at a1dd0cc2563a1dfe3a3183bcd98a3813bdebaa75 and merged upstream with `git merge --no-ff`; no rebase, force push, tag, release, or history rewrite was performed.

Recent preserved fork first-parent commits:

- a1dd0cc2 Merge pull request #46 from code-yeongyu/automation/sync-upstream-ef5c77d90dcc-29325671158
- 19a5e74d Merge pull request #45 from code-yeongyu/automation/sync-upstream-001a824ac8f2-29322147594
- 0cba8d4e Merge pull request #44 from code-yeongyu/automation/sync-upstream-3a76f0e44cb5-29302446464
- 358f5b3b Merge pull request #43 from code-yeongyu/automation/sync-upstream-f31d1005115e-29251164469
- 640ffba3 Merge pull request #42 from code-yeongyu/automation/sync-upstream-930ad2b6e747-29104918518

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: resolved one content conflict by preserving the fork's read-only personal-token safety guidance for `agent-discord`, accepting upstream's `2.32.0` skill version bump, and adding upstream's unread-mentions read-only SDK example. Upstream's write-oriented thread/send example was not reintroduced into the personal-token skill.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "4c25bfdd43418b7c45f4a42a524e0a3c1d8d42ed",
  "synced_at": "2026-07-14T12:29:13Z"
}
```

## QA Results

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, all matched files correctly formatted
- `bun run test`: passed, 3715 tests, 0 failures
- `bun run build`: passed, updated 19 CLI shebangs and copied vendored LINE runtime into `dist/src/vendor`
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
