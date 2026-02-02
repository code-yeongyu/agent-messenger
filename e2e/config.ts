export const SLACK_TEST_WORKSPACE_ID = 'T0AC55BSF6E'
export const SLACK_TEST_WORKSPACE_NAME = 'Agent Messenger'
export const SLACK_TEST_CHANNEL_ID = 'C0ACZKTDDC0'
export const SLACK_TEST_CHANNEL = 'e2e-test'

// Discord Test Environment
export const DISCORD_TEST_SERVER_ID = '1467039439770357844'
export const DISCORD_TEST_SERVER_NAME = 'Agent Messenger'
export const DISCORD_TEST_CHANNEL_ID = '1467062262996144162'
export const DISCORD_TEST_CHANNEL = 'e2e-test'

export async function validateSlackEnvironment() {
  const { runCLI, parseJSON } = await import('./helpers')
  
  const result = await runCLI('slack', ['auth', 'status'])
  if (result.exitCode !== 0) {
    throw new Error('Slack authentication failed. Please run: agent-messenger slack auth login')
  }
  
  const data = parseJSON<{ workspace_id: string; workspace_name: string }>(result.stdout)
  if (data?.workspace_id !== SLACK_TEST_WORKSPACE_ID) {
    const switchResult = await runCLI('slack', ['workspace', 'switch', SLACK_TEST_WORKSPACE_ID])
    if (switchResult.exitCode !== 0) {
      throw new Error(
        `Failed to switch to test workspace. Expected: ${SLACK_TEST_WORKSPACE_NAME} (${SLACK_TEST_WORKSPACE_ID}). ` +
        `Make sure you have access to the test workspace.`
      )
    }
  }
}

export async function validateDiscordEnvironment() {
  const { runCLI, parseJSON } = await import('./helpers')
  
  const result = await runCLI('discord', ['auth', 'status'])
  if (result.exitCode !== 0) {
    throw new Error('Discord authentication failed. Please run: agent-messenger discord auth login')
  }
  
  const currentResult = await runCLI('discord', ['server', 'current'])
  const data = parseJSON<{ server_id: string; server_name: string }>(currentResult.stdout)
  if (data?.server_id !== DISCORD_TEST_SERVER_ID) {
    const switchResult = await runCLI('discord', ['server', 'switch', DISCORD_TEST_SERVER_ID])
    if (switchResult.exitCode !== 0) {
      throw new Error(
        `Failed to switch to test server. Expected: ${DISCORD_TEST_SERVER_NAME} (${DISCORD_TEST_SERVER_ID}). ` +
        `Make sure you have access to the test server.`
      )
    }
  }
}
