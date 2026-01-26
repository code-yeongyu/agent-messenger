import { Command } from 'commander'

export const userCommand = new Command('user').description('user commands').action(() => {
  console.log('Not implemented')
})
