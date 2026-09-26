export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { MARKETING_SUPPRESSION_CATEGORY, isMarketingSuppressionReason, normalizeSuppressionEmail, removeMarketingSuppression, suppressMarketingEmail, suppressionReason } from '@/lib/marketing/suppression'

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return response({ error: 'Administrator access required' }, auth.isAuthenticated ? 403 : 401)
  const page = Math.max(1, Math.min(100000, Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1))
  const search = (request.nextUrl.searchParams.get('search') || '').trim().toLowerCase().slice(0, 254)
  const where = { category: MARKETING_SUPPRESSION_CATEGORY, ...(search ? { key: { contains: search } } : {}) }
  try {
    const [entries, total] = await Promise.all([
      prisma.systemSetting.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { key: 'asc' }], take: 50, skip: (page - 1) * 50, select: { key: true, value: true, updatedAt: true } }),
      prisma.systemSetting.count({ where }),
    ])
    return response({ entries: entries.map(entry => ({ email: entry.key, reason: suppressionReason(entry.value), updatedAt: entry.updatedAt })), total, page, pageSize: 50 })
  } catch { return response({ error: 'Could not load marketing delivery holds' }, 500) }
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return response({ error: 'Administrator access required' }, auth.isAuthenticated ? 403 : 401)
  let body: any
  try {
    const raw = await request.text()
    if (raw.length > 4096) return response({ error: 'Request is too large' }, 413)
    body = JSON.parse(raw)
  } catch { return response({ error: 'Invalid request' }, 400) }
  const email = normalizeSuppressionEmail(body?.email)
  if (!email || !['suppress', 'remove'].includes(body?.action) || (body.action === 'suppress' && !isMarketingSuppressionReason(body.reason))) return response({ error: 'Choose a valid email, action, and suppression reason' }, 400)
  try {
    if (body.action === 'remove') await removeMarketingSuppression(email)
    else await suppressMarketingEmail(email, body.reason)
    return response({ success: true })
  } catch { return response({ error: 'Could not update the marketing delivery hold' }, 500) }
}
