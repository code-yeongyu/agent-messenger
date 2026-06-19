# Upstream merge driver

You are Codex running headless inside GitHub Actions for an agent-messenger fork. Your job is
to sync the current bot branch with the configured upstream branch and leave a PR-ready branch.
Work only in the current repository checkout. Do not contact external services other than git
remotes and GitHub through `gh`.

The workflow has already configured:

- `origin`: the fork repository where the workflow is running
- `upstream`: `agent-messenger/agent-messenger`
- current branch: an automation branch created from fork `main`

## Procedure

### 1. Merge upstream

Use the merge-upstream skill semantics to sync the current bot branch with `upstream/main` via a
history-preserving merge (`git merge --no-ff`). Honor every invariant: no rebase, no force-push,
no `--no-verify`, no `--no-gpg-sign`, and no history rewrite. Do not push, open pull requests,
merge pull requests, create tags, or run a release.

If there is no upstream work to merge, write a short report and finish with
`MERGE_RESULT: NO_RELEASE_NEEDED`.

### 2. Resolve conflicts conservatively

Resolve only conflicts you can understand from the surrounding code and repository conventions.
Use these path rules where they apply:

| Path / pattern | Resolution |
| --- | --- |
| `bun.lock` | merge semantically; regenerate with `bun install --frozen-lockfile` only if the lockfile is already consistent |
| `docs/bun.lock` | merge semantically; regenerate from `docs/` only if needed |
| `.github/upstream.json` | keep the fork file, then update it after the merge |
| `src/vendor/**` | prefer upstream; this is vendored generated LINE code |
| `scripts/**` | never import scripts from `src/`; keep diagnostic scripts out of published runtime paths |

If a conflict is genuinely ambiguous, abort the merge (`git merge --abort`), write
`.github/agent/last-merge-report.md` with the unresolved files and analysis, print
`MERGE_RESULT: CONFLICTS`, and exit. Do not guess on semantic conflicts.

### 3. Update the upstream pin

After a clean merge, update `.github/upstream.json`:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: the merged `upstream/main` commit
- `synced_at`: current UTC time (`YYYY-MM-DDTHH:MM:SSZ`)

Stage and amend it into the merge commit, or add a focused follow-up commit:
`sync: record upstream pin <short-sha>`.

### 4. Hands-on QA

Verify the merged tree actually builds and the CLI starts:

```bash
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

If the build or smoke test fails, attempt a focused fix that preserves both fork and upstream
intent. Re-run until green. If you cannot get a working tree, write
`.github/agent/last-merge-report.md`, print `MERGE_RESULT: QA_FAILED`, and exit without leaving a
broken tree staged for release.

### 5. Finish

Leave the bot branch with committed merge, pin, and focused fix commits in place. Write
`.github/agent/last-merge-report.md` with:

- upstream SHA
- preserved fork commits
- conflicts resolved and how
- QA commands and results

The final stdout line MUST be exactly one of:

- `MERGE_RESULT: CLEAN_PR_READY`
- `MERGE_RESULT: NO_RELEASE_NEEDED`
- `MERGE_RESULT: CONFLICTS`
- `MERGE_RESULT: QA_FAILED`
- `MERGE_RESULT: AGENT_FAILED`

## Hard rules

- Never `git push`, `git rebase`, `git push --force`, or `git reset --hard origin/*`.
- Never bypass hooks/signing with `--no-verify` or `--no-gpg-sign`.
- Never create, merge, or edit pull requests.
- Never create tags or run the release workflow.
- Never edit `src/vendor/**` by hand.
