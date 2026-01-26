import { Command } from 'commander'

export const reactionCommand = new Command('reaction')
  .description('reaction commands')
  .action(() => {
    console.log('Not implemented')
  })
