# Upstream Merge Report

- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: afe3ae06fda54d25104b934e50a07a2445ed59ed
- Upstream short SHA: afe3ae06
- Merge commit: 81f5ade7996b38437f456c6ebfb6a1b7f104c9b0
- Pin commit: 9d370b5b7d9c3434ec8a7c0e137c586f87806b04
- Synced at: 2026-10-13T16:07:11Z

## Preserved Fork Commits

All existing fork-only history was preserved via `git merge --no-ff upstream/main`; no rebase,
force-push, or history rewrite was used.

- Preserved fork-only non-merge commits: 175
- Preserved fork first-parent commits, including historical merge commits: 110
- Notable preserved fork work includes:
  - Access-control policy foundation and Slack/Discord/Teams enforcement.
  - Explicit `message reply` commands across supported platforms.
  - Discord personal-token readonly guards and Discord bot token-label preservation.
  - WhatsApp, Instagram, Telegram, KakaoTalk, Webex, and DiscordBot reply/fix follow-ups.
  - Fork upstream-sync automation and its stability fixes.
  - The existing fork commit `f2a3098e fix(discordbot): support before cursor for message listing`.

## Conflicts

No conflicts required manual resolution. Git merged upstream changes cleanly.

Upstream changes integrated in this merge focused on Teams message body parsing, HTML/file metadata
in message output, Teams chat get support, Teams URL content download support, and related docs/skill
updates.

## Upstream Pin

`.github/upstream.json` was updated after the merge:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: `afe3ae06fda54d25104b934e50a07a2445ed59ed`
- `synced_at`: `2026-10-13T16:07:11Z`

## QA Results

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed with one warning in `src/platforms/teams/message-content.ts` for `eslint(no-control-regex)`
- `bun run format:check`: passed
- `bun run test`: passed, 4106 tests, 0 failures
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
