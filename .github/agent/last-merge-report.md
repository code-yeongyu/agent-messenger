# Upstream Merge Report

- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 8ce6748b298b5f94719347ca7e84ce7ab6f34003
- Fork branch before merge: f87ebb8231dca32bd56c7a739df09371675075d6
- Merge commit: 4e4dc4cd
- Pin commit: 27884b2a

## Preserved Fork Commits

All fork-side history reachable from the pre-merge head was preserved by a history-preserving
`git merge --no-ff upstream/main`.

Recent preserved fork commits:

- f87ebb82 Merge pull request #69 from code-yeongyu/automation/sync-upstream-1892e38cc22e-37797763047
- bd357d61 chore: remove upstream agent report
- 3233dcdf sync: record upstream merge report 1892e38c
- 1fc308e3 Merge upstream/main

## Conflicts

No conflicts required manual resolution.

Git auto-merged `src/platforms/kakaotalk/client.ts`; the upstream changes added KakaoTalk read-status
SDK support, tests, and docs.

## Upstream Pin

Updated `.github/upstream.json` to:

- repo: agent-messenger/agent-messenger
- branch: main
- sha: 8ce6748b298b5f94719347ca7e84ce7ab6f34003
- synced_at: 2026-10-10T08:07:37Z

## QA

All required commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (4073 pass, 0 fail)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`
