export function handleError(error: Error): void {
  console.error(JSON.stringify({ error: error.message }))
  process.exit(1)
}
