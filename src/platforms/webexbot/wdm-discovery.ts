import type { FetchFunction, FetchRequest, FetchResponse } from 'webex-message-handler'

import { WebexBotError } from './types'

const U2C_CATALOG_URL = 'https://u2c.wbx2.com/u2c/api/v1/catalog?format=hostmap'
const HARDCODED_WDM_DEVICES_URL = 'https://wdm-a.wbx2.com/wdm/api/v1/devices'

// webex-message-handler hardcodes the WDM cluster to wdm-a. A bot whose org lives
// on another cluster (e.g. wdm-r) registers its device on the wrong cluster, so
// Webex never routes conversation activities to its Mercury socket — the socket
// connects but no messages arrive. The U2C catalog returns the correct WDM cluster
// for the token; rewriting the device-registration request to it makes the bot
// receive real-time events.
export async function discoverWdmDevicesUrl(token: string): Promise<string> {
  const response = await fetch(U2C_CATALOG_URL, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    throw new WebexBotError(`Failed to discover Webex WDM cluster: HTTP ${response.status}`, 'wdm_discovery_failed')
  }

  const catalog = (await response.json()) as { serviceLinks?: { wdm?: string } }
  const wdm = catalog.serviceLinks?.wdm
  if (!wdm) {
    throw new WebexBotError('Webex U2C catalog did not include serviceLinks.wdm', 'wdm_discovery_failed')
  }

  return `${wdm.replace(/\/$/, '')}/devices`
}

export function createWdmRewriteFetch(wdmDevicesUrl: string): FetchFunction {
  return async (req: FetchRequest): Promise<FetchResponse> => {
    const url = req.url.startsWith(HARDCODED_WDM_DEVICES_URL)
      ? wdmDevicesUrl + req.url.slice(HARDCODED_WDM_DEVICES_URL.length)
      : req.url

    const res = await fetch(url, { method: req.method, headers: req.headers, body: req.body })
    return {
      status: res.status,
      ok: res.ok,
      json: () => res.json(),
      text: () => res.text(),
    }
  }
}
