import { Command } from 'commander'
import { DiscordClient } from '../client'
import { DiscordCredentialManager } from '../credential-manager'

export const friendCommand = new Command('friend')
  .description('Manage Discord relationships (friends)')
  .addCommand(
    new Command('list')
      .description('List all relationships')
      .option('--pretty', 'Pretty print output')
      .action(async (options) => {
        const credManager = new DiscordCredentialManager()
        const config = await credManager.load()

        if (!config.token) {
          throw new Error('No Discord token found. Run auth extract first.')
        }

        const client = new DiscordClient(config.token)

        const relationships = await client.getRelationships()

        if (options.pretty) {
          const typeNames: Record<number, string> = {
            1: 'Friend',
            2: 'Blocked',
            3: 'Incoming Request',
            4: 'Outgoing Request',
          }

          console.log(`\nRelationships (${relationships.length}):\n`)
          for (const rel of relationships) {
            const displayName = rel.user.global_name || rel.user.username
            const nickname = rel.nickname ? ` (${rel.nickname})` : ''
            const type = typeNames[rel.type] || `Type ${rel.type}`
            console.log(`  ${displayName}${nickname} - ${type}`)
            console.log(`    ID: ${rel.user.id}`)
            console.log(`    Username: ${rel.user.username}`)
            console.log()
          }
        } else {
          console.log(JSON.stringify(relationships, null, 2))
        }
      })
  )
