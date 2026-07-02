# Upstream Merge Report

- Upstream repository: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `9f5ef8a7e0ec5cb2b91c8a00a1fc1f5d555f22bc`
- Merge commit: `8bdfcbf540351c47cc00da90f46e86bbf66b103a`
- Previous fork head: `f2617a7413e441f2cdf06ebadbe586ec4e15b98f`
- Synced at: `2026-07-02T01:41:16Z`

## Preserved Fork Commits

The merge was performed with `git merge --no-ff upstream/main`, preserving the fork-side first-parent
history. The immediate fork parent is:

- `f2617a74` Merge pull request #28 from code-yeongyu/automation/sync-upstream-3b458605bc9f-28533520668

Recent fork-side lineage preserved by the merge:

- `f2617a74` Merge pull request #28 from code-yeongyu/automation/sync-upstream-3b458605bc9f-28533520668
- `e1effd49` Merge pull request #27 from code-yeongyu/automation/sync-upstream-9d458063f408-28500961307
- `2236c507` Merge pull request #26 from code-yeongyu/automation/sync-upstream-09667e3f8e28-28427087143
- `eb79bb9b` Merge pull request #25 from code-yeongyu/automation/sync-upstream-76500f055d1b-28369249537
- `d395cd7d` Merge pull request #24 from code-yeongyu/automation/sync-upstream-41b7e1e38bf6-28048562023

Recent non-merge fork commits preserved on the fork side include:

- `3b368373` chore: remove upstream agent report
- `cbebbfad` sync: record upstream merge report
- `8a99f9f7` sync: record upstream pin 3b458605

## Conflicts

No conflicts were encountered. Git auto-merged:

- `src/platforms/instagram/client.ts`
- `src/platforms/instagram/client.test.ts`

No manual edits were made to `src/vendor/**`, and no scripts were imported into runtime code.

## Upstream Pin

Updated `.github/upstream.json` to:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: `9f5ef8a7e0ec5cb2b91c8a00a1fc1f5d555f22bc`
- `synced_at`: `2026-07-02T01:41:16Z`

The pin update was amended into the merge commit.

## QA Results

All requested checks passed:

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed, all matched files formatted
- `bun run test`: passed, 3489 tests, 0 failures
- `bun run build`: passed, 19 CLI shebangs updated and vendored LINE runtime copied into `dist/src/vendor`
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed

## Result

`MERGE_RESULT: CLEAN_PR_READY`
