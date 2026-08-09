# Upstream Merge Report

- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 0bdb7e4698af84d4d76be6d1dfb8df0b50430098
- Fork pre-merge head: cef4c6229682e47f56c1bb6be5c441c48a01af18
- Merge commit: 74fa015a8dd9b642a12b6fc0de93f3970c5cfa59
- Sync timestamp: 2026-08-09T17:10:57Z

## Preserved Fork Commits

Preserved all fork-only commits reachable from the pre-merge fork head.

- Range: `upstream/main..cef4c6229682e47f56c1bb6be5c441c48a01af18`
- Count: 244 commits
- Pre-merge fork head: `cef4c622 Merge pull request #55 from code-yeongyu/automation/sync-upstream-8d6b147e94f4-30505914829`

Recent preserved fork commits:

- `cef4c622` Merge pull request #55 from code-yeongyu/automation/sync-upstream-8d6b147e94f4-30505914829
- `e789f4f5` chore: remove upstream agent report
- `25e43729` sync: record upstream merge report
- `8e54c2b1` sync: record upstream pin 8d6b147e
- `d4e2ddcd` merge: sync main with upstream/main
- `163fedf4` Merge pull request #54 from code-yeongyu/automation/sync-upstream-1f83a9d7b494-30285905894
- `11598a73` chore: remove upstream agent report
- `731681d8` sync: record upstream merge report
- `09a64576` sync: record upstream pin 1f83a9d7
- `9960ff73` merge: sync main with upstream/main

## Conflicts

No conflicts required manual resolution.

Git auto-merged:

- `src/platforms/kakaotalk/client.ts`
- `src/platforms/kakaotalk/protocol/session.ts`

The upstream pin in `.github/upstream.json` was updated to `0bdb7e4698af84d4d76be6d1dfb8df0b50430098` and amended into the merge commit.

## QA

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, all matched files use the correct format
- `bun run test`: passed, 3782 tests across 272 files
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed

## Result

Clean merge. Branch is PR-ready.
