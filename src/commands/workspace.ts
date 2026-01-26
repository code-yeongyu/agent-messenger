import { Command } from 'commander'

export const workspaceCommand = new Command('workspace')
  .description('Workspace management commands')
  .addCommand(
    new Command('list').description('List all workspaces').action(() => {
      console.log('Not implemented')
    })
  )
  .addCommand(
    new Command('switch')
      .description('Switch to workspace')
      .argument('<id>', 'Workspace ID')
      .action(() => {
        console.log('Not implemented')
      })
  )
  .addCommand(
    new Command('current').description('Show current workspace').action(() => {
      console.log('Not implemented')
    })
  )
