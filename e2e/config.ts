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
    throw new Error(
      `Wrong Slack workspace. Expected: ${SLACK_TEST_WORKSPACE_NAME} (${SLACK_TEST_WORKSPACE_ID}), ` +
      `Got: ${data?.workspace_name} (${data?.workspace_id})`
    )
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
    throw new Error(
      `Wrong Discord server. Expected: ${DISCORD_TEST_SERVER_NAME} (${DISCORD_TEST_SERVER_ID}), ` +
      `Got: ${data?.server_name} (${data?.server_id})`
    )
  }
}
