import { docs } from 'fumadocs-mdx:collections/server'
import { loader } from 'fumadocs-core/source'

export const source = loader({
  baseUrl: '/docs',
  // @ts-expect-error - docs.toFumadocsSource() is available at runtime
  source: docs.toFumadocsSource(),
})
