# Upstream Merge Report

- Upstream SHA: `716eba603baa10ddcd5240c32bbb29f4e6eef7c0`
- Merge commit: `4cad3d85b66320ab7bf4fe3fde7d320f82ae5afa`

## Preserved fork history

Kept the existing fork-side history and merged `upstream/main` into the current automation branch with `--no-ff`.

## Conflicts resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly/personal-token wording and bot-token warning, while taking the upstream version bump to `2.37.0`.
- `.github/upstream.json`: updated after merge to pin the merged upstream commit and timestamp.

## QA

Commands run:

```bash
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

Results:

- `bun install --frozen-lockfile`: passed
- `cd docs && bun install --frozen-lockfile && cd ..`: passed
- `bun run typecheck`: passed
- `bun run lint`: passed
- `bun run format:check`: passed
- `bun run test`: passed
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed after rerunning once the build completed
- `node dist/src/cli.js slack --help`: passed after rerunning once the build completed

## Notes

- The first smoke-test attempt raced the build output and looked for `dist/src/cli.js` before it existed. Rerunning after `bun run build` completed succeeded without code changes.
