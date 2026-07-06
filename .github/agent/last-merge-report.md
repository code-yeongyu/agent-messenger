# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `b8768e98ffdbc3962b2cb823d5797ccc637de4b3`
- Merge commit: `2dee3f4b`
- Synced at: `2026-07-06T09:21:25Z`

## Preserved Fork Commits

Preserved 150 fork-side commits from the first parent history. Latest preserved commits:

```text
7bf1aca4 Merge pull request #33 from code-yeongyu/automation/sync-upstream-2801f2cb593f-28663885179
47af5781 chore: remove upstream agent report
8cc27b58 sync: record upstream merge report
ea77c97b sync: record upstream pin 2801f2c
85307919 merge: sync main with upstream/main
92074a41 Merge pull request #32 from code-yeongyu/automation/sync-upstream-b03dc869bf18-28660945691
918653e5 chore: remove upstream agent report
ab700c5f sync: record upstream merge report
07999350 sync: record upstream pin b03dc869
e436927e merge: sync main with upstream/main
d02f413e Merge pull request #31 from code-yeongyu/automation/sync-upstream-0e58483f67ed-28577400805
38f71e72 chore: remove upstream agent report
dbfd62c7 sync: record upstream merge report
02d77843 sync: record upstream pin 0e58483
3e418432 merge: sync main with upstream/main
5c6c38d2 Merge pull request #30 from code-yeongyu/automation/sync-upstream-b2539b7af4c9-28568577526
568f6c09 chore: remove upstream agent report
6f9e92c2 sync: record upstream merge report
99f95c5d sync: record upstream pin b2539b7
2b88533c merge: sync main with upstream/main
eb25eea5 Merge pull request #29 from code-yeongyu/automation/sync-upstream-9f5ef8a7e0ec-28559414943
81358fa3 chore: remove upstream agent report
9d4427f0 sync: record upstream merge report
8bdfcbf5 merge: sync main with upstream/main
f2617a74 Merge pull request #28 from code-yeongyu/automation/sync-upstream-3b458605bc9f-28533520668
```

## Conflicts Resolved

- `src/platforms/teams/commands/message.ts`: kept the fork's Teams write policy assertion before mutation, and applied upstream's threaded send support by passing `options.thread` to `client.sendMessage(...)`.
- `src/platforms/teams/commands/message.ts`: added the same Teams read policy assertion to upstream's new channel-scoped `message replies` action.

No vendored files were edited by hand.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "b8768e98ffdbc3962b2cb823d5797ccc637de4b3",
  "synced_at": "2026-07-06T09:21:25Z"
}
```

## QA Results

All required commands passed:

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

Test summary: 3600 pass, 0 fail.
