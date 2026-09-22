import { prisma } from '@/lib/prisma'
import { getMarketingContacts, matchesMarketingSegment } from '@/lib/marketing/contacts'
import { getAutomationPlan } from '@/lib/marketing/plannerData'
import { AUTO_SCHEDULE_CONFIG, type AutomationPlan } from '@/lib/marketing/planner'
import { SCHEDULE_CONFIG } from '@/lib/marketing/schedule'
import type { CampaignDefinition } from '@/lib/marketing/campaignLibrary'

export type PlannedCampaignAudience = {
  count: number
  label: string
  dueCount: number
  nextRunAt: string | null
}

export interface MarketingSnapshot {
  totalCustomerRecords: number
  uniqueEmailIdentities: number
  eligibleContacts: number
  excluded: { invalidFormat: number; testRecord: number; suppressed: number; duplicate: number }
  payingReachableCustomers: number
  dormant12PlusMonths: number
  annualRebookingWindow: number
  upcomingEventCustomers: number
  campaignDraftRecords: number
  generatedAt: string
  campaignAudiences?: Record<string, PlannedCampaignAudience>
}

// The optional plan lets callers that already loaded it avoid a second planner query.
export async function getMarketingSnapshot(now = new Date(), existingPlan?: AutomationPlan): Promise<MarketingSnapshot> {
  const [contacts, campaignDraftRecords, plan] = await Promise.all([
    getMarketingContacts(),
    prisma.emailTemplateMarketing.count({ where: { status: { in: ['draft','review_ready','scheduled_review'] } } }),
    existingPlan ? Promise.resolve(existingPlan) : getAutomationPlan(now),
  ])
  const count = (segment: string) => contacts.filter(c => matchesMarketingSegment(c, segment)).length
  return {
    totalCustomerRecords: contacts.reduce((sum,c) => sum + c.customerIds.length, 0),
    uniqueEmailIdentities: contacts.filter(c => c.email).length,
    eligibleContacts: count('eligible'),
    payingReachableCustomers: contacts.filter(c => c.eligible && c.hasPaidOrder).length,
    dormant12PlusMonths: count('dormant'), annualRebookingWindow: count('annualRebooking'), upcomingEventCustomers: count('upcoming'), campaignDraftRecords,
    excluded: {
      invalidFormat: contacts.filter(c => c.reason === 'Invalid email').length,
      testRecord: contacts.filter(c => c.reason === 'Test record').length,
      suppressed: contacts.filter(c => c.reason === 'Unsubscribed or restricted').length,
      duplicate: contacts.reduce((sum,c) => sum + Math.max(0,c.customerIds.length - 1),0),
    },
    campaignAudiences: Object.fromEntries(plan.campaigns.map(c => [c.slug, {
      count: c.audienceCount, label: c.reason, dueCount: c.dueCount, nextRunAt: c.nextRunAt,
    }])),
    generatedAt: now.toISOString(),
  }
}

export interface CampaignAudience {
  count: number
  primaryLabel: string
  breakdown: { label: string; count: number }[]
}

export function getCampaignAudience(campaign: CampaignDefinition, snapshot: MarketingSnapshot): CampaignAudience {
  if (AUTO_SCHEDULE_CONFIG[campaign.slug]) {
    const planned = snapshot.campaignAudiences?.[campaign.slug]
    if (!planned) return {
      count: 0, primaryLabel: 'A current customer-history plan is required for this targeted campaign.',
      breakdown: [],
    }
    return {
      count: planned.count,
      primaryLabel: planned.label,
      breakdown: [
        { label: 'Matches the verified customer-history rule', count: planned.count },
        { label: 'In its offer window now, before delivery protections', count: planned.dueCount },
      ],
    }
  }
  const timing = SCHEDULE_CONFIG[campaign.slug]
  const specialAudience = campaign.family === 'lifecycle' || campaign.family === 'opportunity' ||
    (campaign.family === 'product' && campaign.tag !== 'product-spotlight') ||
    (timing?.type === 'seasonal' && (timing.opportunityDriven || !!timing.conditionRequired))
  if (specialAudience) return {
    count: 0,
    primaryLabel: 'Manual audience review required. This special trigger or availability condition is not enabled for automatic targeting.',
    breakdown: [],
  }
  const reachable = Math.max(0, snapshot.eligibleContacts - snapshot.upcomingEventCustomers)
  return {
    count: reachable,
    primaryLabel: 'Manual campaign only: broad eligible contacts without an upcoming booked event. Review the audience before sending.',
    breakdown: [
      { label: 'Total eligible contacts', count: snapshot.eligibleContacts },
      { label: 'Already have an upcoming booked event', count: snapshot.upcomingEventCustomers },
    ],
  }
}
