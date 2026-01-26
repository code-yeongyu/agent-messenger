import { Command } from 'commander'

export const messageCommand = new Command('message').description('message commands').action(() => {
  console.log('Not implemented')
})
