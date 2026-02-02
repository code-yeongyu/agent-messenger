import { source } from '@/lib/source'
import { notFound } from 'next/navigation'
import { DocsPage, DocsBody } from 'fumadocs-ui/layouts/docs/page'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) {
    return {}
  }

  return {
    title: page.data.title,
    description: page.data.description,
  }
}

export default async function Page(props: PageProps) {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) {
    notFound()
  }

  const { body: MDX, toc } = page.data as any

  return (
    <DocsPage toc={toc}>
      <h1 className="text-3xl font-bold mb-2">{page.data.title}</h1>
      {page.data.description && (
        <p className="text-lg text-muted-foreground mb-6">{page.data.description}</p>
      )}
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  )
}
