# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `266b2dc9d3816073b6a3e6f62aca256e8bf94f33`
- Merge commit: `92970ceeaadd9bc4efa0efe58e266ba300c2289d`
- Fork parent preserved: `e009f12945f7b22cbd65b989f8e6d319644713c2`
- Synced at: `2026-08-10T07:33:07Z`

## Preserved Fork Commits

The merge was history-preserving (`git merge --no-ff upstream/main`) with the current fork head
`e009f12945f7b22cbd65b989f8e6d319644713c2` as first parent. Existing fork-only work remains in
history, including the access-control policy foundation, reply-command additions, Discord readonly
personal-token guard, upstream automation changes, and prior upstream sync merge commits.

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: resolved the frontmatter conflict by preserving the fork's
  read-only/personal-token Discord description and taking upstream's `2.35.0` version bump. This
  keeps the fork's safety contract while matching the upstream release metadata.

No vendored files were edited by hand.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "266b2dc9d3816073b6a3e6f62aca256e8bf94f33",
  "synced_at": "2026-08-10T07:33:07Z"
}
```

## QA Results

- `bun install --frozen-lockfile`: passed, no changes.
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes.
- `bun run typecheck`: passed.
- `bun run lint`: passed, 0 warnings and 0 errors.
- `bun run format:check`: passed, 747 files checked.
- `bun run test`: passed, 3795 tests, 0 failures.
- `bun run build`: passed; updated shebangs in 19 CLI files and copied vendored LINE runtime to `dist/src/vendor`.
- `node dist/src/cli.js --help`: passed.
- `node dist/src/cli.js slack --help`: passed.
