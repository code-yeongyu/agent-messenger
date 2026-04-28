import { Command } from 'commander'

import { editCommand } from './edit'
import { showCommand } from './show'
import { validateCommand } from './validate'

export const policyCommand = new Command('policy')
  .description('Manage agent-messenger access control policy')
  .addCommand(showCommand)
  .addCommand(validateCommand)
  .addCommand(editCommand)
