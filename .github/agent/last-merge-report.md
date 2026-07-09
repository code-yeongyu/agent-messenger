# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `980cc611fb139c15adf3fe84ff0edea7e2a08010`
- Merge commit: `ad31bba290e72ff0a2d48c05388d760094375474`
- Previous fork head: `cae816435a1b70727ada9819d3c9e5f503c21a19`
- Synced at: `2026-07-09T03:03:58Z`

## Preserved Fork Commits

The merge used `git merge --no-ff upstream/main` with the fork branch as first parent, preserving the fork history. The branch contains 110 non-merge commits not present on `upstream/main`, including the existing fork automation, policy/access-control work, Discord readonly guard work, message reply support, and prior merge-report/pin commits.

Recent preserved fork-side commits include:

- `764de93d chore: remove upstream agent report`
- `d0d4d09c sync: record upstream merge report`
- `38781558 sync: record upstream pin a35fa44`
- `8a372601 chore: remove upstream agent report`
- `9271a17d sync: record upstream merge report`

## Conflicts

No merge conflicts occurred.

Files changed by the merge/pin update:

- `.github/upstream.json` - updated to upstream SHA `980cc611fb139c15adf3fe84ff0edea7e2a08010`
- `bun.lock` - accepted upstream dependency lockfile changes
- `package.json` - accepted upstream TypeScript version bump
- `tsconfig.json` - accepted upstream TypeScript configuration changes

## QA

All required checks passed:

- `bun install --frozen-lockfile` - passed
- `cd docs && bun install --frozen-lockfile && cd ..` - passed
- `bun run typecheck` - passed
- `bun run lint` - passed
- `bun run format:check` - passed
- `bun run test` - passed, 3659 pass / 0 fail
- `bun run build` - passed
- `node dist/src/cli.js --help` - passed
- `node dist/src/cli.js slack --help` - passed
