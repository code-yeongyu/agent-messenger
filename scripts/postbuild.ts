import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { bin?: Record<string, string> }

const cliFiles = Object.values(pkg.bin ?? {}).map((entry) =>
  entry.replace(/^\.\/src\//, 'dist/src/').replace(/\.ts$/, '.js'),
)

let updatedCount = 0
for (const file of cliFiles) {
  if (!existsSync(file)) continue
  const content = readFileSync(file, 'utf8')
  if (!content.startsWith('#!/usr/bin/env bun')) continue
  writeFileSync(file, content.replace('#!/usr/bin/env bun', '#!/usr/bin/env node'))
  updatedCount++
}

console.log(`Updated shebang in ${updatedCount} CLI files`)

cpSync('src/vendor', 'dist/src/vendor', { recursive: true })

console.log('Copied vendored LINE runtime into dist/src/vendor')
