import { WebexListener } from '../webex/listener'
import { WebexError } from '../webex/types'
import { WebexBotError } from './types'

export type {
  WebexListenerClient as WebexBotListenerClient,
  WebexListenerOptions as WebexBotListenerOptions,
} from '../webex/listener'

export class WebexBotListener extends WebexListener {
  // Preserve the bot error contract: WDM discovery (shared with the user platform)
  // throws WebexError, but existing bot callers catch WebexBotError.
  async start(): Promise<void> {
    try {
      await super.start()
    } catch (error) {
      if (error instanceof WebexError) {
        throw new WebexBotError(error.message, error.code)
      }
      throw error
    }
  }
}
