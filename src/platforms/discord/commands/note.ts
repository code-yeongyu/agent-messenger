import { Command } from 'commander'
import { handleError } from '../../../shared/utils/error-handler'
import { formatOutput } from '../../../shared/utils/output'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

async function getAction(userId: string, options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    const note = await client.getUserNote(userId)

    if (!note) {
      console.log(formatOutput({ user_id: userId, note: null }, options.pretty))
      return
    }

    console.log(formatOutput(note, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

async function setAction(
  userId: string,
  note: string,
  options: { pretty?: boolean }
): Promise<void> {
  try {
    const credManager = new DiscordCredentialManager()
    const config = await credManager.load()

    if (!config.token) {
      console.log(
        formatOutput({ error: 'Not authenticated. Run "auth extract" first.' }, options.pretty)
      )
      process.exit(1)
    }

    const client = new DiscordClient(config.token)
    await client.setUserNote(userId, note)

    console.log(formatOutput({ success: true, user_id: userId, note }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const noteCommand = new Command('note')
  .description('User note commands')
  .addCommand(
    new Command('get')
      .description('Get note for a user')
      .argument('<user_id>', 'User ID')
      .option('--pretty', 'Pretty print JSON output')
      .action(getAction)
  )
  .addCommand(
    new Command('set')
      .description('Set note for a user')
      .argument('<user_id>', 'User ID')
      .argument('<note>', 'Note text')
      .option('--pretty', 'Pretty print JSON output')
      .action(setAction)
  )
