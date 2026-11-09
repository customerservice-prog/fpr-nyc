import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import {nycPageMetadata} from '@/lib/nycSeo'
import { localizeNycContactText } from '@/lib/nycCatalogCore.mjs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

import { RenderBlock, type Block } from '@/components/public/NycCustomPageBlocks'


function parseBlocks(content: string | null): Block[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(localizeNycContactText(content))
    return Array.isArray(parsed) ? parsed : [{ id: 'legacy-text', type: 'text', text: content }]
  } catch {
    return [{ id: 'legacy-text', type: 'text', text: localizeNycContactText(content) }]
  }
}
export async function generateMetadata({params}:PageProps){
 const {slug}=await params
 const page=await prisma.websitePage.findUnique({where:{slug}})
 if(!page||!page.isPublished)return {title:'Page not found',robots:{index:false,follow:true}}
 const blocks=parseBlocks(page.content)
 const text=blocks.flatMap(block=>[block.text,block.headingText,block.heroSubtitle,block.ctaText]).filter(Boolean).join(' ')
 return nycPageMetadata('/'+encodeURIComponent(slug),page.title,text||`${page.title} — Friendly Party Rental NYC in Riverdale and Downstate New York.`,blocks.length>0)
}

export default async function CustomWebsitePage({ params }: PageProps) {
  const { slug } = await params
  const page = await prisma.websitePage.findUnique({ where: { slug } })
  if (!page || !page.isPublished) {
    notFound()
  }

  const blocks = parseBlocks(page!.content)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-dark mb-3">{page!.title}</h1>
      </div>
      <div className="space-y-8 text-body">
        {blocks.map((block) => (
          <div key={block.id}>
            <RenderBlock block={block} />
          </div>
        ))}
      </div>
    </div>
  )
}
