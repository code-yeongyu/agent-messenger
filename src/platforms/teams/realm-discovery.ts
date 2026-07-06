import { GET_CREDENTIAL_TYPE_URL } from './app-config'
import type { TeamsAccountType } from './types'

// GetCredentialType (the endpoint Microsoft's own login page calls) reports
// EstsProperties.DomainType, which distinguishes a personal account from a
// work account before any device code is issued.
const DOMAIN_TYPE_CONSUMER = 2

interface CredentialTypeResponse {
  IfExistsResult?: number
  EstsProperties?: {
    DomainType?: number
    IsConsumerDomain?: boolean
  }
}

// Returns the account type for an email, or undefined when it can't be
// determined (network error, throttling, unknown domain) so the caller can
// fall back to its default flow rather than block sign-in.
export async function probeAccountType(email: string): Promise<TeamsAccountType | undefined> {
  let body: CredentialTypeResponse
  try {
    const res = await fetch(GET_CREDENTIAL_TYPE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Username: email }),
    })
    if (!res.ok) return undefined
    body = (await res.json()) as CredentialTypeResponse
  } catch {
    return undefined
  }

  const ests = body.EstsProperties
  if (ests?.DomainType === DOMAIN_TYPE_CONSUMER || ests?.IsConsumerDomain === true) {
    return 'personal'
  }
  if (typeof ests?.DomainType === 'number') {
    return 'work'
  }
  return undefined
}
