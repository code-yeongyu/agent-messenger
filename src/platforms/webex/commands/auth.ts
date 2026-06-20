import { readFileSync } from 'node:fs'
import { Writable } from 'node:stream'

import { Command } from 'commander'

import { collectBrowserProfileOption } from '@/shared/chromium'
import { handleError } from '@/shared/utils/error-handler'
import { isInteractive } from '@/shared/utils/interactive'
import { formatOutput } from '@/shared/utils/output'
import { info, debug, error as stderrError } from '@/shared/utils/stderr'

import { getWebexAppCredentials } from '../app-config'
import { WebexClient } from '../client'
import { WebexCredentialManager } from '../credential-manager'
import { loginWithPassword, WEB_CLIENT_ID, WEB_CLIENT_SECRET } from '../password-login'
import { WebexTokenExtractor } from '../token-extractor'
import { WebexError } from '../types'

interface ResolvedCredentials {
  clientId: string
  clientSecret: string
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('node:child_process')
  const command =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`
  exec(command)
}

async function promptText(message: string): Promise<string | undefined> {
  const { createInterface } = await import('node:readline/promises')
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  try {
    const answer = await rl.question(`${message}: `)
    return answer.trim() || undefined
  } finally {
    rl.close()
  }
}

async function promptHidden(message: string): Promise<string | undefined> {
  const { createInterface } = await import('node:readline/promises')
  const hiddenOutput = new (class extends Writable {
    muted = false
    _write(chunk: Buffer | string, encoding: BufferEncoding, cb: (error?: Error | null) => void): void {
      if (!this.muted) process.stdout.write(chunk, encoding)
      cb()
    }
  })()
  const rl = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true })
  try {
    hiddenOutput.muted = true
    process.stdout.write(`${message}: `)
    const answer = await rl.question('')
    process.stdout.write('\n')
    return answer.trim() || undefined
  } finally {
    hiddenOutput.muted = false
    rl.close()
  }
}

async function resolveClientCredentials(options: {
  clientId?: string
  clientSecret?: string
}): Promise<ResolvedCredentials> {
  // 1. CLI flags
  if (options.clientId || options.clientSecret) {
    if (!options.clientId || !options.clientSecret) {
      throw new Error('Both --client-id and --client-secret must be provided together.')
    }
    return { clientId: options.clientId, clientSecret: options.clientSecret }
  }

  // 2. Env vars → 3. Built-in defaults (always resolves)
  return getWebexAppCredentials()
}

interface LoginOptions {
  token?: string
  email?: string
  password?: string
  passwordStdin?: boolean
  idbrokerHost?: string
  pretty?: boolean
}

export async function loginAction(options: LoginOptions): Promise<void> {
  try {
    const credManager = new WebexCredentialManager()

    if (options.token) {
      await loginWithToken(credManager, options.token, options.pretty)
      return
    }

    if (options.password && options.passwordStdin) {
      throw new Error('Use only one of --password or --password-stdin.')
    }

    const interactive = isInteractive()

    let email = options.email
    if (!email) {
      if (!interactive) {
        console.log(
          formatOutput(
            {
              error:
                'Email required. Use --email <email> with --password or --password-stdin, ' +
                'or run "agent-webex auth oauth" for browser-based login.',
            },
            options.pretty,
          ),
        )
        process.exit(1)
        return
      }
      email = await promptText('Webex email')
      if (!email) {
        stderrError('Email is required.')
        process.exit(1)
        return
      }
    }

    let password = options.password
    if (!password && options.passwordStdin) {
      password = readFileSync(0, 'utf-8').replace(/\r?\n$/, '')
    }
    if (!password) {
      if (!interactive) {
        console.log(
          formatOutput(
            { error: 'Password required. Use --password or --password-stdin, or run interactively to be prompted.' },
            options.pretty,
          ),
        )
        process.exit(1)
        return
      }
      password = await promptHidden('Password')
      if (!password) {
        stderrError('Password is required.')
        process.exit(1)
        return
      }
    }

    await loginWithEmailPassword(credManager, email, password, options)
  } catch (error) {
    handleError(error as Error)
  }
}

async function loginWithToken(credManager: WebexCredentialManager, token: string, pretty?: boolean): Promise<void> {
  const client = await new WebexClient().login({ token })
  const person = await client.testAuth()
  await credManager.saveConfig({
    accessToken: token,
    refreshToken: '',
    expiresAt: 0,
    tokenType: 'manual',
  })
  console.log(
    formatOutput(
      {
        user: { id: person.id, displayName: person.displayName, emails: person.emails },
        authenticated: true,
      },
      pretty,
    ),
  )
}

async function loginWithEmailPassword(
  credManager: WebexCredentialManager,
  email: string,
  password: string,
  options: LoginOptions,
): Promise<void> {
  const config = await loginWithPassword(email, password, { idbrokerHost: options.idbrokerHost })

  await credManager.saveConfig({
    ...config,
    tokenType: 'password',
    clientId: WEB_CLIENT_ID,
    clientSecret: WEB_CLIENT_SECRET,
    encryptionKeys: {},
  })

  const client = await new WebexClient().login({
    token: config.accessToken,
    deviceUrl: config.deviceUrl,
    tokenType: 'password',
  })
  const person = await client.testAuth()

  console.log(
    formatOutput(
      {
        authenticated: true,
        user: { id: person.id, displayName: person.displayName, emails: person.emails },
      },
      options.pretty,
    ),
  )
}

interface OAuthOptions {
  deviceCode?: string
  clientId?: string
  clientSecret?: string
  pretty?: boolean
}

export async function oauthAction(options: OAuthOptions): Promise<void> {
  try {
    const credManager = new WebexCredentialManager()

    if (options.deviceCode) {
      await finishDeviceGrant(credManager, options)
      return
    }

    if (!isInteractive()) {
      await startNonInteractiveDeviceGrant(credManager, options)
      return
    }

    const { clientId, clientSecret } = await resolveClientCredentials(options)

    const device = await credManager.requestDeviceCode(clientId)

    info(`Open this URL and enter the code: ${device.verificationUri}`)
    info(`Code: ${device.userCode}`)
    info('')
    await openBrowser(device.verificationUriComplete)
    info('Waiting for authorization...')

    const config = await credManager.pollDeviceToken(
      device.deviceCode,
      device.interval,
      device.expiresIn,
      clientId,
      clientSecret,
    )

    await credManager.saveConfig({ ...config, clientId, clientSecret, tokenType: 'oauth' })

    const client = await new WebexClient().login({ token: config.accessToken })
    const person = await client.testAuth()

    console.log(
      formatOutput(
        {
          user: { id: person.id, displayName: person.displayName, emails: person.emails },
          authenticated: true,
        },
        options.pretty,
      ),
    )
  } catch (error) {
    handleError(error as Error)
  }
}

async function startNonInteractiveDeviceGrant(
  credManager: WebexCredentialManager,
  options: OAuthOptions,
): Promise<void> {
  const { clientId } = await resolveClientCredentials(options)
  const device = await credManager.requestDeviceCode(clientId)
  const expiresAt = Date.now() + device.expiresIn * 1000

  console.log(
    formatOutput(
      {
        next_action: 'authorize_in_browser',
        verification_uri: device.verificationUri,
        verification_uri_complete: device.verificationUriComplete,
        user_code: device.userCode,
        device_code: device.deviceCode,
        expires_at: expiresAt,
        message:
          'Show the user `verification_uri` and `user_code` (or just `verification_uri_complete`) and ask them to approve access in any browser. After they approve, run `agent-webex auth oauth --device-code <device_code>` to retrieve the token. The device code expires at `expires_at`. If you passed `--client-id`/`--client-secret`, pass them again on the second call.',
      },
      options.pretty,
    ),
  )
  process.exit(0)
}

async function finishDeviceGrant(credManager: WebexCredentialManager, options: OAuthOptions): Promise<void> {
  const { clientId, clientSecret } = await resolveClientCredentials(options)
  const result = await credManager.exchangeDeviceCode(options.deviceCode!, clientId, clientSecret)

  if (result.status === 'success') {
    await credManager.saveConfig({ ...result.config, clientId, clientSecret, tokenType: 'oauth' })
    const client = await new WebexClient().login({ token: result.config.accessToken })
    const person = await client.testAuth()
    console.log(
      formatOutput(
        {
          authenticated: true,
          user: { id: person.id, displayName: person.displayName, emails: person.emails },
        },
        options.pretty,
      ),
    )
    return
  }

  if (result.status === 'pending') {
    console.log(
      formatOutput(
        {
          next_action: 'still_pending',
          device_code: options.deviceCode,
          message:
            'User has not approved access yet. Confirm with the user that they completed authorization in the browser, then run `agent-webex auth oauth --device-code <device_code>` again to retry.',
        },
        options.pretty,
      ),
    )
    process.exit(0)
    return
  }

  console.log(
    formatOutput(
      {
        next_action: 'restart',
        error: result.status === 'expired' ? 'Device code expired.' : `Device code exchange failed: ${result.message}`,
        message: 'This device code is no longer valid. Run `agent-webex auth oauth` to start a new login.',
      },
      options.pretty,
    ),
  )
  process.exit(1)
}

export async function statusAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new WebexCredentialManager()
    const config = await credManager.loadConfig()
    const token = await credManager.getToken(config?.clientId, config?.clientSecret)

    if (!token) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth login" first.' }, options.pretty))
      process.exit(1)
      return
    }

    try {
      const client = await new WebexClient().login({ token })
      const person = await client.testAuth()
      console.log(
        formatOutput(
          {
            authenticated: true,
            user: { id: person.id, displayName: person.displayName, emails: person.emails },
          },
          options.pretty,
        ),
      )
    } catch {
      console.log(formatOutput({ authenticated: false, user: null }, options.pretty))
    }
  } catch (error) {
    handleError(error as Error)
  }
}

export async function extractAction(options: {
  pretty?: boolean
  debug?: boolean
  browserProfile?: string[]
}): Promise<void> {
  try {
    const debugLog = options.debug ? (msg: string) => debug(`[debug] ${msg}`) : undefined
    const extractor = new WebexTokenExtractor(undefined, debugLog, undefined, options.browserProfile)

    if (options.debug) {
      debug('[debug] Searching browser profiles for Webex tokens...')
    }

    const extracted = await extractor.extract()

    if (!extracted) {
      console.log(
        formatOutput(
          {
            error:
              'No Webex token found in any browser. Make sure you are logged in at https://web.webex.com (not webex.com) in Chrome, Edge, Arc, or Brave.',
            hint: 'Run "auth oauth" for OAuth Device Grant flow, or --debug for more info.',
          },
          options.pretty,
        ),
      )
      process.exit(1)
      return
    }

    const isExpired = extracted.expiresAt != null && extracted.expiresAt > 0 && extracted.expiresAt < Date.now()
    if (isExpired && options.debug) {
      const agoMs = Date.now() - extracted.expiresAt!
      const agoHours = Math.round(agoMs / 3_600_000)
      debugLog?.(`Token expired ${agoHours > 0 ? `${agoHours}h ago` : 'recently'}.`)
    }

    let activeToken = extracted.accessToken
    let refreshedConfig: { accessToken: string; refreshToken: string; expiresAt: number } | null = null

    if (isExpired && extracted.refreshToken) {
      debugLog?.('Attempting token refresh...')
      const credManager = new WebexCredentialManager()
      const { clientId, clientSecret } = getWebexAppCredentials()
      refreshedConfig = await credManager.refreshToken(extracted.refreshToken, clientId, clientSecret)
      if (refreshedConfig) {
        debugLog?.('Token refreshed successfully.')
        activeToken = refreshedConfig.accessToken
      } else {
        debugLog?.('Token refresh failed. Will attempt validation with expired token.')
      }
    }

    const client = await new WebexClient().login({
      token: activeToken,
      deviceUrl: extracted.deviceUrl,
      tokenType: 'extracted',
    })

    let person: { id: string; displayName: string; emails: string[] } | null = null
    try {
      const result = await client.testAuth()
      if (result.id) {
        person = { id: result.id, displayName: result.displayName, emails: result.emails }
      }
    } catch (authError) {
      const isAuthFailure =
        authError instanceof WebexError && (authError.code === 'http_401' || authError.code === 'http_403')
      if (isExpired && isAuthFailure) {
        console.log(
          formatOutput(
            {
              error: 'Extracted browser token is expired and could not be refreshed.',
              hint: 'Log in at https://web.webex.com (not webex.com) in your browser, then run "auth extract" again. Or use "auth oauth" for OAuth Device Grant flow.',
            },
            options.pretty,
          ),
        )
        process.exit(1)
        return
      }
      throw authError
    }

    const credManager = new WebexCredentialManager()
    await credManager.saveConfig({
      accessToken: activeToken,
      refreshToken: refreshedConfig?.refreshToken ?? extracted.refreshToken ?? '',
      expiresAt: refreshedConfig?.expiresAt ?? extracted.expiresAt ?? 0,
      tokenType: 'extracted',
      deviceUrl: extracted.deviceUrl,
      userId: extracted.userId,
      encryptionKeys: extracted.encryptionKeys ? Object.fromEntries(extracted.encryptionKeys) : undefined,
    })

    const output: Record<string, unknown> = {
      authenticated: true,
      tokenType: 'extracted',
    }
    if (refreshedConfig) {
      output['refreshed'] = true
    }
    if (person) {
      output['user'] = person
    }

    console.log(formatOutput(output, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export async function logoutAction(options: { pretty?: boolean }): Promise<void> {
  try {
    const credManager = new WebexCredentialManager()
    const config = await credManager.loadConfig()

    if (!config) {
      console.log(formatOutput({ error: 'Not authenticated. Run "auth login" first.' }, options.pretty))
      process.exit(1)
      return
    }

    await credManager.clearCredentials()
    console.log(formatOutput({ removed: 'webex', success: true }, options.pretty))
  } catch (error) {
    handleError(error as Error)
  }
}

export const authCommand = new Command('auth')
  .description('Authentication commands')
  .addCommand(
    new Command('login')
      .description(
        'Log in to Webex with your email and password (first-party token, messages appear as you). ' +
          'Run with no flags in a terminal to be prompted for email and password. ' +
          'Pass --token for a bot or personal access token. For browser-based OAuth, use `auth oauth`.',
      )
      .option('--email <email>', 'Webex email address (prompted if omitted in a terminal)')
      .option('--password <password>', 'Password for --email login (prompted securely if omitted in a terminal)')
      .option('--password-stdin', 'Read the password for --email login from stdin')
      .option('--idbroker-host <host>', 'Override IdBroker host for email/password login')
      .option('--token <token>', 'Use a bot token or personal access token directly')
      .option('--pretty', 'Pretty print JSON output')
      .action(loginAction),
  )
  .addCommand(
    new Command('oauth')
      .description(
        'Log in to Webex via OAuth Device Grant. In a TTY this opens a browser and waits for approval. ' +
          'When non-interactive (AI agents, CI/CD): the first call starts the flow and returns a verification ' +
          'URL, user code, and device code. After the user approves in a browser, call again with --device-code ' +
          'to exchange it for a token.',
      )
      .option(
        '--device-code <code>',
        'OAuth Device Grant code returned from a previous non-interactive `auth oauth` call',
      )
      .option('--client-id <id>', 'Webex Integration client ID')
      .option('--client-secret <secret>', 'Webex Integration client secret')
      .option('--pretty', 'Pretty print JSON output')
      .action(oauthAction),
  )
  .addCommand(
    new Command('extract')
      .description('Extract Webex token from browser (Chrome, Edge, Arc, Brave)')
      .option('--pretty', 'Pretty print JSON output')
      .option('--debug', 'Show debug output')
      .option(
        '--browser-profile <path>',
        'Additional Chromium profile/user-data directory to scan (repeatable, comma-separated supported)',
        collectBrowserProfileOption,
        [],
      )
      .action(extractAction),
  )
  .addCommand(
    new Command('status')
      .description('Show authentication status')
      .option('--pretty', 'Pretty print JSON output')
      .action(statusAction),
  )
  .addCommand(
    new Command('logout')
      .description('Logout from Webex')
      .option('--pretty', 'Pretty print JSON output')
      .action(logoutAction),
  )
