# Upstream Merge Report

## Result

- Result: clean PR-ready merge
- Branch: `automation/sync-upstream-4f7d5c1b46c3`
- Merge commit: `e56b590229bb76a25068db656d5d2fb05f681717`
- Upstream: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `4f7d5c1b46c31d5f4acdc4764736f6e248fdcb7d`
- Upstream pin: `.github/upstream.json` updated to `4f7d5c1b46c31d5f4acdc4764736f6e248fdcb7d` at `2026-06-21T09:16:07Z`

## Preserved Fork Commits

The merge preserved the fork-side history visible from `upstream/main..HEAD`, including:

- `8e2601e` feat: add policy module foundation for access control
- `596b690` feat: enforce policy in Slack commands
- `f02b9ee` feat: expose engine.hasRule and tighten Slack DM short-circuit
- `c9b15ae` feat: enforce policy in Discord commands
- `9c68dbb` feat: enforce policy in Teams commands
- `cc6a68d` feat: add 'agent-messenger policy show/validate/edit' subcommands
- `fffba54` docs: document access control feature
- `d824093` docs(skills): document access control in Slack/Discord/Teams skills
- `88036a2` feat: honor Slack channelType rules on message search
- `0203494` docs: add public-only policy recipe and note search now honors channelType
- `508c36e` style: apply oxfmt to access-control source files
- `0fafb87` fix: stop bun test from hanging in webex command tests
- `1530caa` feat(telegram): add 'message reply' subcommand using TDLib reply_to
- `f3da6ac` feat(discord): add 'message reply' subcommand using message_reference
- `a52b1ae` feat(discordbot): add 'message reply' subcommand using message_reference
- `4b88711` feat(webex): add 'message reply' subcommand using parentId
- `6fb56f4` feat(whatsappbot): add 'message reply' subcommand using Cloud API context
- `f879cf9` feat(whatsapp): add 'message reply' subcommand using Baileys quoted
- `a78020d` feat(channeltalkbot): add 'message reply' subcommand for group threads
- `8975e59` feat(line): add 'message reply' subcommand using relatedMessageId
- `742089c` feat(slack,slackbot): add 'message reply' as explicit alias for thread sends
- `e845e17` feat(kakaotalk): add 'message reply' subcommand using LOCO type=26 reply attachment
- `e4deb38` style: apply oxfmt to reply feature files
- `fdcfa2e` fix(kakaotalk): serialize parent ids as plain numbers in LOCO reply extra
- `6bbe09d` fix(telegram): drop redundant chat_id in inputMessageReplyToMessage
- `448a1cf` fix(whatsapp): persist message cache so reply works across CLI runs
- `0a00849` feat(instagram): add 'message reply' subcommand using replied_to_item_id
- `c18150d` fix(whatsapp): use Baileys BufferJSON to round-trip media WAMessages
- `1c3dbc4` fix(instagram): use parent message client_context for replied_to_client_context
- `ba05d06` feat(discord): add readonly account guard
- `a20c295` feat(discord): block readonly message writes
- `28a352e` feat(discord): block readonly utility writes
- `e2754fb` feat(discordbot): preserve token labels
- `de2ff56` docs(discord): prefer bot automation tokens
- `f57c357` fix(discord): default personal tokens to readonly
- `45bac4a` chore(skills): record ulw merge no-op
- `ddf78ef` merge: sync main with upstream/main
- `ee41d73` docs: add hierarchical AGENTS.md knowledge base
- `a0d3c55` merge: sync main with upstream/main
- `790687b` test: stabilize command tests after upstream merge
- `6ee662a` merge: sync main with upstream/main
- `70556d8` Merge pull request #2 from code-yeongyu/automation/sync-upstream-20260617
- `5592b07` merge: sync main with upstream/main
- `9b9e245` Merge pull request #3 from code-yeongyu/automation/sync-upstream-20260619
- `06ef391` ci: add upstream merge automation
- `641d001` Merge pull request #4 from code-yeongyu/code-yeongyu/upstream-agent-merge-automation
- `5c52cd4` ci(upstream): ignore QA evidence artifacts
- `959b66a` ci(upstream): keep merge report cleanup clean
- `9fca4c4` ci(upstream): keep merge report cleanup clean

## Conflicts

- `skills/agent-discord/SKILL.md`: resolved the frontmatter conflict by preserving the fork's readonly personal-token safety description and taking upstream's `2.23.0` skill version.

No lockfile, vendored source, policy, or runtime code conflicts required manual resolution.

## QA

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed with one existing warning in `src/platforms/discord/readonly-guard.ts` for `prefer-as-const`
- `bun run format:check`: passed
- `bun run test`: passed, 3308 tests, 0 failures
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
