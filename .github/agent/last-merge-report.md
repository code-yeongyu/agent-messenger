# Upstream Merge Report

- Result: clean PR-ready merge
- Upstream: `agent-messenger/agent-messenger`
- Branch: `main`
- Upstream SHA: `1c8a59b0e8642370742b8d0ee1e0fc6d22a337e3`
- Merge commit: `90021e19`
- Upstream pin: `.github/upstream.json` updated to `1c8a59b0e8642370742b8d0ee1e0fc6d22a337e3` at `2026-07-06T15:05:04Z`

## Preserved Fork Commits

The merge preserved the existing fork history without rebasing or rewriting. `git log --oneline --no-merges upstream/main..HEAD` reports 96 fork-only non-merge commits still reachable after the merge.

Representative preserved fork work includes:

- `8e2601e6` `feat: add policy module foundation for access control`
- `596b690e` `feat: enforce policy in Slack commands`
- `c9b15ae6` `feat: enforce policy in Discord commands`
- `9c68dbbd` `feat: enforce policy in Teams commands`
- `cc6a68d9` `feat: add 'agent-messenger policy show/validate/edit' subcommands`
- `1530caa2` `feat(telegram): add 'message reply' subcommand using TDLib reply_to`
- `f3da6ac8` `feat(discord): add 'message reply' subcommand using message_reference`
- `a52b1ae4` `feat(discordbot): add 'message reply' subcommand using message_reference`
- `4b887111` `feat(webex): add 'message reply' subcommand using parentId`
- `6fb56f4c` `feat(whatsappbot): add 'message reply' subcommand using Cloud API context`
- `f879cf94` `feat(whatsapp): add 'message reply' subcommand using Baileys quoted`
- `f57c3575` `fix(discord): default personal tokens to readonly`
- `de2ff564` `docs(discord): prefer bot automation tokens`
- `2a8808d5` `fix: satisfy discord readonly guard lint`
- Existing upstream-sync automation commits and prior merge commits from the fork main branch.

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: resolved a release metadata/content conflict by preserving the fork's readonly personal-token safety wording and bot-token send guidance, while taking the upstream `2.29.0` skill version.

No `bun.lock`, `docs/bun.lock`, `.github/upstream.json`, `src/vendor/**`, or `scripts/**` conflicts occurred.

## QA Results

All required commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3633 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Notes

- Merge used `git merge --no-ff`.
- No rebase, force-push, tags, release workflow, PR edits, or hook/signing bypasses were used.
- No files under `src/vendor/**` were edited by hand.
