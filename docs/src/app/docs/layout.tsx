import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/source'
import { baseOptions } from '@/app/layout.config'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions}
      sidebar={{
        enabled: true,
        prefetch: true,
      }}
    >
      {children}
    </DocsLayout>
  )
}
