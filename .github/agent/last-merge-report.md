# Upstream Merge Report

## Upstream

- Repository: `agent-messenger/agent-messenger`
- Branch: `main`
- SHA: `3b458605bc9fbec99ff77cbf794ce75e7f79ee7f`
- Merge commit: `78e18bb8bce6ddb01ddbdc11b0bf184339d51c3a`
- Pin commit: `8a99f9f72099d6190fbd39ecf450e5d5bdb419a6`

## Preserved Fork Commits

- Preserved the current fork head before merge: `e1effd495cfde2d46386840cdb0b755f12cf3173`
- Preserved existing fork-only history reachable from that head, including upstream automation commits and fork feature/fix work. Full preserved set remains visible with `git log upstream/main..HEAD`.

## Conflicts

- `src/platforms/instagram/client.test.ts`: resolved a same-location test conflict by keeping both sides.
- Upstream side kept the new `twoFactorLogin` tests for legacy 2FA, Bloks fallback, cookie-derived user id, and failure handling.
- Fork side kept the `replyToMessage` tests that require the parent message `client_context` and explicit parent lookup errors.

## QA

- `bun install --frozen-lockfile`: passed, no changes.
- `cd docs && bun install --frozen-lockfile`: passed, no changes.
- `bun run typecheck`: passed.
- `bun run lint`: passed, 0 warnings and 0 errors.
- `bun run format:check`: passed, 726 files checked.
- `bun run test`: passed, 3487 pass, 0 fail.
- `bun run build`: passed, updated dist shebangs and copied vendored LINE runtime.
- `node dist/src/cli.js --help`: passed.
- `node dist/src/cli.js slack --help`: passed.

## Result

Clean PR-ready branch. No push, tag, release, rebase, force-push, or PR mutation was performed.
