export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center justify-center gap-8 px-6 py-32 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
          Agent Messenger Documentation
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Comprehensive guides for Slack, Discord, and Microsoft Teams integration.
        </p>
        <div className="flex gap-4">
          <a
            href="/docs"
            className="rounded-lg bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            View Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
