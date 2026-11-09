import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_NYC_ORIGINS = new Set([
  'https://friendlypartyrentalnyc.com',
  'https://www.friendlypartyrentalnyc.com',
])
const VALID_STATUS = new Set(['unverified', 'confirmed', 'unavailable'])
const VALID_SOURCE = new Set(['unknown', 'nyc_stock', 'partner_committed'])

async function adminSession() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string } | undefined)?.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  try {
    // Do not infer physical presence from the Syracuse-imported catalog quantity.
    const [items, verifications] = await Promise.all([
      prisma.item.findMany({
        where: { displayToCustomer: true },
        select: { id: true, slug: true, name: true, quantity: true, type: true, cost: true, category: { select: { name: true } } },
        orderBy: [{ name: 'asc' }],
        take: 2000,
      }),
      prisma.nycPhysicalStockVerification.findMany({
        select: { itemSlug: true, status: true, verifiedQuantity: true, source: true, notes: true, verifiedAt: true, verifiedBy: true },
      }),
    ])
    const checks = new Map(verifications.map(check => [check.itemSlug, check]))
    const rows = items.map(item => ({
      ...item,
      verification: checks.get(item.slug) || null,
    }))
    const stats = {
      catalogItems: rows.length,
      confirmed: rows.filter(item => item.verification?.status === 'confirmed').length,
      unavailable: rows.filter(item => item.verification?.status === 'unavailable').length,
      unverified: rows.filter(item => !item.verification || item.verification.status === 'unverified').length,
    }
    return NextResponse.json({ rows, stats }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to verify NYC physical stock; do not assume available inventory' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  const origin = request.headers.get('origin') || ''
  if (!ALLOWED_NYC_ORIGINS.has(origin) || new URL(origin).hostname !== request.nextUrl.hostname) {
    return NextResponse.json({ error: 'Invalid NYC origin' }, { status: 403 })
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON required' }, { status: 415 })
  }
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ error: 'Invalid verification' }, { status: 400 })
  const data = raw as Record<string, unknown>
  const itemSlug = typeof data.itemSlug === 'string' ? data.itemSlug.trim() : ''
  const status = typeof data.status === 'string' ? data.status : ''
  const source = typeof data.source === 'string' ? data.source : ''
  const verifiedQuantity = data.verifiedQuantity
  const notes = typeof data.notes === 'string' ? data.notes.trim() : ''
  if (!/^[a-z0-9][a-z0-9-]{0,150}$/.test(itemSlug) || !VALID_STATUS.has(status) || !VALID_SOURCE.has(source) ||
      !Number.isSafeInteger(verifiedQuantity) || (verifiedQuantity as number) < 0 || (verifiedQuantity as number) > 100000 ||
      notes.length > 1000) {
    return NextResponse.json({ error: 'Invalid item, status, quantity, or notes' }, { status: 400 })
  }
  const quantity = verifiedQuantity as number
  if ((status === 'confirmed' && (quantity < 1 || source === 'unknown')) ||
      (status === 'unavailable' && quantity !== 0) ||
      (status === 'unverified' && (quantity !== 0 || source !== 'unknown'))) {
    return NextResponse.json({ error: 'Confirmation requires a positive quantity and named stock source. Unavailable and unverified items must have zero verified quantity.' }, { status: 400 })
  }
  try {
    const item = await prisma.item.findUnique({ where: { slug: itemSlug }, select: { slug: true, displayToCustomer: true } })
    if (!item?.displayToCustomer) return NextResponse.json({ error: 'NYC catalog item not found' }, { status: 404 })
    const reviewer = String(session.user?.email || session.user?.name || 'NYC administrator').slice(0, 150)
    const verification = await prisma.nycPhysicalStockVerification.upsert({
      where: { itemSlug },
      create: { itemSlug, status, verifiedQuantity: quantity, source, notes: notes || null, verifiedBy: reviewer, verifiedAt: status === 'unverified' ? null : new Date() },
      update: { status, verifiedQuantity: quantity, source, notes: notes || null, verifiedBy: reviewer, verifiedAt: status === 'unverified' ? null : new Date() },
      select: { itemSlug: true, status: true, verifiedQuantity: true, source: true, notes: true, verifiedAt: true, verifiedBy: true },
    })
    return NextResponse.json({ verification }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to save NYC inventory verification' }, { status: 503 })
  }
}
