# Upstream Merge Report

- Upstream SHA: `db084a7a89ba69c549802f32b83e898b5da3526f`
- Merged via: `git merge --no-ff upstream/main`
- Merge commit: `26a7b661`
- Synced at: `2026-08-27T18:34:05Z`

## Preserved Fork History

- Fork head before merge: `fe4bc470f42f564f6ecfb3ad2320006639f50592`
- Fork-side commits preserved in the merge base history: `264`
- Recent preserved fork commits:
  - `fe4bc470` Merge pull request #60 from code-yeongyu/automation/sync-upstream-716eba603baa-32973653722
  - `042c4add` chore: remove upstream agent report
  - `68a90de7` sync: record upstream merge report
  - `4cad3d85` Merge upstream/main
  - `91569101` Merge pull request #59 from code-yeongyu/automation/sync-upstream-2102302deea7-32808115038

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly/personal-token description and merged the upstream version bump to `2.37.1`.

## QA

- `bun install --frozen-lockfile` - passed
- `cd docs && bun install --frozen-lockfile && cd ..` - passed
- `bun run typecheck` - passed
- `bun run lint` - passed
- `bun run format:check` - passed
- `bun run test` - passed (`3899` tests)
- `bun run build` - passed
- `node dist/src/cli.js --help` - passed
- `node dist/src/cli.js slack --help` - passed

