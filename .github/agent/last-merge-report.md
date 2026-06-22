# Upstream Merge Report

- Result: clean PR-ready merge
- Upstream: `agent-messenger/agent-messenger`
- Branch: `main`
- Upstream SHA: `80c0b7e61deadf4b2bf7ab0051900d8ddf8a4b68`
- Merge commit: `21c6d46b9d7048d6d8339bccf8b25d683a8be29a`
- Pre-merge fork tip: `247790a52bdfe01a26ded124e56a7f558e0991cc`
- Upstream pin: `.github/upstream.json` now records `80c0b7e61deadf4b2bf7ab0051900d8ddf8a4b68`

## Preserved Fork Commits

The merge was performed with `git merge --no-ff upstream/main`; no rebase, reset, force-push, or history rewrite was used. All commits reachable from the pre-merge fork tip `247790a52bdfe01a26ded124e56a7f558e0991cc` remain preserved as the first parent side of merge commit `21c6d46b9d7048d6d8339bccf8b25d683a8be29a`.

The preserved fork-only range before this sync was:

```bash
git log --oneline upstream/main..247790a52bdfe01a26ded124e56a7f558e0991cc
```

That range includes the fork access-control work, Discord readonly guard work, reply subcommands and fixes across platforms, previous upstream sync commits, and the fork's upstream automation workflow changes.

## Conflicts

- `skills/agent-slack/SKILL.md`: resolved an additive content conflict by keeping the fork's Slack access-control guidance and the upstream Slack QR code login SDK guidance. No hand edits were made under `src/vendor/**`.

## QA

All required commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` (`3384 pass`, `0 fail`)
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`
