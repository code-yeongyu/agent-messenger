import { Command } from 'commander'

import { cliOutput } from '@/shared/utils/cli-output'

import { WebexBotListener } from '../listener'
import type { WebexBotListenerEventMap } from '../types'
import type { BotOption } from './shared'
import { getClient } from './shared'

type ListenEvent = keyof WebexBotListenerEventMap

const SUPPORTED_EVENTS = new Set<ListenEvent>([
  'message_created',
  'message_updated',
  'message_deleted',
  'membership_created',
  'attachment_action',
  'room_created',
  'room_updated',
  'webex_event',
  'connected',
  'reconnecting',
  'disconnected',
  'error',
])

const DEFAULT_EVENTS: ListenEvent[] = [
  'message_created',
  'message_updated',
  'message_deleted',
  'membership_created',
  'attachment_action',
  'connected',
  'reconnecting',
  'disconnected',
  'error',
]

interface ListenOptions extends BotOption {
  events?: string
}

function printEvent(type: string, payload: unknown, pretty?: boolean): void {
  const line = payload === undefined ? { type } : { type, payload }
  console.log(JSON.stringify(line, null, pretty ? 2 : undefined))
}

export function parseEvents(events?: string): ListenEvent[] {
  if (!events) return DEFAULT_EVENTS

  const tokens = events
    .split(',')
    .map((event) => event.trim())
    .filter((event) => event.length > 0)

  const unknown = tokens.filter((event) => !SUPPORTED_EVENTS.has(event as ListenEvent))
  if (unknown.length > 0) {
    const supported = [...SUPPORTED_EVENTS].join(', ')
    throw new Error(`Unknown event(s): ${unknown.join(', ')}. Supported events: ${supported}`)
  }

  return tokens as ListenEvent[]
}

export async function listenAction(options: ListenOptions): Promise<void> {
  let events: ListenEvent[]
  try {
    events = parseEvents(options.events)
  } catch (error) {
    cliOutput({ error: (error as Error).message }, options.pretty, true)
    return
  }

  const client = await getClient(options)
  const listener = new WebexBotListener(client)

  for (const event of events) {
    if (event === 'error') {
      listener.on(event, (error) => printEvent(event, { message: error.message, name: error.name }, options.pretty))
      continue
    }
    listener.on(event, (payload) => printEvent(event, payload, options.pretty))
  }

  process.once('SIGINT', () => {
    void listener.stop().finally(() => process.exit(0))
  })

  try {
    await listener.start()
  } catch (error) {
    printEvent('error', { message: (error as Error).message, name: (error as Error).name }, options.pretty)
    process.exit(1)
  }
}

export const listenCommand = new Command('listen')
  .description('Listen for real-time Webex bot events')
  .option('--events <list>', 'Comma-separated event filter')
  .option('--bot <id>', 'Use specific bot')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (opts: ListenOptions) => {
    await listenAction(opts)
  })
