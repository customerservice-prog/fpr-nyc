import { prisma } from '@/lib/prisma'
import { CAMPAIGN_LIBRARY, campaignToBlocks, VISUAL_THEMES } from '@/lib/marketing/campaignLibrary'
import { blocksToHtml, type Block } from '@/lib/marketing/emailRenderer'
import { automationSegmentForCampaign } from '@/lib/marketing/planner'
import { getMarketingSnapshot, getCampaignAudience } from '@/lib/marketing/audience'

export type DraftRule = { enabled: boolean; intervalDays: number; nextRunAt: string | null; lastPreparedAt: string | null; lastDraftId: string | null }
export const DEFAULT_DRAFT_RULE: DraftRule = { enabled: false, intervalDays: 30, nextRunAt: null, lastPreparedAt: null, lastDraftId: null }
const dateValue = (value: unknown): string | null => typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
export function parseDraftRule(value?: string | null): DraftRule {
  try {
    const parsed = JSON.parse(value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_DRAFT_RULE }
    return {
      enabled: parsed.enabled === true,
      intervalDays: [7, 14, 30, 90].includes(parsed.intervalDays) ? parsed.intervalDays : DEFAULT_DRAFT_RULE.intervalDays,
      nextRunAt: dateValue(parsed.nextRunAt),
      lastPreparedAt: dateValue(parsed.lastPreparedAt),
      lastDraftId: typeof parsed.lastDraftId === 'string' && parsed.lastDraftId.trim() ? parsed.lastDraftId : null,
    }
  } catch { return { ...DEFAULT_DRAFT_RULE } }
}
export const automationDefinitions = () => CAMPAIGN_LIBRARY.filter(c => c.family === 'seasonal' || c.family === 'lifecycle')
const easternMonth = (now: Date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric' }).format(now))
export function isDraftRuleDue(rule: DraftRule, months: number[], now: Date): boolean {
  return rule.enabled && !!rule.nextRunAt && new Date(rule.nextRunAt) <= now && (!months.length || months.includes(easternMonth(now)))
}
type MarketingSnapshot = Awaited<ReturnType<typeof getMarketingSnapshot>>

export async function prepareCampaignDraft(slug: string, dueOnly = false, now = new Date(), sharedSnapshot?: MarketingSnapshot) {
  const campaign = automationDefinitions().find(c => c.slug === slug)
  if (!campaign) throw new Error('Unknown campaign rule')
  // Avoid customer/order queries for rules that are not due. The transaction checks again.
  if (dueOnly) {
    const setting = await prisma.systemSetting.findUnique({ where: { category_key: { category: 'marketing_draft_rules', key: slug } } })
    if (!isDraftRuleDue(parseDraftRule(setting?.value), campaign.months, now)) return { prepared: false, reason: 'Rule is not due in its seasonal window.' }
  }
  const snapshot = sharedSnapshot ?? await getMarketingSnapshot()
  const audience = getCampaignAudience(campaign, snapshot)
  if (audience.count === 0) return { prepared: false, reason: 'No eligible contacts currently match this audience.' }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`marketing-draft:${slug}`}))`
    const setting = await tx.systemSetting.findUnique({ where: { category_key: { category: 'marketing_draft_rules', key: slug } } })
    const rule = parseDraftRule(setting?.value)
    if (dueOnly && !isDraftRuleDue(rule, campaign.months, now)) return { prepared: false, reason: 'Rule is not due in its seasonal window.' }
    if (rule.lastDraftId) {
      const previous = await tx.emailTemplateMarketing.findUnique({ where: { id: rule.lastDraftId } })
      if (previous && ['draft','review_ready','scheduled','scheduled_review','partial'].includes(previous.status)) return { prepared: false, reason: 'A draft is already waiting for review.', draftId: previous.id }
    }
    const blocks = campaignToBlocks(campaign) as unknown as Block[]
    const draft = await tx.emailTemplateMarketing.create({ data: {
      name: campaign.name, subject: campaign.subject, status: 'draft', isActive: true,
      segment: automationSegmentForCampaign(slug) || 'all',
      content: JSON.stringify({ blocks, preheader: campaign.preheader, visualStyle: campaign.visualStyle }),
      renderedHtml: blocksToHtml(blocks, VISUAL_THEMES[campaign.visualStyle]),
    } })
    const next: DraftRule = { ...rule, lastPreparedAt: now.toISOString(), lastDraftId: draft.id, nextRunAt: new Date(now.getTime() + rule.intervalDays * 86400000).toISOString() }
    await tx.systemSetting.upsert({ where: { category_key: { category: 'marketing_draft_rules', key: slug } }, create: { category: 'marketing_draft_rules', key: slug, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } })
    return { prepared: true, draftId: draft.id, reason: 'Draft prepared for review. No email sent.' }
  })
}
export async function prepareDueMarketingDrafts(now = new Date()) {
  const rules = await prisma.systemSetting.findMany({ where: { category: 'marketing_draft_rules' } })
  const campaigns = new Map(automationDefinitions().map(c => [c.slug, c]))
  const dueRules = rules.filter(setting => {
    const campaign = campaigns.get(setting.key)
    return !!campaign && isDraftRuleDue(parseDraftRule(setting.value), campaign.months, now)
  })
  if (!dueRules.length) return []
  // One snapshot serves the entire due batch instead of one full read per enabled rule.
  const snapshot = await getMarketingSnapshot()
  const results = []
  for (const setting of dueRules) {
    try { results.push({ slug: setting.key, ...await prepareCampaignDraft(setting.key, true, now, snapshot) }) }
    catch { results.push({ slug: setting.key, error: 'Draft preparation failed' }) }
  }
  return results
}
