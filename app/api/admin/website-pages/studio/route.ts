import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { confirmNycPageAdminPassword } from '@/lib/confirmNycPageAdminPassword'
import { normalizeNycStudioContent, parseNycStudioContent } from '@/lib/nycPageStudio'
import { localizeNycContactText } from '@/lib/nycCatalogCore.mjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ORIGINS = new Set([
  'https://friendlypartyrentalnyc.com',
  'https://www.friendlypartyrentalnyc.com',
  'https://nyc.friendlypartyrental.com',
  'https://fpr-nyc-production.up.railway.app',
])

function validOrigin(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  if (ORIGINS.has(origin) && new URL(origin).hostname === request.nextUrl.hostname) return true
  return process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin) && new URL(origin).host === request.nextUrl.host
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return { session: null, error: NextResponse.json({ error: 'Sign in to NYC admin' }, { status: 401 }) }
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: 'NYC administrator access required' }, { status: 403 }) }
  }
  return { session, error: null }
}

function replyError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  const id = request.nextUrl.searchParams.get('id')
  try {
    if (!id) {
      const [pages, drafts] = await Promise.all([
        prisma.websitePage.findMany({ orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, slug: true, isPublished: true, updatedAt: true } }),
        prisma.nycCustomPageDraft.findMany({ select: { pageId: true, updatedAt: true } }),
      ])
      const pending = new Set(drafts.map(draft => draft.pageId))
      return NextResponse.json({ pages: pages.map(page => ({ ...page, hasDraft: pending.has(page.id) })) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const [page, draft] = await Promise.all([
      prisma.websitePage.findUnique({ where: { id },
        select: { id: true, title: true, slug: true, content: true, isPublished: true, updatedAt: true } }),
      prisma.nycCustomPageDraft.findUnique({ where: { pageId: id } }),
    ])
    if (!page) return replyError('NYC page not found', 404)
    const content = draft?.content ?? page.content
    return NextResponse.json({
      page: { id: page.id, slug: page.slug, title: page.title, isPublished: page.isPublished, updatedAt: page.updatedAt },
      title: draft?.title ?? page.title,
      blocks: parseNycStudioContent(content ? localizeNycContactText(content) : content),
      draftUpdatedAt: draft?.updatedAt ?? null,
      hasDraft: Boolean(draft),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[nyc-page-studio] read failed', error)
    return replyError('Unable to load NYC page studio', 503)
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error
  if (!validOrigin(request)) return replyError('Invalid NYC origin', 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return replyError('JSON required', 415)
  const payload: unknown = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return replyError('Invalid request')
  const data = payload as Record<string, unknown>
  const pageId = typeof data.pageId === 'string' ? data.pageId : ''
  if (!pageId || pageId.length > 100) return replyError('A NYC page ID is required')
  if (!['save', 'publish', 'discard'].includes(String(data.action))) return replyError('Unknown page action')
  try {
    if (data.action === 'save') {
      if (typeof data.title !== 'string' || data.title.trim().length < 2 || data.title.length > 180) {
        return replyError('Page title must be 2–180 characters')
      }
      let content: string
      try { content = normalizeNycStudioContent(data.blocks) }
      catch (cause) { return replyError(cause instanceof Error ? cause.message : 'Invalid page content') }
      // Explicit optimistic revision: a second editor cannot silently overwrite
      // another session's saved NYC draft, even if both pages were initially empty.
      if (!Object.prototype.hasOwnProperty.call(data, 'expectedDraftUpdatedAt')) {
        return replyError('Reload the page before saving this private draft.', 409)
      }
      const expectedValue = data.expectedDraftUpdatedAt
      const expected = typeof expectedValue === 'string' ? new Date(expectedValue) : null
      if ((expectedValue !== null && typeof expectedValue !== 'string') ||
          (typeof expectedValue === 'string' && Number.isNaN(expected?.getTime()))) {
        return replyError('Invalid draft revision.', 400)
      }
      // All changes are private; published WebsitePage content is never updated.
      const draft = await prisma.$transaction(async tx => {
        const page = await tx.websitePage.findUnique({ where: { id: pageId }, select: { id: true } })
        if (!page) throw new Error('PAGE_NOT_FOUND')
        if (expectedValue === null) {
          // Unique pageId makes simultaneous first-time draft creations conflict.
          return tx.nycCustomPageDraft.create({
            data: { pageId, title: data.title.trim(), content },
            select: { updatedAt: true },
          })
        }
        if (!expected) throw new Error('STALE_DRAFT')
        const changed = await tx.nycCustomPageDraft.updateMany({
          where: { pageId, updatedAt: expected },
          data: {
            title: data.title.trim(),
            content,
            // Ensure a distinct revision even for two edits in the same millisecond.
            updatedAt: new Date(Math.max(Date.now(), expected.getTime() + 1)),
          },
        })
        if (changed.count !== 1) throw new Error('STALE_DRAFT')
        return tx.nycCustomPageDraft.findUniqueOrThrow({
          where: { pageId }, select: { updatedAt: true },
        })
      })
      return NextResponse.json({ saved: true, draftUpdatedAt: draft.updatedAt }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (data.action === 'discard') {
      // Discarding a draft never unpublishes or alters an existing page.
      await prisma.nycCustomPageDraft.deleteMany({ where: { pageId } })
      return NextResponse.json({ discarded: true })
    }

    if (!await confirmNycPageAdminPassword(session, data.adminPassword)) {
      return replyError('Current NYC administrator password required to publish', 403)
    }
    const expected = typeof data.expectedDraftUpdatedAt === 'string' ? new Date(data.expectedDraftUpdatedAt) : null
    if (!expected || Number.isNaN(expected.getTime())) return replyError('Save and review the latest private draft before publishing')
    const published = await prisma.$transaction(async tx => {
      const draft = await tx.nycCustomPageDraft.findUnique({ where: { pageId } })
      if (!draft || draft.updatedAt.getTime() !== expected.getTime()) {
        throw new Error('STALE_DRAFT')
      }
      if (parseNycStudioContent(draft.content).length === 0) {
        throw new Error('EMPTY_DRAFT')
      }
      // Conditional delete refuses to publish if another editor changed the draft.
      const removed = await tx.nycCustomPageDraft.deleteMany({
        where: { pageId, updatedAt: expected },
      })
      if (removed.count !== 1) throw new Error('STALE_DRAFT')
      return tx.websitePage.update({
        where: { id: pageId },
        data: { title: draft.title, content: draft.content, isPublished: true },
        select: { id: true, title: true, slug: true, isPublished: true, updatedAt: true },
      })
    })
    return NextResponse.json({ published: true, page: published }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'PAGE_NOT_FOUND') return replyError('NYC page not found', 404)
    if ((cause as { code?: string } | null)?.code === 'P2002') {
      return replyError('Another editor saved this draft first. Reload and review before saving.', 409)
    }
    if (cause instanceof Error && cause.message === 'STALE_DRAFT') {
      return replyError('This draft changed in another session. Reload and review before publishing.', 409)
    }
    if (cause instanceof Error && cause.message === 'EMPTY_DRAFT') {
      return replyError('Add at least one section before publishing this NYC page.')
    }
    console.error('[nyc-page-studio] write failed', cause)
    return replyError('Unable to save or publish NYC page changes', 503)
  }
}
