# Upstream Merge Report

- Result: CLEAN_PR_READY
- Upstream: `agent-messenger/agent-messenger` `main`
- Upstream SHA: `a35fa44af17e94a0e428476ffcb98799bf0d327b`
- Upstream commit: `a35fa44a 2.30.0`
- Fork pre-merge HEAD: `7b02f32a2e18370a62fce206ac2cc88f4d02a87a`
- Merge commit: `f21bebb2fb8cd608e4a5bd0ee5f4d0f9770304f9`
- Merge parents: `7b02f32a2e18370a62fce206ac2cc88f4d02a87a` and `a35fa44af17e94a0e428476ffcb98799bf0d327b`
- Upstream pin commit: `38781558492a80b5df3080b39277a090dc4e9665`
- Upstream pin timestamp: `2026-07-08T10:42:43Z`

## Preserved Fork Commits

The merge preserved the fork history from pre-merge HEAD `7b02f32a2e18370a62fce206ac2cc88f4d02a87a`; no rebase, force-push, or history rewrite was performed. There were 107 non-merge fork commits reachable from the pre-merge HEAD and not from `upstream/main`.

Most recent preserved fork commits:

```text
8a372601 chore: remove upstream agent report
9271a17d sync: record upstream merge report
7402cf5f chore: remove upstream agent report
f0278af1 sync: record upstream merge report
386d983f style(discord): format merged message tests
279f6e6e sync: record upstream pin f727283
96179ecf chore: remove upstream agent report
6276b7c4 sync: record upstream merge report
b09a03b6 sync: record upstream pin ba50c1d
c0504159 chore: remove upstream agent report
9d5efa4c sync: record upstream merge report
d95d7c84 chore: remove upstream agent report
06eb48d5 sync: record upstream merge report
06114729 chore: remove upstream agent report
681af33e sync: record upstream merge report
47af5781 chore: remove upstream agent report
8cc27b58 sync: record upstream merge report
ea77c97b sync: record upstream pin 2801f2c
918653e5 chore: remove upstream agent report
ab700c5f sync: record upstream merge report
```

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: resolved the frontmatter conflict by preserving the fork's readonly personal-token description and taking upstream's `version: 2.30.0` release bump.

No lockfile, `.github/upstream.json`, `src/vendor/**`, or `scripts/**` conflicts occurred during the merge.

## QA Results

```text
bun install --frozen-lockfile                         PASS
cd docs && bun install --frozen-lockfile && cd ..     PASS
bun run typecheck                                     PASS
bun run lint                                          PASS
bun run format:check                                  PASS
bun run test                                          PASS (3659 pass, 0 fail)
bun run build                                         PASS
node dist/src/cli.js --help                           PASS
node dist/src/cli.js slack --help                     PASS
```
