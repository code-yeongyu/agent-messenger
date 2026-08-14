# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `18ec8a4fa7882eab8bee953ba48ed73cd481d4ee`
- Upstream short SHA: `18ec8a4f`
- Previous fork head preserved as first parent: `95cd4b888eacba17df4fa171ebd9ef6f3edd00a0`
- Merge commit: `348bf465`
- Upstream pin commit: `f7adf700`
- Synced at: `2026-08-14T01:33:42Z`

## Preserved Fork Commits

The merge was history-preserving (`git merge --no-ff upstream/main`) and retained the full fork history reachable from pre-merge fork head `95cd4b888eacba17df4fa171ebd9ef6f3edd00a0`.

Fork-only commit count before this merge: 252.

Recent preserved fork commits:

- `95cd4b88` Merge pull request #57 from code-yeongyu/automation/sync-upstream-266b2dc9d381-31366161449
- `014f0eef` chore: remove upstream agent report
- `9048a5ca` sync: record upstream merge report
- `92970cee` Merge remote-tracking branch 'upstream/main' into automation/sync-upstream-266b2dc9d381-31366161449
- `e009f129` Merge pull request #56 from code-yeongyu/automation/sync-upstream-0bdb7e4698af-31325661937
- `cbdbd840` chore: remove upstream agent report
- `5683166b` sync: record upstream merge report
- `74fa015a` merge: sync main with upstream/main
- `cef4c622` Merge pull request #55 from code-yeongyu/automation/sync-upstream-8d6b147e94f4-30505914829
- `e789f4f5` chore: remove upstream agent report

Full preserved range can be inspected with:

```bash
git log --oneline upstream/main..95cd4b888eacba17df4fa171ebd9ef6f3edd00a0
```

## Conflicts Resolved

- `src/platforms/teams/commands/message.ts`: kept the fork policy guard and upstream Teams `--format` support. The resolved send path calls `engine.assertAllowed(...)` before the mutation, then sends with `client.sendMessage(teamId, channelId, content, options.thread, format)`.
- `skills/agent-discord/SKILL.md`: kept the fork's read-only personal-token safety description and accepted the upstream `2.36.0` version bump.

No ambiguous conflicts remained. No vendored files were hand-edited.

## QA Results

- `bun install --frozen-lockfile`: pass
- `cd docs && bun install --frozen-lockfile && cd ..`: pass
- `bun run typecheck`: pass
- `bun run lint`: pass, 0 warnings and 0 errors
- `bun run format:check`: pass, all matched files use the correct format
- `bun run test`: pass, 3837 tests across 274 files
- `bun run build`: pass, compiled output generated and vendored LINE runtime copied
- `node dist/src/cli.js --help`: pass
- `node dist/src/cli.js slack --help`: pass

## Result

Clean PR-ready branch with upstream merge, upstream pin update, and this report.
