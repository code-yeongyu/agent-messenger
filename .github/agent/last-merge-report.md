# Upstream Merge Report

- Result: clean PR-ready merge
- Upstream repo: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `764a292e5cc8676b77ad85e285d54306839db436`
- Local merge commit: `d0ef18cd2b6adeca453f3e70577c674155c659fd`
- Merge command: `git merge --no-ff upstream/main -m "merge: sync main with upstream/main"`
- Upstream pin: updated `.github/upstream.json` to `764a292e5cc8676b77ad85e285d54306839db436` at `2026-07-20T05:14:12Z`, amended into the merge commit.

## Preserved Fork Commits

The merge preserved the first-parent fork history from `HEAD^1`. Audit command:
`git log --oneline upstream/main..HEAD^1`

Total fork-only commits preserved: 217.

Non-merge fork commits preserved:

```text
cc451c05 chore: remove upstream agent report
44cb7d05 sync: record upstream merge report
dad07708 sync: record upstream pin 4f4a1b4
0baae981 chore: remove upstream agent report
25ba44c2 sync: record upstream merge report
35d16f9e chore: remove upstream agent report
faf94caf sync: record upstream merge report
0fd38416 sync: record upstream pin ef5c77d
2bb0ca9f chore: remove upstream agent report
18a64e28 sync: record upstream merge report
6bd9d11d chore: remove upstream agent report
bfddf35f sync: record upstream merge report
2a03a01c chore: remove upstream agent report
78086f0e sync: record upstream merge report
abfc7753 chore: remove upstream agent report
bf2a8395 sync: record upstream merge report
6c6796c3 sync: record upstream pin 930ad2b
5102ec03 chore: remove upstream agent report
6f1c36ce sync: record upstream merge report
764de93d chore: remove upstream agent report
d0d4d09c sync: record upstream merge report
38781558 sync: record upstream pin a35fa44
8a372601 chore: remove upstream agent report
9271a17d sync: record upstream merge report
7402cf5f chore: remove upstream agent report
f0278af1 sync: record upstream merge report
386d983f style(discord): format merged message tests
279f6e6e sync: record upstream pin f727283
96179ecf chore: remove upstream agent report
6276b7c4 sync: record upstream merge report
b09a03b6 sync: record upstream pin ba50c1d
c0504159 chore: remove upstream agent report
9d5efa4c sync: record upstream merge report
d95d7c84 chore: remove upstream agent report
06eb48d5 sync: record upstream merge report
06114729 chore: remove upstream agent report
681af33e sync: record upstream merge report
47af5781 chore: remove upstream agent report
8cc27b58 sync: record upstream merge report
ea77c97b sync: record upstream pin 2801f2c
918653e5 chore: remove upstream agent report
ab700c5f sync: record upstream merge report
07999350 sync: record upstream pin b03dc869
38f71e72 chore: remove upstream agent report
dbfd62c7 sync: record upstream merge report
02d77843 sync: record upstream pin 0e58483
568f6c09 chore: remove upstream agent report
6f9e92c2 sync: record upstream merge report
99f95c5d sync: record upstream pin b2539b7
81358fa3 chore: remove upstream agent report
9d4427f0 sync: record upstream merge report
3b368373 chore: remove upstream agent report
cbebbfad sync: record upstream merge report
8a99f9f7 sync: record upstream pin 3b458605
2d9cf824 chore: remove upstream agent report
4af7e84d sync: record upstream merge report
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

## Conflicts

No conflicts required manual resolution. Git auto-merged `skills/agent-slack/SKILL.md`; the rest of the upstream changes applied cleanly.

Files changed by the merge:

```text
.github/upstream.json
bun.lock
package.json
skills/agent-slack/SKILL.md
src/platforms/slack/index.ts
src/platforms/slack/qr-confirmation.ts
src/platforms/slack/qr-cookie-jar.ts
src/platforms/slack/qr-http-login-2fa.test.ts
src/platforms/slack/qr-http-login.test.ts
src/platforms/slack/qr-http-login.ts
```

## QA

All required commands completed successfully:

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

Unit test result: 3733 pass, 0 fail.

