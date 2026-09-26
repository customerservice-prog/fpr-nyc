export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { prisma } from '@/lib/prisma'
import { automationDefinitions, parseDraftRule, prepareCampaignDraft } from '@/lib/marketing/automations'
import { getMarketingSnapshot, getCampaignAudience } from '@/lib/marketing/audience'
export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  const [settings, snapshot] = await Promise.all([prisma.systemSetting.findMany({ where: { category: 'marketing_draft_rules' } }), getMarketingSnapshot()])
  return NextResponse.json({ rules: automationDefinitions().map(c => ({ slug: c.slug, name: c.name, goal: c.goal, months: c.months, audience: getCampaignAudience(c, snapshot), ...parseDraftRule(settings.find(s => s.key === c.slug)?.value) })) })
}
export async function POST(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  try {
    const body = await request.json()
    if (!automationDefinitions().some(c => c.slug === body.slug)) return NextResponse.json({ error: 'Unknown rule' }, { status: 400 })
    if (body.action === 'prepare') return NextResponse.json(await prepareCampaignDraft(body.slug))
    if (body.action !== 'configure' || typeof body.enabled !== 'boolean' || ![7,14,30,90].includes(body.intervalDays)) return NextResponse.json({ error: 'Invalid draft rule configuration' }, { status: 400 })
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`marketing-draft:${body.slug}`}))`
      const existing = await tx.systemSetting.findUnique({ where: { category_key: { category: 'marketing_draft_rules', key: body.slug } } })
      const next = { ...parseDraftRule(existing?.value), enabled: body.enabled, intervalDays: body.intervalDays, nextRunAt: body.enabled ? new Date().toISOString() : null }
      await tx.systemSetting.upsert({ where: { category_key: { category: 'marketing_draft_rules', key: body.slug } }, create: { category: 'marketing_draft_rules', key: body.slug, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } })
    })
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Could not update the draft rule' }, { status: 500 }) }
}
