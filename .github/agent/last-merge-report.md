# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `4f4a1b46964fef80b9e184b55cfa17c1c1e20462`
- Fork head before merge: `415a2a722ae6509a9eca28a75daa9d19330968df`
- Merge commit: `19fe4897`
- Pin commit: `dad07708`

## Preserved Fork Commits

The merge was performed with `git merge --no-ff upstream/main`, preserving the fork history without rebasing or rewriting.

Fork-specific history reachable from the pre-merge fork head remains preserved, including the current fork head:

- `415a2a72` Merge pull request #47 from code-yeongyu/automation/sync-upstream-4c25bfdd4341-29332446487
- `0baae981` chore: remove upstream agent report
- `25ba44c2` sync: record upstream merge report
- `44c8a0a5` merge: sync main with upstream/main

The preserved fork range before this merge was `4c25bfdd43418b7c45f4a42a524e0a3c1d8d42ed..415a2a722ae6509a9eca28a75daa9d19330968df`.

## Conflicts

No merge conflicts occurred. No conflicted files required manual resolution.

## Upstream Changes Integrated

The upstream merge brought in Channel Talk / Channel Works token extraction updates:

- `19a1b978` fix(channeltalk): extract cookies from the rebranded Channel Works app
- `fe88a287` fix(channeltalk): resolve the credential pair from a single cookie domain
- `bb81734c` fix(channeltalk): match cookie hosts on an exact domain boundary
- `4f4a1b46` Merge pull request #311 from endlessdev/fix/channeltalk-channel-works-rebrand

## QA Results

All required QA commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3723 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

Final result: clean PR-ready branch.
