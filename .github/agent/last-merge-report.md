# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `06dbb0cbae6363744de10975a8587ed45aad65bd`
- Merge commit: `26a29e5dc9c92f33ed4970458f999ec7513198d1`
- Upstream pin commit: `10f76bb`
- Result: clean PR-ready branch after conflict resolution and QA

## Preserved Fork Commits

The merge preserved the fork-only history already present on the bot branch, including the prior upstream sync commits and fork feature/fix work. The carried fork commits include:

- `4379697` Merge pull request #13 from code-yeongyu/automation/sync-upstream-7e4ba9eba0bd-27910566372
- `a7b087b` chore: remove upstream agent report
- `3851782` sync: record upstream merge report
- `3e26c38` sync: record upstream pin 7e4ba9e
- `4459b2b` merge: sync main with upstream/main
- `b3fe2a3` Merge pull request #12 from code-yeongyu/automation/sync-upstream-6a8f96d175dd-27907845107
- `ebabe6e` fix(webex): preserve reply output refs after merge
- `39e071b` sync: record upstream pin 6a8f96d
- `023067c` merge: sync main with upstream/main
- `b9dbb72` Merge pull request #11 from code-yeongyu/automation/sync-upstream-30a7219d05fc-27903350316
- `2a8808d` fix: satisfy discord readonly guard lint
- `6e62592` merge: sync main with upstream/main
- `8545f52` Merge pull request #10 from code-yeongyu/fix/upstream-agent-wait-for-checks
- `e611aaf` ci(upstream): wait for PR checks to appear
- `a133341` Merge pull request #8 from code-yeongyu/fix/upstream-agent-wait-for-branch
- `c9de60b` ci(upstream): wait for pushed sync branch
- `d3efc80` Merge pull request #7 from code-yeongyu/fix/upstream-agent-unique-branch
- `3351fa1` ci(upstream): isolate automation branch retries
- `c2b2df8` Merge pull request #6 from code-yeongyu/fix/upstream-agent-push-head
- `f5bdbe0` ci(upstream): push verified agent head
- `9fca4c4` ci(upstream): keep merge report cleanup clean
- `959b66a` ci(upstream): keep merge report cleanup clean
- `5c52cd4` ci(upstream): ignore QA evidence artifacts
- `641d001` Merge pull request #4 from code-yeongyu/code-yeongyu/upstream-agent-merge-automation
- `06ef391` ci: add upstream merge automation
- `9b9e245` Merge pull request #3 from code-yeongyu/automation/sync-upstream-20260619
- `5592b07` merge: sync main with upstream/main
- `70556d8` Merge pull request #2 from code-yeongyu/automation/sync-upstream-20260617
- `6ee662a` merge: sync main with upstream/main
- `790687b` test: stabilize command tests after upstream merge
- `a0d3c55` merge: sync main with upstream/main
- `ee41d73` docs: add hierarchical AGENTS.md knowledge base
- `ddf78ef` merge: sync main with upstream/main
- `45bac4a` chore(skills): record ulw merge no-op
- `f57c357` fix(discord): default personal tokens to readonly
- `de2ff56` docs(discord): prefer bot automation tokens
- `e2754fb` feat(discordbot): preserve token labels
- `28a352e` feat(discord): block readonly utility writes
- `a20c295` feat(discord): block readonly message writes
- `ba05d06` feat(discord): add readonly account guard
- `1c3dbc4` fix(instagram): use parent message client_context for replied_to_client_context
- `c18150d` fix(whatsapp): use Baileys BufferJSON to round-trip media WAMessages
- `0a00849` feat(instagram): add 'message reply' subcommand using replied_to_item_id
- `448a1cf` fix(whatsapp): persist message cache so reply works across CLI runs
- `6bbe09d` fix(telegram): drop redundant chat_id in inputMessageReplyToMessage
- `fdcfa2e` fix(kakaotalk): serialize parent ids as plain numbers in LOCO reply extra
- `e4deb38` style: apply oxfmt to reply feature files
- `e845e17` feat(kakaotalk): add 'message reply' subcommand using LOCO type=26 reply attachment
- `742089c` feat(slack,slackbot): add 'message reply' as explicit alias for thread sends
- `8975e59` feat(line): add 'message reply' subcommand using relatedMessageId
- `a78020d` feat(channeltalkbot): add 'message reply' subcommand for group threads
- `f879cf9` feat(whatsapp): add 'message reply' subcommand using Baileys quoted
- `6fb56f4` feat(whatsappbot): add 'message reply' subcommand using Cloud API context
- `4b88711` feat(webex): add 'message reply' subcommand using parentId
- `a52b1ae` feat(discordbot): add 'message reply' subcommand using message_reference
- `f3da6ac` feat(discord): add 'message reply' subcommand using message_reference
- `1530caa` feat(telegram): add 'message reply' subcommand using TDLib reply_to
- `0fafb87` fix: stop bun test from hanging in webex command tests
- `508c36e` style: apply oxfmt to access-control source files
- `0203494` docs: add public-only policy recipe and note search now honors channelType
- `88036a2` feat: honor Slack channelType rules on message search
- `d824093` docs(skills): document access control in Slack/Discord/Teams skills
- `fffba54` docs: document access control feature
- `cc6a68d` feat: add 'agent-messenger policy show/validate/edit' subcommands
- `9c68dbb` feat: enforce policy in Teams commands
- `c9b15ae` feat: enforce policy in Discord commands
- `f02b9ee` feat: expose engine.hasRule and tighten Slack DM short-circuit
- `596b690` feat: enforce policy in Slack commands
- `8e2601e` feat: add policy module foundation for access control

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly/personal-token safety description and took upstream's `2.23.4` skill version.

No lockfiles, vendored files, scripts, or `.github/upstream.json` conflicts were encountered during the merge. `.github/upstream.json` was updated after the merge to pin `06dbb0cbae6363744de10975a8587ed45aad65bd`.

## QA Results

- `bun install --frozen-lockfile`: passed, no changes
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes
- `bun run typecheck`: passed
- `bun run lint`: passed, 0 warnings and 0 errors
- `bun run format:check`: passed
- `bun run test`: passed, 3338 pass, 0 fail
- `bun run build`: passed
- `node dist/src/cli.js --help`: passed
- `node dist/src/cli.js slack --help`: passed
