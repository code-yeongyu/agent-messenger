# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `2801f2cb593f236bae3de76a5500c6f35faafa9e`
- Pre-merge fork HEAD: `92074a41e341c538ee1aa00e18c9c8be204c41dd`
- Merge commit: `85307919`
- Pin commit: `ea77c97b`

## Preserved Fork Commits

The merge was history-preserving (`git merge --no-ff upstream/main`) from the automation branch created at fork `main`.
No fork commits were rebased, dropped, squashed, or rewritten.

Recent preserved fork commits include:

- `92074a41` Merge pull request #32 from code-yeongyu/automation/sync-upstream-b03dc869bf18-28660945691
- `918653e5` chore: remove upstream agent report
- `ab700c5f` sync: record upstream merge report
- `07999350` sync: record upstream pin b03dc869
- `e436927e` merge: sync main with upstream/main

## Conflicts

No conflicts occurred. Git auto-merged the upstream Teams, Instagram, and TUI changes cleanly.

## Upstream Pin

Updated `.github/upstream.json` to:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: `2801f2cb593f236bae3de76a5500c6f35faafa9e`
- `synced_at`: `2026-07-03T13:34:15Z`

## QA Results

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, 734 files checked
- `bun run test`: passed, 3556 tests, 0 failures
- `bun run build`: passed, generated compiled CLI and copied vendored LINE runtime
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
