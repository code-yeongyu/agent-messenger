# Upstream Merge Report

- Upstream repo: agent-messenger/agent-messenger
- Upstream branch: main
- Upstream SHA: 0e58483f67ed6730f9f3cb31b234b72f25f544b2
- Merge commit: 3e418432
- Pin commit: 02d77843
- Synced at: 2026-07-02T08:48:23Z

## Preserved Fork Commits

The merge used `git merge --no-ff upstream/main`, preserving the fork branch history as the first parent.

- Fork head before merge: 5c6c38d2bacc48e8e5c1887fcf42d719a5b0552d
- Existing fork commits since upstream/main remain reachable through the first-parent history.
- New upstream commits integrated:
  - 0e58483f Merge pull request #280 from agent-messenger/fix/instagram-one-click-login-endpoint
  - 2e28c652 feat(instagram): surface 429 body and debug-log the email-login flow
  - cf814a01 fix(instagram): point login-email callers at sendOneClickLoginEmail
  - 1fd1875f fix(instagram): trigger the login email via the correct one_click_login endpoint

## Conflicts

No conflicts occurred. Git auto-merged the Instagram login flow changes cleanly.

Files changed by the merge:

- `src/platforms/instagram/client.test.ts`
- `src/platforms/instagram/client.ts`
- `src/platforms/instagram/commands/auth.test.ts`
- `src/platforms/instagram/commands/auth.ts`
- `src/tui/adapters/instagram-adapter.ts`

## Upstream Pin

Updated `.github/upstream.json` to:

- `repo`: `agent-messenger/agent-messenger`
- `branch`: `main`
- `sha`: `0e58483f67ed6730f9f3cb31b234b72f25f544b2`
- `synced_at`: `2026-07-02T08:48:23Z`

## QA

All requested commands passed:

- `bun install --frozen-lockfile`
- `cd docs && bun install --frozen-lockfile && cd ..`
- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun run test` - 3521 pass, 0 fail
- `bun run build`
- `node dist/src/cli.js --help`
- `node dist/src/cli.js slack --help`

## Result

Branch is clean and PR-ready.
