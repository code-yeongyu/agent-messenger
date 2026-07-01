# Upstream Merge Report

- Result: clean PR-ready merge
- Generated: 2026-07-01T07:31:11Z
- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 9d458063f408248ff7389ba43b0fac3db134b249
- Merge commit: 305c8dbd merge: sync main with upstream/main
- Pin commit: 475d5f82 sync: record upstream pin 9d458063

## Preserved Fork Commits

Fork-only non-merge commits remain in history. `git log --oneline --no-merges upstream/main..HEAD` before writing this report showed:

```text
475d5f82 sync: record upstream pin 9d458063
9a760894 chore: remove upstream agent report
f2874688 sync: record upstream merge report
7e91d55d sync: record upstream pin f7469ac
0773432c chore: remove upstream agent report
e17269ab sync: record upstream merge report
cdea9ad1 chore: remove upstream agent report
acff0ef4 sync: record upstream merge report
437057ea sync: record upstream pin 2f2a628
0fa6d61d style(webex): format merged message tests
5759ae04 chore: remove upstream agent report
0d12ca50 sync: record upstream merge report
7fe68c60 chore: remove upstream agent report
3615d19c sync: record upstream merge report
5867b5b4 sync: record upstream pin 14041e1
7d2ad17c chore: remove upstream agent report
00dcf2be sync: record upstream merge report
69bf8aa6 chore: remove upstream agent report
d510cd44 sync: record upstream merge report
71d1f977 chore: remove upstream agent report
22feea91 sync: record upstream merge report
10f76bbb sync: record upstream pin 06dbb0c
a7b087bb chore: remove upstream agent report
38517824 sync: record upstream merge report
3e26c38d sync: record upstream pin 7e4ba9e
ebabe6ea fix(webex): preserve reply output refs after merge
39e071bb sync: record upstream pin 6a8f96d
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

- `skills/agent-discord/SKILL.md`: kept the fork's readonly personal-token guidance and command examples, while taking upstream's `version: 2.28.0` release bump. This preserves the fork's Discord safety intent and integrates upstream release metadata.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "9d458063f408248ff7389ba43b0fac3db134b249",
  "synced_at": "2026-07-01T07:28:40Z"
}
```

## QA Results

All required commands passed.

```text
bun install --frozen-lockfile                         PASS
cd docs && bun install --frozen-lockfile && cd ..     PASS
bun run typecheck                                     PASS
bun run lint                                          PASS
bun run format:check                                  PASS
bun run test                                          PASS (3476 pass, 0 fail)
bun run build                                         PASS
node dist/src/cli.js --help                           PASS
node dist/src/cli.js slack --help                     PASS
```
