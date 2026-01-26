import { Command } from 'commander'

export const snapshotCommand = new Command('snapshot')
  .description('snapshot commands')
  .action(() => {
    console.log('Not implemented')
  })
