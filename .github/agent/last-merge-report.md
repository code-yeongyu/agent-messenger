# Upstream Merge Report

## Upstream

- Repository: `agent-messenger/agent-messenger`
- Branch: `main`
- SHA: `30a7219d05fc2dde959be7016c599b0d64e34221`
- Merge commit: `518de35db7bd407d22ea46296b4923bf95ab17a2`
- Upstream pin updated in `.github/upstream.json` to `30a7219d05fc2dde959be7016c599b0d64e34221`.

## Preserved Fork Commits

- `c9de60b` ci(upstream): wait for pushed sync branch
- `3351fa1` ci(upstream): isolate automation branch retries
- `f5bdbe0` ci(upstream): push verified agent head
- `959b66a` ci(upstream): keep merge report cleanup clean
- `5c52cd4` ci(upstream): ignore QA evidence artifacts
- `06ef391` ci: add upstream merge automation
- `790687b` test: stabilize command tests after upstream merge
- `ee41d73` docs: add hierarchical AGENTS.md knowledge base
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

## Conflicts

- `skills/agent-discord/SKILL.md`: resolved frontmatter conflict by preserving the fork's readonly personal-token safety description and taking upstream's `2.23.1` skill version.

No vendored files were edited by hand.

## QA

- `bun install --frozen-lockfile`: passed, no changes.
- `cd docs && bun install --frozen-lockfile && cd ..`: passed, no changes.
- `bun run typecheck`: passed.
- `bun run lint`: passed with one warning in `src/platforms/discord/readonly-guard.ts` for `typescript-eslint(prefer-as-const)`.
- `bun run format:check`: passed.
- `bun run test`: passed, 3309 tests, 0 failures.
- `bun run build`: passed.
- `node dist/src/cli.js --help`: passed.
- `node dist/src/cli.js slack --help`: passed.
