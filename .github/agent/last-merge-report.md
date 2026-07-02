# Upstream Merge Report

## Result

MERGE_RESULT: CLEAN_PR_READY

## Upstream

- Repo: agent-messenger/agent-messenger
- Branch: main
- SHA: b2539b7af4c956c8bfae689ee87d3292ae8c30e5
- Short SHA: b2539b7

## Merge Commits

- Pre-merge fork head: eb25eea53b5fa83d44d40933a7cb073f17c78e5c
- Merge commit: 2b88533c1dae348857d329f28e31e571e13a6944
- Upstream pin commit: 99f95c5d

## Preserved Fork Commits

All 130 fork-side commits reachable from the pre-merge fork head and absent from `upstream/main` were preserved as the first parent of the merge commit.

The preserved range is `upstream/main..2b88533c1dae348857d329f28e31e571e13a6944^1`.

Recent preserved fork commits:

```text
eb25eea5 Merge pull request #29 from code-yeongyu/automation/sync-upstream-9f5ef8a7e0ec-28559414943
81358fa3 chore: remove upstream agent report
9d4427f0 sync: record upstream merge report
8bdfcbf5 merge: sync main with upstream/main
f2617a74 Merge pull request #28 from code-yeongyu/automation/sync-upstream-3b458605bc9f-28533520668
3b368373 chore: remove upstream agent report
cbebbfad sync: record upstream merge report
8a99f9f7 sync: record upstream pin 3b458605
78e18bb8 Merge remote-tracking branch 'upstream/main'
e1effd49 Merge pull request #27 from code-yeongyu/automation/sync-upstream-9d458063f408-28500961307
2d9cf824 chore: remove upstream agent report
4af7e84d sync: record upstream merge report
475d5f82 sync: record upstream pin 9d458063
305c8dbd merge: sync main with upstream/main
2236c507 Merge pull request #26 from code-yeongyu/automation/sync-upstream-09667e3f8e28-28427087143
5b7b621b merge: sync main with upstream/main
```

## Conflicts

No merge conflicts occurred.

Git auto-merged these upstream-touched files cleanly:

```text
docs/content/docs/cli/instagram.mdx
skills/agent-instagram/references/authentication.md
src/platforms/instagram/client.test.ts
src/platforms/instagram/client.ts
src/platforms/instagram/commands/auth.test.ts
src/platforms/instagram/commands/auth.ts
src/platforms/instagram/credential-manager.test.ts
src/platforms/instagram/credential-manager.ts
src/platforms/instagram/types.ts
src/tui/adapters/instagram-adapter.ts
```

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "b2539b7af4c956c8bfae689ee87d3292ae8c30e5",
  "synced_at": "2026-07-02T05:52:46Z"
}
```

## QA

All requested commands passed.

```text
bun install --frozen-lockfile
cd docs && bun install --frozen-lockfile && cd ..
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
node dist/src/cli.js --help
node dist/src/cli.js slack --help
```

Notable results:

```text
bun install --frozen-lockfile: no changes
docs bun install --frozen-lockfile: no changes
bun run typecheck: passed
bun run lint: Found 0 warnings and 0 errors
bun run format:check: All matched files use the correct format
bun run test: 3519 pass, 0 fail
bun run build: updated shebangs in 19 CLI files and copied vendored LINE runtime into dist/src/vendor
node dist/src/cli.js --help: passed
node dist/src/cli.js slack --help: passed
```
