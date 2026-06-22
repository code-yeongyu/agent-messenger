# Upstream Merge Report

## Upstream

- Repo: `agent-messenger/agent-messenger`
- Branch: `main`
- SHA: `320df8f9e0d77d61e0dcab3d67edf3ecb71584d9`
- Merge commit: `8e45e60fa923e6e9f9c8daf0ddc204059e59de4b`
- Merge parents: `51fd00898116773e24df88346d9c9cf38e16dc1a` and `320df8f9e0d77d61e0dcab3d67edf3ecb71584d9`
- Upstream pin updated in `.github/upstream.json` with `synced_at` `2026-06-22T07:57:32Z`

## Preserved Fork Commits

The merge preserves the fork history on the current branch, including these non-upstream commits:

```text
71d1f97 chore: remove upstream agent report
22feea9 sync: record upstream merge report
10f76bb sync: record upstream pin 06dbb0c
a7b087b chore: remove upstream agent report
3851782 sync: record upstream merge report
3e26c38 sync: record upstream pin 7e4ba9e
ebabe6e fix(webex): preserve reply output refs after merge
39e071b sync: record upstream pin 6a8f96d
2a8808d fix: satisfy discord readonly guard lint
e611aaf ci(upstream): wait for PR checks to appear
c9de60b ci(upstream): wait for pushed sync branch
3351fa1 ci(upstream): isolate automation branch retries
f5bdbe0 ci(upstream): push verified agent head
959b66a ci(upstream): keep merge report cleanup clean
5c52cd4 ci(upstream): ignore QA evidence artifacts
06ef391 ci: add upstream merge automation
790687b test: stabilize command tests after upstream merge
ee41d73 docs: add hierarchical AGENTS.md knowledge base
45bac4a chore(skills): record ulw merge no-op
f57c357 fix(discord): default personal tokens to readonly
de2ff56 docs(discord): prefer bot automation tokens
e2754fb feat(discordbot): preserve token labels
28a352e feat(discord): block readonly utility writes
a20c295 feat(discord): block readonly message writes
ba05d06 feat(discord): add readonly account guard
1c3dbc4 fix(instagram): use parent message client_context for replied_to_client_context
c18150d fix(whatsapp): use Baileys BufferJSON to round-trip media WAMessages
0a00849 feat(instagram): add 'message reply' subcommand using replied_to_item_id
448a1cf fix(whatsapp): persist message cache so reply works across CLI runs
6bbe09d fix(telegram): drop redundant chat_id in inputMessageReplyToMessage
fdcfa2e fix(kakaotalk): serialize parent ids as plain numbers in LOCO reply extra
e4deb38 style: apply oxfmt to reply feature files
e845e17 feat(kakaotalk): add 'message reply' subcommand using LOCO type=26 reply attachment
742089c feat(slack,slackbot): add 'message reply' as explicit alias for thread sends
8975e59 feat(line): add 'message reply' subcommand using relatedMessageId
a78020d feat(channeltalkbot): add 'message reply' subcommand for group threads
f879cf9 feat(whatsapp): add 'message reply' subcommand using Baileys quoted
6fb56f4 feat(whatsappbot): add 'message reply' subcommand using Cloud API context
4b88711 feat(webex): add 'message reply' subcommand using parentId
a52b1ae feat(discordbot): add 'message reply' subcommand using message_reference
f3da6ac feat(discord): add 'message reply' subcommand using message_reference
1530caa feat(telegram): add 'message reply' subcommand using TDLib reply_to
0fafb87 fix: stop bun test from hanging in webex command tests
508c36e style: apply oxfmt to access-control source files
0203494 docs: add public-only policy recipe and note search now honors channelType
88036a2 feat: honor Slack channelType rules on message search
d824093 docs(skills): document access control in Slack/Discord/Teams skills
fffba54 docs: document access control feature
cc6a68d feat: add 'agent-messenger policy show/validate/edit' subcommands
9c68dbb feat: enforce policy in Teams commands
c9b15ae feat: enforce policy in Discord commands
f02b9ee feat: expose engine.hasRule and tighten Slack DM short-circuit
596b690 feat: enforce policy in Slack commands
8e2601e feat: add policy module foundation for access control
```

## Conflicts Resolved

- `skills/agent-discord/SKILL.md`: kept the fork's readonly personal-token safety description and guidance, and took upstream's `2.23.6` version bump.

No vendored files were edited by hand.

## QA Results

All required checks passed:

```text
bun install --frozen-lockfile
PASS - Checked 296 installs across 383 packages; no changes.

cd docs && bun install --frozen-lockfile && cd ..
PASS - Checked 288 installs across 361 packages; no changes.

bun run typecheck
PASS - tsc --noEmit

bun run lint
PASS - oxlint found 0 warnings and 0 errors.

bun run format:check
PASS - All matched files use the correct format.

bun run test
PASS - 3358 pass, 0 fail, 6305 expect() calls across 247 files.

bun run build
PASS - tsc, tsc-alias, postbuild shebang update, and vendor copy completed.

node dist/src/cli.js --help
PASS - root CLI help rendered.

node dist/src/cli.js slack --help
PASS - Slack CLI help rendered.
```
