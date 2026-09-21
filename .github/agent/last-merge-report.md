# Upstream Merge Report

- Upstream: `agent-messenger/agent-messenger`
- Branch: `main`
- Upstream SHA: `505738a15d47a9e1d76f16302288bc347d427d84`
- Merge commit: `2c9b157d`
- Pin commit: `85139baf`
- Result: clean PR-ready merge

## Preserved Fork Commits

All existing fork-only commits reachable from the automation branch were preserved by a history-preserving `git merge --no-ff upstream/main`. Recent fork-only commits at merge time included:

- `52885ada` Merge pull request #63 from code-yeongyu/automation/sync-upstream-2bd0f4343dbc-35563241776
- `94e8fd9b` chore: remove upstream agent report
- `273aace9` sync: record upstream merge report 2bd0f434
- `e9316b6e` sync: record upstream pin 2bd0f434
- `f2a3098e` fix(discordbot): support before cursor for message listing

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly personal-token safety guidance, updated the skill version to upstream `2.38.0`, and included upstream's custom expression coverage without reintroducing personal-token send guidance.
- `skills/agent-discord/references/common-patterns.md`: kept the fork's readonly workflow guidance and included upstream's custom emoji/sticker examples under an operator-approved writable-credentials section.

## Focused Merge Fix

Upstream added `agent-discord emoji` and `agent-discord sticker` create/delete commands. The fork's Discord personal-token credentials default to readonly, so the merged commands were updated to call the existing readonly guard before expression mutations. Regression coverage was added for explicit readonly credentials and omitted readonly flags.

## QA Results

- `bun install --frozen-lockfile`: passed
- `cd docs && bun install --frozen-lockfile && cd ..`: passed
- `bun run typecheck`: passed
- `bun run lint`: passed
- `bun run format:check`: passed
- `bun test src/platforms/discord/commands/emoji.test.ts src/platforms/discord/commands/sticker.test.ts`: passed, 15 tests
- `bun run test`: passed, 3956 tests
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
