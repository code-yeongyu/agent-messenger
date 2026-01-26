import { Command } from 'commander'

export const authCommand = new Command('auth')
  .description('Authentication commands')
  .addCommand(
    new Command('extract').description('Extract tokens from Slack desktop app').action(() => {
      console.log('Not implemented')
    })
  )
  .addCommand(
    new Command('logout')
      .description('Logout from workspace')
      .argument('[workspace]', 'Workspace ID')
      .action(() => {
        console.log('Not implemented')
      })
  )
  .addCommand(
    new Command('status').description('Show authentication status').action(() => {
      console.log('Not implemented')
    })
  )
