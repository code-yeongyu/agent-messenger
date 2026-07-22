# Upstream Merge Report

- Result: clean PR-ready merge
- Upstream: `agent-messenger/agent-messenger` `main`
- Upstream SHA: `a15dcd440cacf3bd46e07ca0ffdb36e10e80efc5`
- Previous upstream pin: `82344759d2f59863cacc8c3312fb381659cf108a`
- Merge commit: `b1bb1bf2adc5aeb0815fd9501143f30d68efcfbd`
- Merge parents: fork `4c9eb15012bc7b9003f886d74c1b91a979360210`, upstream `a15dcd440cacf3bd46e07ca0ffdb36e10e80efc5`
- Upstream pin updated in `.github/upstream.json` with `synced_at` `2026-07-22T05:03:43Z`

## Preserved Fork Commits

The merge preserved the fork first-parent history with no rebase, force-push, or history rewrite. There are 228 fork-only commits reachable from the pre-merge fork parent and absent from `upstream/main`.

Most recent preserved fork-side commits:

- `4c9eb150` Merge pull request #51 from code-yeongyu/automation/sync-upstream-82344759d2f5-29755829459
- `3754ef72` chore: remove upstream agent report
- `e57cb537` sync: record upstream merge report
- `6b323eba` sync: record upstream pin 82344759
- `069ea7e2` merge: sync main with upstream/main
- `9c031daf` Merge pull request #50 from code-yeongyu/automation/sync-upstream-1da9624b7999-29736951018
- `e956181e` Merge remote-tracking branch 'upstream/main' into automation/sync-upstream-1da9624b7999-29736951018
- `744da7f3` Merge pull request #49 from code-yeongyu/automation/sync-upstream-764a292e5cc8-29718578628
- `c3af3c88` chore: remove upstream agent report
- `59068054` sync: record upstream merge report

## Conflicts

- `skills/agent-discord/SKILL.md`: kept the fork's personal-token readonly/safety-focused description and accepted upstream's `2.32.2` version bump.

No `bun.lock`, `docs/bun.lock`, `src/vendor/**`, or `scripts/**` conflicts were present.

## QA

All requested commands completed successfully:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3740 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`
