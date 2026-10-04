# Upstream Merge Report

## Result

MERGE_RESULT: CLEAN_PR_READY

## Upstream

- repo: `agent-messenger/agent-messenger`
- branch: `main`
- sha: `ad06c95382182dfccb218079a2938b295616287a`
- short sha: `ad06c953`
- synced_at: `2026-10-04T09:04:10Z`

## Commits Created

- `e60a2a03` - `Merge upstream/main`
- `ef660ac8` - `sync: record upstream pin ad06c953`

## Preserved Fork Commits

The merge preserved the existing fork history and did not rebase or rewrite commits. The fork-only range contains 165 non-merge commits before this report, including:

- upstream automation and merge-report handling
- Discord personal-token readonly guard work
- access-control policy engine and platform guards
- cross-platform `message reply` command support
- platform-specific reply fixes for Instagram, WhatsApp, Telegram, KakaoTalk, Slack, Discord, Webex, LINE, and Channel Talk
- prior merge-stabilization fixes and docs/skills updates

Use `git log --oneline --no-merges upstream/main..HEAD` for the full preserved commit list.

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork safety wording that documents personal Discord tokens as read-only and directs write automation to `agent-discordbot`; adopted upstream version `2.39.0`.
- `src/platforms/discordbot/commands/message.test.ts`: kept upstream `createMessage` test coverage for the newer send/file/thread behavior and preserved the fork's `replyToMessage` mock coverage for the explicit `message reply` command.

No vendored files were edited by hand.

## QA

All required commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` - 4045 pass, 0 fail
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Notes

- The merge used `git merge --no-ff upstream/main`.
- No rebase, force-push, tag, release, pull request operation, or history rewrite was performed.
- `.github/upstream.json` now records the merged upstream SHA.
