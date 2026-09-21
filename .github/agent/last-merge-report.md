# Upstream Merge Report

- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `2bd0f4343dbc537a290f691753309c3c80504252`
- Merge commit: `fb7970df`
- Pin commit: `e9316b6e`
- Synced at: `2026-09-21T05:06:48Z`

## Preserved Fork Commits

The merge preserved 155 fork-side non-merge commits that were not present on `upstream/main` before the merge:

```text
8e2601e6 feat: add policy module foundation for access control
596b690e feat: enforce policy in Slack commands
f02b9ee2 feat: expose engine.hasRule and tighten Slack DM short-circuit
c9b15ae6 feat: enforce policy in Discord commands
9c68dbbd feat: enforce policy in Teams commands
cc6a68d9 feat: add 'agent-messenger policy show/validate/edit' subcommands
fffba549 docs: document access control feature
d824093c docs(skills): document access control in Slack/Discord/Teams skills
88036a2a feat: honor Slack channelType rules on message search
0203494a docs: add public-only policy recipe and note search now honors channelType
508c36e2 style: apply oxfmt to access-control source files
0fafb872 fix: stop bun test from hanging in webex command tests
1530caa2 feat(telegram): add 'message reply' subcommand using TDLib reply_to
f3da6ac8 feat(discord): add 'message reply' subcommand using message_reference
a52b1ae4 feat(discordbot): add 'message reply' subcommand using message_reference
4b887111 feat(webex): add 'message reply' subcommand using parentId
6fb56f4c feat(whatsappbot): add 'message reply' subcommand using Cloud API context
f879cf94 feat(whatsapp): add 'message reply' subcommand using Baileys quoted
a78020d6 feat(channeltalkbot): add 'message reply' subcommand for group threads
8975e598 feat(line): add 'message reply' subcommand using relatedMessageId
742089cb feat(slack,slackbot): add 'message reply' as explicit alias for thread sends
e845e17f feat(kakaotalk): add 'message reply' subcommand using LOCO type=26 reply attachment
e4deb383 style: apply oxfmt to reply feature files
fdcfa2ef fix(kakaotalk): serialize parent ids as plain numbers in LOCO reply extra
6bbe09de fix(telegram): drop redundant chat_id in inputMessageReplyToMessage
448a1cf2 fix(whatsapp): persist message cache so reply works across CLI runs
0a008498 feat(instagram): add 'message reply' subcommand using replied_to_item_id
c18150d9 fix(whatsapp): use Baileys BufferJSON to round-trip media WAMessages
1c3dbc4a fix(instagram): use parent message client_context for replied_to_client_context
ba05d06e feat(discord): add readonly account guard
a20c2950 feat(discord): block readonly message writes
28a352e9 feat(discord): block readonly utility writes
e2754fb2 feat(discordbot): preserve token labels
de2ff564 docs(discord): prefer bot automation tokens
f57c3575 fix(discord): default personal tokens to readonly
45bac4a4 chore(skills): record ulw merge no-op
ee41d735 docs: add hierarchical AGENTS.md knowledge base
790687be test: stabilize command tests after upstream merge
06ef391c ci: add upstream merge automation
5c52cd45 ci(upstream): ignore QA evidence artifacts
959b66a0 ci(upstream): keep merge report cleanup clean
f5bdbe07 ci(upstream): push verified agent head
3351fa19 ci(upstream): isolate automation branch retries
c9de60bc ci(upstream): wait for pushed sync branch
e611aaf2 ci(upstream): wait for PR checks to appear
2a8808d5 fix: satisfy discord readonly guard lint
39e071bb sync: record upstream pin 6a8f96d
ebabe6ea fix(webex): preserve reply output refs after merge
3e26c38d sync: record upstream pin 7e4ba9e
38517824 sync: record upstream merge report
a7b087bb chore: remove upstream agent report
10f76bbb sync: record upstream pin 06dbb0c
22feea91 sync: record upstream merge report
71d1f977 chore: remove upstream agent report
d510cd44 sync: record upstream merge report
69bf8aa6 chore: remove upstream agent report
00dcf2be sync: record upstream merge report
7d2ad17c chore: remove upstream agent report
5867b5b4 sync: record upstream pin 14041e1
3615d19c sync: record upstream merge report
7fe68c60 chore: remove upstream agent report
0d12ca50 sync: record upstream merge report
5759ae04 chore: remove upstream agent report
0fa6d61d style(webex): format merged message tests
437057ea sync: record upstream pin 2f2a628
acff0ef4 sync: record upstream merge report
cdea9ad1 chore: remove upstream agent report
e17269ab sync: record upstream merge report
0773432c chore: remove upstream agent report
7e91d55d sync: record upstream pin f7469ac
f2874688 sync: record upstream merge report
9a760894 chore: remove upstream agent report
475d5f82 sync: record upstream pin 9d458063
4af7e84d sync: record upstream merge report
2d9cf824 chore: remove upstream agent report
8a99f9f7 sync: record upstream pin 3b458605
cbebbfad sync: record upstream merge report
3b368373 chore: remove upstream agent report
9d4427f0 sync: record upstream merge report
81358fa3 chore: remove upstream agent report
99f95c5d sync: record upstream pin b2539b7
6f9e92c2 sync: record upstream merge report
568f6c09 chore: remove upstream agent report
02d77843 sync: record upstream pin 0e58483
dbfd62c7 sync: record upstream merge report
38f71e72 chore: remove upstream agent report
07999350 sync: record upstream pin b03dc869
ab700c5f sync: record upstream merge report
918653e5 chore: remove upstream agent report
ea77c97b sync: record upstream pin 2801f2c
8cc27b58 sync: record upstream merge report
47af5781 chore: remove upstream agent report
681af33e sync: record upstream merge report
06114729 chore: remove upstream agent report
06eb48d5 sync: record upstream merge report
d95d7c84 chore: remove upstream agent report
9d5efa4c sync: record upstream merge report
c0504159 chore: remove upstream agent report
b09a03b6 sync: record upstream pin ba50c1d
6276b7c4 sync: record upstream merge report
96179ecf chore: remove upstream agent report
279f6e6e sync: record upstream pin f727283
386d983f style(discord): format merged message tests
f0278af1 sync: record upstream merge report
7402cf5f chore: remove upstream agent report
9271a17d sync: record upstream merge report
8a372601 chore: remove upstream agent report
38781558 sync: record upstream pin a35fa44
d0d4d09c sync: record upstream merge report
764de93d chore: remove upstream agent report
6f1c36ce sync: record upstream merge report
5102ec03 chore: remove upstream agent report
6c6796c3 sync: record upstream pin 930ad2b
bf2a8395 sync: record upstream merge report
abfc7753 chore: remove upstream agent report
78086f0e sync: record upstream merge report
2a03a01c chore: remove upstream agent report
bfddf35f sync: record upstream merge report
6bd9d11d chore: remove upstream agent report
18a64e28 sync: record upstream merge report
2bb0ca9f chore: remove upstream agent report
0fd38416 sync: record upstream pin ef5c77d
faf94caf sync: record upstream merge report
35d16f9e chore: remove upstream agent report
25ba44c2 sync: record upstream merge report
0baae981 chore: remove upstream agent report
dad07708 sync: record upstream pin 4f4a1b4
44cb7d05 sync: record upstream merge report
cc451c05 chore: remove upstream agent report
59068054 sync: record upstream merge report
c3af3c88 chore: remove upstream agent report
6b323eba sync: record upstream pin 82344759
e57cb537 sync: record upstream merge report
3754ef72 chore: remove upstream agent report
e6ee958e sync: record upstream merge report
ee5777c7 chore: remove upstream agent report
09a64576 sync: record upstream pin 1f83a9d7
731681d8 sync: record upstream merge report
11598a73 chore: remove upstream agent report
8e54c2b1 sync: record upstream pin 8d6b147e
25e43729 sync: record upstream merge report
e789f4f5 chore: remove upstream agent report
5683166b sync: record upstream merge report
cbdbd840 chore: remove upstream agent report
9048a5ca sync: record upstream merge report
014f0eef chore: remove upstream agent report
f7adf700 sync: record upstream pin 18ec8a4f
89ced93b sync: record upstream merge report
6b3d7e6e chore: remove upstream agent report
f3427009 sync: record upstream pin 2102302d
68a90de7 sync: record upstream merge report
042c4add chore: remove upstream agent report
2e74bad1 sync: record upstream merge report db084a7
564d3101 chore: remove upstream agent report
f2a3098e fix(discordbot): support before cursor for message listing
```

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: resolved frontmatter conflict by preserving the fork's read-only personal-token safety description and taking upstream's `2.37.2` version bump.

No lockfile conflicts occurred. No vendored files were edited by hand.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "2bd0f4343dbc537a290f691753309c3c80504252",
  "synced_at": "2026-09-21T05:06:48Z"
}
```

## QA Results

All requested commands passed:

```text
bun install --frozen-lockfile
cd docs && bun install --frozen-lockfile && cd ..
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
node dist/src/cli.js --help
node dist/src/cli.js slack --help
```

Test summary:

```text
3902 pass
0 fail
7702 expect() calls
Ran 3902 tests across 276 files.
```
