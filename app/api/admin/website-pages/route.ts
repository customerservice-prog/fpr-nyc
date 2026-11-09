export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { confirmNycPageAdminPassword } from '@/lib/confirmNycPageAdminPassword'

const NYC_ADMIN_ORIGINS = new Set([
  'https://friendlypartyrentalnyc.com',
  'https://www.friendlypartyrentalnyc.com',
  'https://nyc.friendlypartyrental.com',
  'https://fpr-nyc-production.up.railway.app',
])

// These top-level routes belong to the application, not customer-authored pages.
const RESERVED_SLUGS = new Set([
  'admin', 'api', '_next', 'about_us', 'checkout', 'category', 'contact_us', 'contract',
  'design-your-event', 'driver', 'employment', 'event-planning', 'frequently_asked_questions',
  'gallery', 'graduation-rentals', 'health', 'items', 'my-order', 'order-by-date', 'pay',
  'pay-now', 'popular-rentals', 'privacy-policy', 'rental-policies', 'robots.txt',
  'save-card', 'schedule', 'service-area', 'sitemap.xml', 'unsubscribe', 'weddings',
  'wedding-packages', 'wedding-vendors', 'chiavari-chair-rentals',
  'party-rentals-bronx-ny', 'party-rentals-bronxville-ny', 'party-rentals-eastchester-ny',
  'party-rentals-fieldston-ny', 'party-rentals-kingsbridge-ny',
  'party-rentals-mount-vernon-ny', 'party-rentals-new-rochelle-ny',
  'party-rentals-pelham-ny', 'party-rentals-riverdale-ny',
  'party-rentals-tuckahoe-ny', 'party-rentals-yonkers-ny',
])

function validPageSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 2 && value.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !RESERVED_SLUGS.has(value)
}

function sameNycOrigin(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  if (NYC_ADMIN_ORIGINS.has(origin) && new URL(origin).hostname === request.nextUrl.hostname) return true
  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin) && new URL(origin).host === request.nextUrl.host
  }
  return false
}

function invalidBody() {
  return NextResponse.json({ error: 'Invalid website page fields' }, { status: 400 })
}

function contentField(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= 200000)
}

async function adminSession() {
  const session = await getServerSession(authOptions)
  if (!session) return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, error: null }
}

async function jsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  return body as Record<string, unknown>
}

export async function GET() {
  const { error } = await adminSession()
  if (error) return error
  const items = await prisma.websitePage.findMany({ orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const { error } = await adminSession()
  if (error) return error
  if (!sameNycOrigin(request)) return NextResponse.json({ error: 'Invalid NYC origin' }, { status: 403 })
  const body = await jsonBody(request)
  if (!body || !validPageSlug(body.slug) || typeof body.title !== 'string' ||
      !body.title.trim() || body.title.length > 180 ||
      (body.content !== undefined && !contentField(body.content))) return invalidBody()

  // Newly created pages must remain private until a separate, re-authenticated publish.
  const item = await prisma.websitePage.create({
    data: {
      slug: body.slug,
      title: body.title.trim(),
      content: body.content === undefined ? null : body.content as string | null,
      isPublished: false,
    },
  })
  return NextResponse.json({ item })
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await adminSession()
  if (error) return error
  if (!sameNycOrigin(request)) return NextResponse.json({ error: 'Invalid NYC origin' }, { status: 403 })
  const body = await jsonBody(request)
  if (!body || typeof body.id !== 'string' || !body.id) return invalidBody()
  const publishLive = body.publishLive === true
  const unpublishLive = body.unpublishLive === true
  if (publishLive && unpublishLive) return invalidBody()
  if (body.isPublished !== undefined) return NextResponse.json({ error: 'Use explicit publishing actions' }, { status: 400 })

  const changes: { slug?: string; title?: string; content?: string | null; isPublished?: boolean } = {}
  if (body.slug !== undefined) {
    if (!validPageSlug(body.slug)) return invalidBody()
    changes.slug = body.slug
  }
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 180) return invalidBody()
    changes.title = body.title.trim()
  }
  if (body.content !== undefined) {
    if (!contentField(body.content)) return invalidBody()
    changes.content = body.content
  }
  if (publishLive) changes.isPublished = true
  if (unpublishLive) changes.isPublished = false
  if (!Object.keys(changes).length) return invalidBody()

  const existing = await prisma.websitePage.findUnique({
    where: { id: body.id }, select: { isPublished: true },
  })
  if (!existing) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  if ((existing.isPublished || publishLive || unpublishLive) &&
      !await confirmNycPageAdminPassword(session, body.adminPassword)) {
    return NextResponse.json({ error: 'Current admin password required to change a live page' }, { status: 403 })
  }

  const item = await prisma.websitePage.update({ where: { id: body.id }, data: changes })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await adminSession()
  if (error) return error
  if (!sameNycOrigin(request)) return NextResponse.json({ error: 'Invalid NYC origin' }, { status: 403 })
  const body = await jsonBody(request)
  if (!body || !await confirmNycPageAdminPassword(session, body.adminPassword)) {
    return NextResponse.json({ error: 'Current admin password required to delete a page' }, { status: 403 })
  }
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const existing = await prisma.websitePage.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  await prisma.websitePage.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
