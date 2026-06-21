# Upstream Merge Report

- Upstream repository: `agent-messenger/agent-messenger`
- Upstream branch: `main`
- Upstream SHA: `7e4ba9eba0bdf960b7655c84f5d28f68435b2677`
- Previous fork head: `b3fe2a31da5ce7b0842d8695f101a95bc5f30226`
- Merge commit: `4459b2b3f48d039bb795766d9f26e9e91d07d598`
- Pin commit: `3e26c38428772670f4a390981ed9c2a9f4d3ca88`
- Result: clean history-preserving merge with `git merge --no-ff upstream/main`

## Preserved Fork Commits

Preserved 64 fork-side commits that were reachable from the previous fork head and absent from
`upstream/main`, including the upstream automation, policy/access-control work, message reply
features, readonly Discord guard work, and prior merge/pin commits.

Recent preserved commits:

```text
b3fe2a3 Merge pull request #12 from code-yeongyu/automation/sync-upstream-6a8f96d175dd-27907845107
ebabe6e fix(webex): preserve reply output refs after merge
39e071b sync: record upstream pin 6a8f96d
023067c merge: sync main with upstream/main
b9dbb72 Merge pull request #11 from code-yeongyu/automation/sync-upstream-30a7219d05fc-27903350316
2a8808d fix: satisfy discord readonly guard lint
6e62592 merge: sync main with upstream/main
8545f52 Merge pull request #10 from code-yeongyu/fix/upstream-agent-wait-for-checks
e611aaf ci(upstream): wait for PR checks to appear
a133341 Merge pull request #8 from code-yeongyu/fix/upstream-agent-wait-for-branch
c9de60b ci(upstream): wait for pushed sync branch
d3efc80 Merge pull request #7 from code-yeongyu/fix/upstream-agent-unique-branch
3351fa1 ci(upstream): isolate automation branch retries
c2b2df8 Merge pull request #6 from code-yeongyu/fix/upstream-agent-push-head
f5bdbe0 ci(upstream): push verified agent head
9fca4c4 ci(upstream): keep merge report cleanup clean
959b66a ci(upstream): keep merge report cleanup clean
5c52cd4 ci(upstream): ignore QA evidence artifacts
641d001 Merge pull request #4 from code-yeongyu/code-yeongyu/upstream-agent-merge-automation
06ef391 ci: add upstream merge automation
```

Feature/fix commits preserved from the fork history include:

```text
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
88036a2 feat: honor Slack channelType rules on message search
cc6a68b feat: add 'agent-messenger policy show/validate/edit' subcommands
9c68dbb feat: enforce policy in Teams commands
c9b15ae feat: enforce policy in Discord commands
596b690 feat: enforce policy in Slack commands
8e2601e feat: add policy module foundation for access control
```

## Conflicts

No conflicts occurred. Git auto-merged the Webex/Webex bot updates with the default `ort` strategy.
No manual conflict resolution was needed, and `src/vendor/**` was not edited.

## Upstream Pin

Updated `.github/upstream.json` to:

```json
{
  "repo": "agent-messenger/agent-messenger",
  "branch": "main",
  "sha": "7e4ba9eba0bdf960b7655c84f5d28f68435b2677",
  "synced_at": "2026-06-21T16:33:00Z"
}
```

## QA

All required checks passed:

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

Notable results:

- Root install: checked 296 installs across 383 packages, no changes.
- Docs install: checked 288 installs across 361 packages, no changes.
- Typecheck: `tsc --noEmit` passed.
- Lint: `oxlint` found 0 warnings and 0 errors.
- Format: all matched files use the correct format.
- Tests: 3338 pass, 0 fail, across 246 files.
- Build: compiled with `tsc && tsc-alias`, updated 9 CLI shebangs, copied vendored LINE runtime.
- CLI smoke tests: root help and Slack help both exited 0.
