# Upstream Merge Report

Result: CLEAN_PR_READY

## Upstream

- Repository: agent-messenger/agent-messenger
- Branch: main
- SHA: 930ad2b6e747ee9649121ab001617c48e137a887
- Short SHA: 930ad2b6
- Synced at: 2026-07-10T15:47:36Z

## Commits

- Previous fork head: a7f3705ea3effedbf45cea6fa580c320a1cff0e1
- Merge commit: f95596dfaff9026afe875e53ef10cc0fba901b29
- Merge first parent: a7f3705ea3effedbf45cea6fa580c320a1cff0e1
- Merge second parent: 930ad2b6e747ee9649121ab001617c48e137a887
- Upstream pin commit: 6c6796c3 sync: record upstream pin 930ad2b

## Preserved Fork Commits

The sync used `git merge --no-ff upstream/main`, preserving the fork lineage as the first parent of
the merge commit. The pre-merge fork head (`a7f3705e`) remains intact as the first parent.

`git rev-list upstream/main..f95596df^1` reported 187 fork-side commits preserved before this merge,
including 112 non-merge commits. Recent preserved fork commits include:

- a7f3705e Merge pull request #41 from code-yeongyu/automation/sync-upstream-980cc611fb13-28991015622
- 5102ec03 chore: remove upstream agent report
- 6f1c36ce sync: record upstream merge report
- ad31bba2 merge: sync main with upstream/main
- cae81643 Merge pull request #40 from code-yeongyu/automation/sync-upstream-a35fa44af17e-28936446355
- 764de93d chore: remove upstream agent report
- d0d4d09c sync: record upstream merge report
- 38781558 sync: record upstream pin a35fa44
- f21bebb2 merge: sync main with upstream/main
- 7b02f32a Merge pull request #39 from code-yeongyu/automation/sync-upstream-9d268f9a0cfc-28933383411

## Conflicts

No merge conflicts required manual resolution. Git auto-merged the upstream KakaoTalk leave-chat
changes into the fork tree.

Files changed by the merge:

- docs/content/docs/cli/kakaotalk.mdx
- docs/content/docs/sdk/kakaotalk.mdx
- skills/agent-kakaotalk/SKILL.md
- src/platforms/kakaotalk/client.test.ts
- src/platforms/kakaotalk/client.ts
- src/platforms/kakaotalk/commands/chat.test.ts
- src/platforms/kakaotalk/commands/chat.ts
- src/platforms/kakaotalk/index.test.ts
- src/platforms/kakaotalk/index.ts
- src/platforms/kakaotalk/protocol/session.ts
- src/platforms/kakaotalk/types.ts

## QA

All requested checks passed:

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, all matched files use the correct format
- `bun run test`: passed, 3668 pass / 0 fail
- `bun run build`: passed, postbuild updated 19 CLI shebangs and copied vendored LINE runtime
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
