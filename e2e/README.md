# E2E Tests

End-to-end tests that run every CLI command against real Slack and Discord APIs.

## Prerequisites

Before running E2E tests, you need:

1. **Dedicated Test Workspaces** - Create separate Slack and Discord test workspaces/guilds
   - **Never run E2E tests against your business or personal accounts**
   - Tests create and delete messages, which could interfere with real work

2. **Test Channels** - Create an `e2e-test` channel in each test workspace/guild
   - Slack: Channel named `e2e-test`
   - Discord: Text channel named `e2e-test`

3. **Authentication** - Either:
   - Local credentials from desktop apps (via `auth extract`)
   - Environment variables (for CI)

## Test Infrastructure

| File | Description |
|------|-------------|
| `config.ts` | Hardcoded test workspace/guild IDs and validation |
| `helpers.ts` | CLI runner, JSON parser, message cleanup utilities |
| `slack.e2e.test.ts` | Slack command tests (23 tests) |
| `discord.e2e.test.ts` | Discord command tests (20 tests) |

## Running E2E Tests Locally

### Step 1: Extract Credentials

First, make sure the desktop apps (Slack/Discord) are running and logged into your **test** workspaces.

```bash
# Extract Slack credentials
agent-slack auth extract

# Extract Discord credentials  
agent-discord auth extract
```

### Step 2: Switch to Test Workspace

Ensure you're targeting the correct test workspace:

```bash
# Verify Slack workspace
agent-slack workspace current
# Should show: "Agent Messenger" (T0AC55BSF6E)

# Verify Discord guild
agent-discord guild current
# Should show: "Agent Messenger" (1467039439770357844)
```

If wrong, switch workspaces:

```bash
agent-slack workspace switch <test-workspace-id>
agent-discord guild switch <test-guild-id>
```

### Step 3: Run Tests

```bash
# Run all E2E tests
bun test e2e/

# Run only Slack tests
bun test e2e/slack.e2e.test.ts

# Run only Discord tests
bun test e2e/discord.e2e.test.ts

# Run specific test by name
bun test e2e/slack.e2e.test.ts --test-name-pattern "message send"
```

## Running E2E Tests in CI (GitHub Actions)

### Required Secrets

Set these secrets in your GitHub repository settings:

#### Slack Secrets

| Secret | Description | How to Get |
|--------|-------------|------------|
| `E2E_SLACK_TOKEN` | Slack auth token (xoxc-...) | `agent-slack auth extract` → check output |
| `E2E_SLACK_COOKIE` | Slack cookie (xoxd-...) | Same as above |
| `E2E_SLACK_WORKSPACE_ID` | Test workspace ID | `agent-slack workspace current` |
| `E2E_SLACK_WORKSPACE_NAME` | Test workspace name | Same as above |

#### Discord Secrets

| Secret | Description | How to Get |
|--------|-------------|------------|
| `E2E_DISCORD_TOKEN` | Discord auth token | `agent-discord auth extract` → check output |
| `E2E_DISCORD_GUILD_ID` | Test guild ID | `agent-discord guild current` |

### Getting Credentials for CI

Run locally to extract credentials, then copy them to GitHub Secrets:

```bash
# Slack - extract and view credentials
agent-slack auth extract
cat ~/.agent-messenger/slack/credentials.json
# Copy token and cookie values

# Discord - extract and view credentials
agent-discord auth extract
cat ~/.agent-messenger/discord/credentials.json
# Copy token value
```

### Workflow Triggers

The E2E workflow (`.github/workflows/e2e.yml`) runs:

- **Manually**: Via `workflow_dispatch` (Actions tab → Run workflow)
- **On PRs**: When changes are made to `src/`, `e2e/`, or `package.json`

### Manual Trigger Options

When triggering manually, you can select which platform to test:

- `all` - Run both Slack and Discord tests (default)
- `slack` - Run only Slack tests
- `discord` - Run only Discord tests

## Test Coverage

### Slack Tests (23 tests)

| Command Group | Tests |
|---------------|-------|
| `auth` | status |
| `workspace` | list, current |
| `message` | send, list, get, update, delete, thread reply, replies, search |
| `channel` | list, list --type, info |
| `user` | list, me, info |
| `reaction` | add, list, remove |
| `file` | upload, list, list --channel, info |
| `snapshot` | default, --channels-only, --users-only, --limit |

### Discord Tests (20 tests)

| Command Group | Tests |
|---------------|-------|
| `auth` | status |
| `guild` | list, current, info |
| `message` | send, list, get*, delete |
| `channel` | list, info, history |
| `user` | list, me, info* |
| `reaction` | add*, list*, remove* |
| `file` | upload, list |
| `snapshot` | default, --channels-only, --users-only |

\* Some Discord tests are skipped because they require Bot Token permissions not available to user tokens.

## Troubleshooting

### "Wrong workspace" / "Wrong guild" Error

The tests detected you're not in the designated test workspace:

```
Error: Wrong Slack workspace. Expected: Agent Messenger (T0AC55BSF6E), Got: My Company (TXXXXXX)
```

**Solution**: Switch to the correct test workspace before running tests.

### Authentication Failed

```
Error: Slack authentication failed. Please run: agent-messenger slack auth login
```

**Solution**: 
1. Make sure the desktop app is running
2. Run `agent-slack auth extract` or `agent-discord auth extract`
3. For CI, check that secrets are correctly configured

### Rate Limiting

If tests fail intermittently with rate limit errors, try running fewer tests at once:

```bash
bun test e2e/slack.e2e.test.ts --test-name-pattern "auth"
```

The test harness includes automatic delays between API calls, but heavy testing may still hit limits.

### Orphaned Test Messages

If tests crash before cleanup, you may have leftover messages in the `e2e-test` channel. Clean them up manually:

```bash
# List recent messages
agent-slack message list e2e-test --limit 20 --pretty

# Delete specific message
agent-slack message delete e2e-test <timestamp> --force
```

### CI Environment Variables Not Working

Verify the credential managers are reading env vars:

```bash
# Test locally with env vars
E2E_SLACK_TOKEN=xoxc-test E2E_SLACK_COOKIE=xoxd-test bun -e "
  import { CredentialManager } from './src/platforms/slack/credential-manager.ts';
  const cm = new CredentialManager();
  const creds = await cm.getWorkspace();
  console.log(creds);
"
```

If this shows your test credentials, env var support is working.

## Safety Features

1. **Hardcoded Test IDs**: Test workspace/guild IDs are hardcoded in `config.ts`. Tests will refuse to run against other workspaces.

2. **Environment Validation**: Before any write operations, tests call `validateSlackEnvironment()` or `validateDiscordEnvironment()` to verify the correct workspace.

3. **Automatic Cleanup**: Tests track created messages and delete them in `afterEach` hooks.

4. **Rate Limiting**: Built-in delays between API calls prevent hitting rate limits.

## Adding New Tests

1. Follow existing patterns in `slack.e2e.test.ts` or `discord.e2e.test.ts`
2. Use helpers from `helpers.ts` for CLI execution
3. Track created resources for cleanup in `afterEach`
4. Add appropriate delays with `waitForRateLimit()`

Example:

```typescript
test('my new test', async () => {
  const testId = generateTestId()
  const { id } = await createTestMessage('slack', SLACK_TEST_CHANNEL_ID, `Test ${testId}`)
  testMessages.push(id)  // Track for cleanup
  
  await waitForRateLimit()
  
  // Your test assertions here
  const result = await runCLI('slack', ['some', 'command', id])
  expect(result.exitCode).toBe(0)
})
```
