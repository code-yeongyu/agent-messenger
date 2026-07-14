# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `3a76f0e44cb55df2a99dc7bb3a5ad1e4e9ad05b6`
- Merge commit: `6e9c84372500059df5f3fc7d3a95807b317d244e`
- First parent before merge: `358f5b3bbdc1a1868d54eec221091aa6c48859b4`
- Synced at: `2026-07-14T03:03:04Z`

## Preserved Fork Commits

The merge was performed with `git merge --no-ff upstream/main`, preserving fork history. `git rev-list --count --right-only --cherry-pick upstream/main...HEAD` reported 196 fork-side commits after the merge, including these recent commits:

```text
2a03a01c chore: remove upstream agent report
78086f0e sync: record upstream merge report
abfc7753 chore: remove upstream agent report
bf2a8395 sync: record upstream merge report
6c6796c3 sync: record upstream pin 930ad2b
5102ec03 chore: remove upstream agent report
6f1c36ce sync: record upstream merge report
764de93d chore: remove upstream agent report
d0d4d09c sync: record upstream merge report
38781558 sync: record upstream pin a35fa44
8a372601 chore: remove upstream agent report
9271a17d sync: record upstream merge report
```

## Conflicts

Three conflicts occurred and were resolved conservatively:

- `skills/agent-discord/SKILL.md`: kept the fork's readonly personal-token description and accepted upstream version `2.31.0`.
- `src/platforms/kakaotalk/client.ts`: kept the fork's `replyToMessage` method and added upstream's `sendTyping` method after it.
- `src/platforms/kakaotalk/protocol/session.ts`: kept the fork's lossless reply-id serialization helper and added upstream's typing-action packet helpers.

No lockfiles, vendored files, or scripts required manual resolution.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "3a76f0e44cb55df2a99dc7bb3a5ad1e4e9ad05b6",
  "synced_at": "2026-07-14T03:03:04Z"
}
```

The pin update was included in the merge commit.

## QA Results

All requested checks passed:

```text
bun install --frozen-lockfile
  PASS - root lockfile consistent, no changes

cd docs && bun install --frozen-lockfile && cd ..
  PASS - docs lockfile consistent, no changes

bun run typecheck
  PASS - tsc --noEmit

bun run lint
  PASS - oxlint found 0 warnings and 0 errors

bun run format:check
  PASS - all matched files use the correct format

bun run test
  PASS - 3690 pass, 0 fail, 7090 expect() calls

bun run build
  PASS - tsc, tsc-alias, postbuild shebang update, vendored LINE copy

node dist/src/cli.js --help
  PASS - root CLI help rendered successfully

node dist/src/cli.js slack --help
  PASS - Slack CLI help rendered successfully
```
