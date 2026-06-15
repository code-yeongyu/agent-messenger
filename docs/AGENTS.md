# docs

Standalone Next.js + fumadocs site for agent-messenger.dev. Own node_modules, decoupled from src/.

## Stack

Next.js 16.1.6 (App Router) + React 19.2.3 + fumadocs-core 16.5.0 / fumadocs-mdx 14.2.6 / fumadocs-ui 16.5.0 + Tailwind CSS v4 + Geist font + lucide-react 0.563.0. Lint/format via oxlint/oxfmt. Bun runtime.

## Structure

- `content/docs/**/*.mdx` — source docs (index, quick-start, agent-skills, tui, cli/, sdk/); `meta.json` controls ordering
- `src/app/` — Next pages: landing `page.tsx`, `[[...slug]]/page.tsx` (dynamic doc route), `layout.tsx` (Geist + Google Analytics), `docs/layout.tsx` (sidebar), search API route
- `src/lib/source.ts` — fumadocs loader wiring (`baseUrl: '/docs'`) + Lucide icon map
- `source.config.ts` — `defineDocs({ dir: 'content/docs' })` + custom MDX provider
- `next.config.ts` — wrapped with `createMDX()` from fumadocs-mdx/next
- `postcss.config.mjs` — `@tailwindcss/postcss` only (Tailwind v4)

## Page generation

`source.config.ts` calls `defineDocs({ dir: 'content/docs' })` → fumadocs-mdx generates `.source/` (gitignored) → `src/lib/source.ts` loads via `loader({ baseUrl: '/docs' })` → `src/app/docs/[[...slug]]/page.tsx` exports `generateStaticParams()` from `source.generateParams()` for SSG, renders MDX body + TOC via `source.getPage(slug)`. Sidebar tree comes from `source.getPageTree()` in `docs/layout.tsx`.

## Commands

Run from `docs/`:

- `bun install` — separate node_modules (required before any build or root format:check)
- `bun run dev` — `next dev`
- `bun run build` — `next build` → `.next/`
- `bun run start` — `next start`
- `bun run lint` — `oxlint`
- `bun run format` — `oxfmt --write .`

No `typecheck` script here; root `bun typecheck` excludes docs/.

## Gotcha

Root `bun format:check` reads `docs/src/app/globals.css` for Tailwind class sorting (root `.oxfmtrc.json` overrides `sortTailwindcss.stylesheet` to that path). `globals.css` contains `@source '../../../node_modules/fumadocs-ui/dist/**/*.js'`, which resolves relative to `docs/src/app/` into `docs/node_modules/fumadocs-ui`. If `cd docs && bun install` never ran, format:check fails with `Can't resolve 'fumadocs-ui/...'`.

## Note

Fully decoupled: docs never imports from main `src/` (no `from 'agent-messenger'`, no `from '../src'`). `agent-messenger` appears only as MDX code-example text. Own `tsconfig.json` with `@/* → ./src/*` (docs-local), `moduleResolution: bundler`, strict.
