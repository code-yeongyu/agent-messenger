import { Command } from 'commander'
import { TokenExtractor } from '../lib/token-extractor'
import { CredentialManager } from '../lib/credential-manager'
import { SlackClient } from '../lib/slack-client'
import { formatOutput } from '../utils/output'
import { handleError } from '../utils/error-handler'

async function extractAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const extractor = new TokenExtractor()
    const workspaces = await extractor.extract()

    if (workspaces.length === 0) {
      console.log(
        formatOutput(
          { error: 'No workspaces found. Make sure Slack desktop app is installed and logged in.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    const credManager = new CredentialManager()
    const config = await credManager.load()

    for (const ws of workspaces) {
      await credManager.setWorkspace(ws)
    }

    if (!config.current_workspace && workspaces.length > 0) {
      await credManager.setCurrentWorkspace(workspaces[0].workspace_id)
    }

    const output = {
      workspaces: workspaces.map((ws) => `${ws.workspace_id}/${ws.workspace_name}`),
      current: config.current_workspace || workspaces[0].workspace_id,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function logoutAction(
  workspace: string | undefined,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const config = await credManager.load()

    let targetWorkspace = workspace

    if (!targetWorkspace) {
      if (!config.current_workspace) {
        console.log(
          formatOutput(
            { error: 'No current workspace set. Specify a workspace ID.' },
            options.pretty
          )
        )
        process.exit(1)
      }
      targetWorkspace = config.current_workspace
    }

    if (!config.workspaces[targetWorkspace]) {
      console.log(
        formatOutput({ error: `Workspace not found: ${targetWorkspace}` }, options.pretty)
      )
      process.exit(1)
    }

    await credManager.removeWorkspace(targetWorkspace)

    console.log(formatOutput({ removed: targetWorkspace, success: true }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function statusAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const ws = await credManager.getWorkspace()

    if (!ws) {
      console.log(
        formatOutput(
          { error: 'No workspace configured. Run "auth extract" first.' },
          options.pretty
        )
      )
      process.exit(1)
    }

    let authInfo: { user_id: string; team_id: string; user?: string; team?: string } | null = null
    let valid = false

    try {
      const client = new SlackClient(ws.token, ws.cookie)
      authInfo = await client.testAuth()
      valid = true
    } catch {
      valid = false
    }

    const output = {
      workspace_id: ws.workspace_id,
      workspace_name: ws.workspace_name,
      user: authInfo?.user,
      team: authInfo?.team,
      valid,
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const authCommand = new Command('auth')
  .description('Authentication commands')
  .addCommand(
    new Command('extract')
      .description('Extract tokens from Slack desktop app')
      .option('--pretty', 'Pretty print JSON output')
      .action(extractAction)
  )
  .addCommand(
    new Command('logout')
      .description('Logout from workspace')
      .argument('[workspace]', 'Workspace ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(logoutAction)
  )
  .addCommand(
    new Command('status')
      .description('Show authentication status')
      .option('--pretty', 'Pretty print JSON output')
      .action(statusAction)
  )
