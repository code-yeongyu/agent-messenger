# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `c99c1af9a8cd0a31b862bb5c333ee1f96f9182a4`
- Merge commit: `c296fd85`
- Pin commit: `d1da6ad8`
- Synced at: `2026-09-30T03:08:30Z`

## Preserved Fork Commits

Preserved all fork-side history on the automation branch via a history-preserving `git merge --no-ff`.
There were 161 non-merge fork commits ahead of `upstream/main` before this sync, including prior sync
bookkeeping. Content-bearing fork commits preserved:

```text
f2a3098e fix(discordbot): support before cursor for message listing
386d983f style(discord): format merged message tests
0fa6d61d style(webex): format merged message tests
ebabe6ea fix(webex): preserve reply output refs after merge
2a8808d5 fix: satisfy discord readonly guard lint
e611aaf2 ci(upstream): wait for PR checks to appear
c9de60bc ci(upstream): wait for pushed sync branch
3351fa19 ci(upstream): isolate automation branch retries
f5bdbe07 ci(upstream): push verified agent head
959b66a0 ci(upstream): keep merge report cleanup clean
5c52cd45 ci(upstream): ignore QA evidence artifacts
06ef391c ci: add upstream merge automation
790687be test: stabilize command tests after upstream merge
ee41d735 docs: add hierarchical AGENTS.md knowledge base
45bac4a4 chore(skills): record ulw merge no-op
f57c3575 fix(discord): default personal tokens to readonly
de2ff564 docs(discord): prefer bot automation tokens
e2754fb2 feat(discordbot): preserve token labels
28a352e9 feat(discord): block readonly utility writes
a20c2950 feat(discord): block readonly message writes
ba05d06e feat(discord): add readonly account guard
1c3dbc4a fix(instagram): use parent message client_context for replied_to_client_context
c18150d9 fix(whatsapp): use Baileys BufferJSON to round-trip media WAMessages
0a008498 feat(instagram): add 'message reply' subcommand using replied_to_item_id
448a1cf2 fix(whatsapp): persist message cache so reply works across CLI runs
6bbe09de fix(telegram): drop redundant chat_id in inputMessageReplyToMessage
fdcfa2ef fix(kakaotalk): serialize parent ids as plain numbers in LOCO reply extra
e4deb383 style: apply oxfmt to reply feature files
e845e17f feat(kakaotalk): add 'message reply' subcommand using LOCO type=26 reply attachment
742089cb feat(slack,slackbot): add 'message reply' as explicit alias for thread sends
8975e598 feat(line): add 'message reply' subcommand using relatedMessageId
a78020d6 feat(channeltalkbot): add 'message reply' subcommand for group threads
f879cf94 feat(whatsapp): add 'message reply' subcommand using Baileys quoted
6fb56f4c feat(whatsappbot): add 'message reply' subcommand using Cloud API context
4b887111 feat(webex): add 'message reply' subcommand using parentId
a52b1ae4 feat(discordbot): add 'message reply' subcommand using message_reference
f3da6ac8 feat(discord): add 'message reply' subcommand using message_reference
1530caa2 feat(telegram): add 'message reply' subcommand using TDLib reply_to
0fafb872 fix: stop bun test from hanging in webex command tests
508c36e2 style: apply oxfmt to access-control source files
0203494a docs: add public-only policy recipe and note search now honors channelType
88036a2a feat: honor Slack channelType rules on message search
d824093c docs(skills): document access control in Slack/Discord/Teams skills
fffba549 docs: document access control feature
cc6a68d9 feat: add 'agent-messenger policy show/validate/edit' subcommands
9c68dbbd feat: enforce policy in Teams commands
c9b15ae6 feat: enforce policy in Discord commands
f02b9ee2 feat: expose engine.hasRule and tighten Slack DM short-circuit
596b690e feat: enforce policy in Slack commands
8e2601e6 feat: add policy module foundation for access control
```

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly personal-token guidance and Discordbot
  write-routing instructions, while accepting upstream's `version: 2.38.1` release bump.

No vendored files were edited by hand.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "c99c1af9a8cd0a31b862bb5c333ee1f96f9182a4",
  "synced_at": "2026-09-30T03:08:30Z"
}
```

## QA Results

All required checks passed:

```text
bun install --frozen-lockfile                       PASS
cd docs && bun install --frozen-lockfile && cd ..   PASS
bun run typecheck                                   PASS
bun run lint                                        PASS
bun run format:check                                PASS
bun run test                                        PASS (3965 pass, 0 fail)
bun run build                                       PASS
node dist/src/cli.js --help                         PASS
node dist/src/cli.js slack --help                   PASS
```
