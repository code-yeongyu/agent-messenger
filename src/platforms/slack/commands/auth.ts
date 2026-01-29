import { Command } from 'commander'
import { CredentialManager } from '../credential-manager'
import { SlackClient } from '../client'
import { TokenExtractor } from '../token-extractor'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'

async function extractAction(options: { pretty?: boolean; debug?: boolean }): Promise<void> {
  try {
    const extractor = new TokenExtractor()

    if (options.debug) {
      console.error(`[debug] Slack directory: ${extractor.getSlackDir()}`)
    }

    const workspaces = await extractor.extract()

    if (options.debug) {
      console.error(`[debug] Found ${workspaces.length} workspace(s)`)
      for (const ws of workspaces) {
        console.error(
          `[debug] - ${ws.workspace_id}: token=${ws.token.substring(0, 20)}..., cookie=${ws.cookie ? 'present' : 'missing'}`
        )
      }
    }

    if (workspaces.length === 0) {
      console.log(
        formatOutput(
          {
            error: 'No workspaces found. Make sure Slack desktop app is installed and logged in.',
            hint: options.debug ? undefined : 'Run with --debug for more info.',
          },
          options.pretty
        )
      )
      process.exit(1)
    }

    const credManager = new CredentialManager()
    const config = await credManager.load()

    const validWorkspaces = []
    for (const ws of workspaces) {
      if (options.debug) {
        console.error(`[debug] Testing credentials for ${ws.workspace_id}...`)
      }

      try {
        const client = new SlackClient(ws.token, ws.cookie)
        const authInfo = await client.testAuth()
        ws.workspace_name = authInfo.team || ws.workspace_name
        validWorkspaces.push(ws)
        await credManager.setWorkspace(ws)

        if (options.debug) {
          console.error(`[debug] ✓ Valid: ${authInfo.team} (${authInfo.user})`)
        }
      } catch (error) {
        if (options.debug) {
          console.error(`[debug] ✗ Invalid: ${(error as Error).message}`)
        }
      }
    }

    if (validWorkspaces.length === 0) {
      console.log(
        formatOutput(
          {
            error:
              'Extracted tokens are invalid. Make sure you are logged into the Slack desktop app.',
            extracted_count: workspaces.length,
          },
          options.pretty
        )
      )
      process.exit(1)
    }

    if (!config.current_workspace && validWorkspaces.length > 0) {
      await credManager.setCurrentWorkspace(validWorkspaces[0].workspace_id)
    }

    const output = {
      workspaces: validWorkspaces.map((ws) => `${ws.workspace_id}/${ws.workspace_name}`),
      current: config.current_workspace || validWorkspaces[0].workspace_id,
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
      .option('--debug', 'Show debug output for troubleshooting')
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
