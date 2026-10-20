export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasStaffPermission } from '@/lib/staffPermissions'
import { prisma } from '@/lib/prisma'
import {
  isBuilderOverrideAllowed,
  isWebsiteEditorMainPath,
  parsePageBuilderDocument,
  routeOverrideSlug,
  normalizeBuilderPath,
} from '@/lib/pageBuilder'

export async function GET(request: NextRequest) {
  const path = normalizeBuilderPath(request.nextUrl.searchParams.get('path') || '/')
  const draftPreview = request.nextUrl.searchParams.get('draft') === '1'
  if (!isBuilderOverrideAllowed(path) || !isWebsiteEditorMainPath(path) || path === '/') {
    return NextResponse.json({ page: null })
  }

  const page = await prisma.websitePage.findUnique({ where: { slug: routeOverrideSlug(path) } })
  if (!page) return NextResponse.json({ page: null })

  const doc = parsePageBuilderDocument(page.content, page.title, path)

  if (draftPreview) {
    const session = await getServerSession(authOptions)
    const role = (session?.user as { role?: string } | undefined)?.role
    if (session && hasStaffPermission(role, 'website')) {
      return NextResponse.json({
        page: {
          path,
          title: doc.draftTitle || page.title,
          blocks: doc.draftBlocks,
          settings: doc.draftSettings,
          updatedAt: page.updatedAt,
        },
      })
    }
  }

  if (!page.isPublished) return NextResponse.json({ page: null })
  return NextResponse.json({
    page: {
      path,
      title: doc.publishedTitle || page.title,
      blocks: doc.publishedBlocks,
      settings: doc.publishedSettings,
      updatedAt: page.updatedAt,
    },
  })
}
