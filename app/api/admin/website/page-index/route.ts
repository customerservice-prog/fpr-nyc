export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WEBSITE_EDITOR_MAIN_PAGES, isRouteOverrideSlug, parsePageBuilderDocument } from '@/lib/pageBuilder'

function hasUnpublishedChanges(content: string | null, title: string, pagePath: string) {
  const doc = parsePageBuilderDocument(content, title, pagePath)
  return (
    doc.draftTitle !== doc.publishedTitle ||
    JSON.stringify(doc.draftBlocks) !== JSON.stringify(doc.publishedBlocks) ||
    JSON.stringify(doc.draftSettings) !== JSON.stringify(doc.publishedSettings)
  )
}



export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [websitePages, homeDraft, homeLive] = await Promise.all([
    prisma.websitePage.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, slug: true, title: true, content: true, isPublished: true, updatedAt: true },
    }),
    prisma.homeDraft.findUnique({ where: { id: 'home_draft_1' }, select: { hero: true, content: true } }),
    prisma.homeRevision.findFirst({ where: { isCurrent: true }, select: { hero: true, content: true } }),
  ])

  const pages = new Map<string, any>()
  WEBSITE_EDITOR_MAIN_PAGES.forEach(page => pages.set(page.path, { ...page, group: 'Main website' }))
  if (homeDraft && homeLive) {
    pages.set('/', {
      ...pages.get('/'),
      homePage: true,
      hasUnpublishedChanges:
        JSON.stringify(homeDraft.hero) !== JSON.stringify(homeLive.hero) ||
        JSON.stringify(homeDraft.content) !== JSON.stringify(homeLive.content),
    })
  } else {
    pages.set('/', { ...pages.get('/'), homePage: true })
  }

  websitePages.forEach(page => {
    if (isRouteOverrideSlug(page.slug)) {
      const doc = parsePageBuilderDocument(page.content, page.title, '/')
      const existing = pages.get(doc.path)
      if (!existing) return
      pages.set(doc.path, {
        ...existing,
        title: doc.draftTitle || existing.title,
        overrideId: page.id,
        overridePublished: page.isPublished,
        hasUnpublishedChanges: hasUnpublishedChanges(page.content, page.title, doc.path),
        overrideUpdatedAt: page.updatedAt,
      })
      return
    }

    pages.set('/' + page.slug, {
      path: '/' + page.slug,
      title: page.title,
      group: 'Your pages',
      customPageId: page.id,
      customPagePublished: page.isPublished,
      hasUnpublishedChanges: hasUnpublishedChanges(page.content, page.title, '/' + page.slug),
      customPageUpdatedAt: page.updatedAt,
    })
  })

  return NextResponse.json({
    pages: Array.from(pages.values()),
    counts: {
      total: pages.size,
      main: WEBSITE_EDITOR_MAIN_PAGES.length,
      custom: websitePages.filter(page => !isRouteOverrideSlug(page.slug)).length,
    },
  })
}
