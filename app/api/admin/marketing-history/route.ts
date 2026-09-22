export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  const params = request.nextUrl.searchParams
  const rawPage = Number(params.get('page') || 1), page = Number.isFinite(rawPage) ? Math.max(1, Math.min(100000, Math.floor(rawPage))) : 1
  const rawDays = Number(params.get('days') || 30), days = [7,30,90,365].includes(rawDays) ? rawDays : 30
  const q = (params.get('q') || '').trim().slice(0, 200), campaign = (params.get('campaign') || '').slice(0, 200)
  const status = params.get('status') || 'sent', take = 25
  const since = new Date(Date.now() - days * 86400000)
  try {
    if (status === 'sent') {
      const where = { sentAt: { gte: since }, channel: 'email', ...(campaign ? { campaignSlug: campaign } : {}), ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { campaignName: { contains: q, mode: 'insensitive' as const } }] } : {}) }
      const [total, rows] = await Promise.all([prisma.marketingSendLog.count({ where }), prisma.marketingSendLog.findMany({ where, orderBy: [{ sentAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * take, take, select: { id: true, campaignSlug: true, campaignName: true, email: true, sentAt: true, openCount: true, clickCount: true, openedAt: true, clickedAt: true, lastClickedUrl: true, runId: true } })])
      return NextResponse.json({ total, page, pages: Math.max(1, Math.ceil(total / take)), rows: rows.map(r => ({ ...r, status: 'sent', date: r.sentAt })) })
    }
    if (!['failed','suppressed','simulated','ambiguous','claimed'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    const where = { status, createdAt: { gte: since }, ...(campaign ? { campaignSlug: campaign } : {}), ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}) }
    const [total, rows] = await Promise.all([prisma.marketingSendClaim.count({ where }), prisma.marketingSendClaim.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * take, take, include: { run: { select: { campaignName: true, errorMessage: true } } } })])
    return NextResponse.json({ total, page, pages: Math.max(1, Math.ceil(total / take)), rows: rows.map(r => ({ id: r.id, email: r.email, campaignSlug: r.campaignSlug, campaignName: r.run.campaignName, status: r.status, date: r.createdAt, error: r.run.errorMessage })) })
  } catch (error) { console.error('Marketing history:', error); return NextResponse.json({ error: 'Could not load send history' }, { status: 500 }) }
}
