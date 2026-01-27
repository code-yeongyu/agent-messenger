import { Command } from 'commander'
import { CredentialManager } from '../lib/credential-manager'
import { RefManager } from '../lib/ref-manager'
import { SlackClient } from '../lib/slack-client'
import { handleError } from '../utils/error-handler'
import { formatOutput } from '../utils/output'

const refManager = new RefManager()

async function getClient(pretty?: boolean): Promise<SlackClient | null> {
  const credManager = new CredentialManager()
  const workspace = await credManager.getWorkspace()

  if (!workspace) {
    console.log(
      formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, pretty)
    )
    return null
  }

  return new SlackClient(workspace.token, workspace.cookie)
}

export const userCommand = new Command('user')
  .description('user commands')
  .addCommand(
    new Command('list')
      .description('list workspace users')
      .option('--include-bots', 'include bot users')
      .option('--pretty', 'pretty-print JSON output')
      .action(async (options) => {
        try {
          const client = await getClient(options.pretty)
          if (!client) return process.exit(1)

          const users = await client.listUsers()

          const filtered = options.includeBots ? users : users.filter((u) => !u.is_bot)

          const output = filtered.map((user) => ({
            ref: refManager.assignUserRef(user),
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            is_admin: user.is_admin,
            is_owner: user.is_owner,
            is_bot: user.is_bot,
            is_app_user: user.is_app_user,
            profile: user.profile,
          }))

          console.log(formatOutput(output, options.pretty))
        } catch (error) {
          handleError(error as Error)
        }
      })
  )
  .addCommand(
    new Command('info')
      .description('show user details')
      .argument('<user>', 'user ID or ref (e.g., U123 or @u1)')
      .option('--pretty', 'pretty-print JSON output')
      .action(async (userArg, options) => {
        try {
          const client = await getClient(options.pretty)
          if (!client) return process.exit(1)

          let userId = userArg
          if (userArg.startsWith('@u')) {
            const resolved = refManager.resolveRef(userArg)
            if (!resolved || resolved.type !== 'user') {
              throw new Error(`Invalid user ref: ${userArg}`)
            }
            userId = resolved.id
          }

          const user = await client.getUser(userId)
          const ref = refManager.assignUserRef(user)

          const output = {
            ref,
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            is_admin: user.is_admin,
            is_owner: user.is_owner,
            is_bot: user.is_bot,
            is_app_user: user.is_app_user,
            profile: user.profile,
          }

          console.log(formatOutput(output, options.pretty))
        } catch (error) {
          handleError(error as Error)
        }
      })
  )
  .addCommand(
    new Command('me')
      .description('show current authenticated user')
      .option('--pretty', 'pretty-print JSON output')
      .action(async (options) => {
        try {
          const client = await getClient(options.pretty)
          if (!client) return process.exit(1)
          const authInfo = await client.testAuth()
          const user = await client.getUser(authInfo.user_id)
          const ref = refManager.assignUserRef(user)

          const output = {
            ref,
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            is_admin: user.is_admin,
            is_owner: user.is_owner,
            is_bot: user.is_bot,
            is_app_user: user.is_app_user,
            profile: user.profile,
          }

          console.log(formatOutput(output, options.pretty))
        } catch (error) {
          handleError(error as Error)
        }
      })
  )
