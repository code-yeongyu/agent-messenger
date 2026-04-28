import { Command } from 'commander'

import { getPolicyEngine } from '@/policy/engine'
import { resolveSlackChannelTarget } from '@/policy/platform-mappers/slack'
import type { PolicyTarget } from '@/policy/types'
import { handleError } from '@/shared/utils/error-handler'
import { formatOutput } from '@/shared/utils/output'

import { SlackClient } from '../client'
import { CredentialManager } from '../credential-manager'
import type { SlackDraft } from '../types'

type LoadedPolicyEngine = Awaited<ReturnType<typeof getPolicyEngine>>

async function filterDraftsByReadPolicy(
  client: SlackClient,
  engine: LoadedPolicyEngine,
  drafts: SlackDraft[],
): Promise<SlackDraft[]> {
  const targetByChannel = new Map<string, PolicyTarget>()
  const visibleDrafts: SlackDraft[] = []

  for (const draft of drafts) {
    if (!draft.channel_id) {
      visibleDrafts.push(draft)
      continue
    }

    let target = targetByChannel.get(draft.channel_id)
    if (!target) {
      target = await resolveSlackChannelTarget(client, engine, draft.channel_id, 'read')
      targetByChannel.set(draft.channel_id, target)
    }

    if (!engine.isDenied('slack', 'read', target)) {
      visibleDrafts.push(draft)
    }
  }

  return visibleDrafts
}

async function listAction(options: { limit?: number; cursor?: string; pretty?: boolean }): Promise<void> {
  try {
    const credManager = new CredentialManager()
    const workspace = await credManager.getWorkspace()

    if (!workspace) {
      console.log(formatOutput({ error: 'No current workspace set. Run "auth extract" first.' }, options.pretty))
      process.exit(1)
    }

    const client = await new SlackClient().login({ token: workspace.token, cookie: workspace.cookie })
    const result = await client.getDrafts(options.cursor)
    const engine = await getPolicyEngine()

    let drafts = await filterDraftsByReadPolicy(client, engine, result.drafts)

    if (options.limit) {
      drafts = drafts.slice(0, options.limit)
    }

    const output = drafts.map((draft) => ({
      id: draft.id,
      channel_id: draft.channel_id,
      text: draft.message?.text || '',
      date_created: draft.date_created,
      date_updated: draft.date_updated,
    }))

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const draftsCommand = new Command('drafts').description('Drafts commands').addCommand(
  new Command('list')
    .description('List message drafts')
    .option('--limit <n>', 'Number of drafts to display')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--pretty', 'Pretty print JSON output')
    .action((options) => {
      listAction({
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
        cursor: options.cursor,
        pretty: options.pretty,
      })
    }),
)
