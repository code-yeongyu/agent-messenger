# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `14041e1804e1e625880874bec74fb30fb2175033`
- Merge commit: `222dd84`
- Upstream pin commit: `5867b5b`

## Preserved Fork Commits

The merge was performed with `git merge --no-ff upstream/main`, preserving the fork history already reachable from `origin/main` / `main` at `85b404cf99c671822ff535f32c43d5a9833ebcac`.

Notable preserved fork work includes:

- Access-control policy foundation and Slack/Discord/Teams enforcement (`8e2601e`, `596b690`, `f02b9ee`, `c9b15ae`, `9c68dbb`, `cc6a68d`)
- Explicit reply subcommands across messaging platforms (`1530caa`, `f3da6ac`, `a52b1ae`, `4b88711`, `6fb56f4`, `f879cf9`, `a78020d`, `8975e59`, `742089c`, `e845e17`)
- Discord personal-token readonly protections and Discord bot token label preservation (`ba05d06`, `a20c295`, `28a352e`, `e2754fb`, `de2ff56`, `f57c357`)
- Fork upstream-sync automation fixes and previous merge-report/pin commits already present on fork main

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: preserved the fork's readonly personal-token safety wording and bot-token write guidance, while taking upstream's `2.24.0` version bump.

No vendored files were edited by hand. No ambiguous conflicts remained.

## QA Results

- `bun install --frozen-lockfile`: passed
- `cd docs && bun install --frozen-lockfile && cd ..`: passed
- `bun run typecheck`: passed
- `bun run lint`: passed with 0 warnings and 0 errors
- `bun run format:check`: passed
- `bun run test`: passed, 3389 tests, 0 failures
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed

## Result

Branch is PR-ready with the upstream merge, upstream pin update, and this merge report.
