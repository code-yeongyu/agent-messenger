import Link from 'next/link'

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Key icon</title>
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Globe icon</title>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Bot icon</title>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M8 16h.01M16 16h.01" />
      <path d="M9 12h6" />
    </svg>
  )
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Zap icon</title>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Slack icon</title>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.522 2.521A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.522-2.522v-2.522h2.522zM15.166 17.688a2.527 2.527 0 0 1-2.522-2.52 2.527 2.527 0 0 1 2.522-2.522h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.522h-6.312z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Discord icon</title>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.719 13.719 0 0 0-.621 1.281 18.337 18.337 0 0 0-7.464 0 14.155 14.155 0 0 0-.624-1.28.076.076 0 0 0-.079-.037 19.761 19.761 0 0 0-4.887 1.515.071.071 0 0 0-.03.028C.533 9.046-.32 13.58.099 18.057a.083.083 0 0 0 .032.056 19.907 19.907 0 0 0 5.992 3.018.078.078 0 0 0 .085-.027 13.882 13.882 0 0 0 1.226-1.994.075.075 0 0 0-.041-.106 13.09 13.09 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.16 10.16 0 0 0 .373-.292.073.073 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.288 12.288 0 0 1-1.873.892.077.077 0 0 0-.041.107 14.373 14.373 0 0 0 1.225 1.994.076.076 0 0 0 .085.028 19.92 19.92 0 0 0 6.002-3.018.077.077 0 0 0 .032-.054c.5-5.177-.838-9.673-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Teams icon</title>
      <path d="M23.08 6.43h.01c.2 1.39.2 3.03.2 4.19 0 2.87-.04 5.37-.36 6.94l-5.69 2.91-5.68-2.92v-1.63c.69-.15 1.35-.42 1.95-.78.71.55 1.55.94 2.45 1.05.3.04.59.04.88-.01 2.37-.41 3.52-2.96 3.76-5.46l.01-.15c.03-.31.04-.61.04-.91.01-1.46-.24-2.43-.89-3.04-.77-.73-2.12-.9-3.41-.3l-2.02.94-2.77-1.43v-1.28L23.08 6.43zM10.05 4.5l-8.6 4.41v6.16l8.6 4.42V4.5zM7.22 8.01c.85 0 1.54.69 1.54 1.54s-.69 1.54-1.54 1.54-1.54-.69-1.54-1.54.69-1.54 1.54-1.54zM9.01 13.9c0 1.48-1.79 1.6-1.79 1.6s-1.79-.12-1.79-1.6c0-1.04.8-1.89 1.79-1.89s1.79.85 1.79 1.89z" />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          v1.0 Available Now
        </div>
        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl md:text-7xl">
          Give your AI agent the power to <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            read and send messages
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
          A unified, agent-friendly CLI for messaging platforms. Zero-config credential extraction.
          No OAuth flows. No API keys. Works out of the box.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-black px-8 py-3 text-base font-semibold text-white transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/devxoul/agent-messenger"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-8 py-3 text-base font-medium text-zinc-900 transition-all hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
              <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <KeyIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                No API keys needed
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Automatically extracts credentials from your installed desktop apps.
              </p>
            </div>
            <div className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
              <div className="mb-4 inline-flex rounded-xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <GlobeIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                One interface
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Learn once, use everywhere. Unified commands for Slack, Discord, and Teams.
              </p>
            </div>
            <div className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
              <div className="mb-4 inline-flex rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <BotIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                AI-agent friendly
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                JSON output by default. Perfect for LLM tool use and automation.
              </p>
            </div>
            <div className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700">
              <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <ZapIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                Token efficient
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                CLI approach, not MCP. Load only what you need to keep context small.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-6 py-20 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
              Get up and running in 30 seconds
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              No configuration files. No lengthy setups.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl border border-zinc-800">
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs font-medium text-zinc-500">bash</span>
            </div>
            <div className="p-6 sm:p-8 font-mono text-sm sm:text-base overflow-x-auto">
              <pre className="text-zinc-300">
                <code>
                  <span className="text-zinc-500">
                    # 1. Extract credentials from your Slack desktop app
                  </span>
                  {'\n'}
                  <span className="text-purple-400">agent-slack</span> auth extract
                  {'\n\n'}
                  <span className="text-zinc-500"># 2. See your workspace at a glance</span>
                  {'\n'}
                  <span className="text-purple-400">agent-slack</span> snapshot --pretty
                  {'\n\n'}
                  <span className="text-zinc-500"># 3. Send a message</span>
                  {'\n'}
                  <span className="text-purple-400">agent-slack</span> message send general{' '}
                  <span className="text-green-400">&quot;Hello from the CLI!&quot;</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-12 text-3xl font-bold text-zinc-900 dark:text-white">
            Supported Platforms
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <div className="mb-4 text-[#4A154B] dark:text-white">
                <SlackIcon className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Slack</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Full messaging and thread support
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <div className="mb-4 text-[#5865F2]">
                <DiscordIcon className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Discord</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Guilds, channels, and DMs
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <div className="mb-4 text-[#464EB8] dark:text-[#7B83EB]">
                <TeamsIcon className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Teams</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Microsoft Teams support
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32 pt-10 text-center">
        <div className="mx-auto max-w-3xl rounded-3xl bg-zinc-900 px-6 py-16 text-center shadow-2xl dark:bg-zinc-100">
          <h2 className="text-3xl font-bold text-white dark:text-black sm:text-4xl">
            Ready to empower your agent?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-300 dark:text-zinc-600">
            Start using Agent Messenger today. It&apos;s free and open source.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/docs"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-black transition-colors hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800"
            >
              Read the Docs
            </Link>
            <Link
              href="/docs/installation"
              className="rounded-lg border border-zinc-700 bg-transparent px-8 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:border-zinc-300 dark:text-black dark:hover:bg-zinc-200"
            >
              Install Now
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        <p>© {new Date().getFullYear()} Agent Messenger. Released under the MIT License.</p>
      </footer>
    </div>
  )
}
