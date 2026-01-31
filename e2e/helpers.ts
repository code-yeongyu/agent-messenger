import { $ } from 'bun'

export interface CLIResult {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCLI(platform: string, args: string[]): Promise<CLIResult> {
  const command = platform === 'slack' ? 'agent-slack' : 'agent-discord'
  
  try {
    const result = await $`${command} ${args}`.quiet()
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    }
  } catch (error: any) {
    return {
      exitCode: error.exitCode || 1,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
    }
  }
}

export function parseJSON<T>(output: string): T | null {
  try {
    return JSON.parse(output) as T
  } catch {
    return null
  }
}

export function generateTestId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

export async function createTestMessage(
  platform: string,
  channel: string,
  text: string
): Promise<{ id: string }> {
  const result = await runCLI(platform, ['message', 'send', channel, text])
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create test message: ${result.stderr}`)
  }
  
  const data = parseJSON<{ ts?: string; id?: string }>(result.stdout)
  const messageId = data?.ts || data?.id
  if (!messageId) {
    throw new Error('No message ID returned')
  }
  
  return { id: messageId }
}

export async function deleteTestMessage(
  platform: string,
  channel: string,
  messageId: string
): Promise<void> {
  await runCLI(platform, ['message', 'delete', channel, messageId, '--force'])
}

export async function waitForRateLimit(ms: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export async function cleanupMessages(
  platform: string,
  channel: string,
  messageIds: string[]
): Promise<void> {
  for (const id of messageIds) {
    try {
      await deleteTestMessage(platform, channel, id)
      await waitForRateLimit(500)
    } catch (error) {
      console.warn(`Failed to cleanup message ${id}:`, error)
    }
  }
}
