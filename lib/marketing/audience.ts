import { prisma } from '@/lib/prisma'
import { filterToMarketingEligible, normalizeEmail } from '@/lib/marketing/eligibility'

// Real, live audience + business-condition numbers for the Marketing
// Overview and Audiences pages. No hardcoded counts - everything here is
// computed from the actual Customer/Order tables at request time.
//
// Two Customer records can share the same email, and suppression /
// marketing identity is email-based - so this groups activity by
// normalized email first, then applies the shared eligibility service.

const DAY_MS = 24 * 60 * 60 * 1000
const DORMANT_DAYS = 365
const REBOOKING_MIN_DAYS = 270
const REBOOKING_MAX_DAYS = 456

export interface MarketingSnapshot {
    totalCustomerRecords: number
    uniqueEmailIdentities: number
    eligibleContacts: number
    excluded: {
      invalidFormat: number
      testRecord: number
      suppressed: number
      duplicate: number
    }
    payingReachableCustomers: number
    dormant12PlusMonths: number
    annualRebookingWindow: number
    upcomingEventCustomers: number
    campaignDraftRecords: number
    generatedAt: string
}

interface EmailActivity {
    customerIds: string[]
    hasPaidOrder: boolean
    mostRecentPastEventDate: Date | null
    hasUpcomingEvent: boolean
}

export async function getMarketingSnapshot(): Promise<MarketingSnapshot> {
    const [customers, orders, campaignDraftRecords] = await Promise.all([
          prisma.customer.findMany({ select: { id: true, email: true, firstName: true, lastName: true } }),
          prisma.order.findMany({ select: { customerId: true, eventDate: true, amountPaid: true, status: true } }),
          prisma.emailTemplateMarketing.count(),
        ])

  const totalCustomerRecords = customers.length
    const now = Date.now()

  const emailByCustomerId = new Map<string, string>()
    const activityByEmail = new Map<string, EmailActivity>()
    const nameByEmail = new Map<string, { firstName: string; lastName: string }>()

  for (const c of customers) {
        const email = normalizeEmail(c.email)
        if (!email) continue
        emailByCustomerId.set(c.id, email)
        if (!activityByEmail.has(email)) {
                activityByEmail.set(email, { customerIds: [], hasPaidOrder: false, mostRecentPastEventDate: null, hasUpcomingEvent: false })
        }
        activityByEmail.get(email)!.customerIds.push(c.id)
        if (!nameByEmail.has(email)) nameByEmail.set(email, { firstName: c.firstName, lastName: c.lastName })
  }

  for (const o of orders) {
        const email = emailByCustomerId.get(o.customerId)
        if (!email) continue
        const entry = activityByEmail.get(email)
        if (!entry) continue
        if (o.status === 'canceled') continue
        if ((o.amountPaid || 0) > 0) entry.hasPaidOrder = true
        if (o.eventDate.getTime() > now) {
                entry.hasUpcomingEvent = true
        } else if (!entry.mostRecentPastEventDate || o.eventDate > entry.mostRecentPastEventDate) {
                entry.mostRecentPastEventDate = o.eventDate
        }
  }

  const contacts = Array.from(activityByEmail.keys()).map((email) => ({
        email,
        firstName: nameByEmail.get(email)?.firstName,
        lastName: nameByEmail.get(email)?.lastName,
  }))
    const { eligible, excluded } = await filterToMarketingEligible(contacts)
    const eligibleSet = new Set(eligible)

  let payingReachableCustomers = 0
    let dormant12PlusMonths = 0
    let annualRebookingWindow = 0
    let upcomingEventCustomers = 0

  for (const [email, entry] of activityByEmail.entries()) {
        if (entry.hasUpcomingEvent) upcomingEventCustomers++
        if (!eligibleSet.has(email)) continue
        if (entry.hasPaidOrder) payingReachableCustomers++
        if (entry.mostRecentPastEventDate) {
                const daysSince = (now - entry.mostRecentPastEventDate.getTime()) / DAY_MS
                if (daysSince >= DORMANT_DAYS) dormant12PlusMonths++
                if (daysSince >= REBOOKING_MIN_DAYS && daysSince <= REBOOKING_MAX_DAYS) annualRebookingWindow++
        }
  }

  return {
        totalCustomerRecords,
        uniqueEmailIdentities: activityByEmail.size,
        eligibleContacts: eligible.length,
        excluded,
        payingReachableCustomers,
        dormant12PlusMonths,
        annualRebookingWindow,
        upcomingEventCustomers,
        campaignDraftRecords,
        generatedAt: new Date().toISOString(),
  }
}

import type { CampaignDefinition } from '@/lib/marketing/campaignLibrary'

export interface CampaignAudience {
    count: number
    primaryLabel: string
    breakdown: { label: string; count: number }[]
}

export function getCampaignAudience(campaign: CampaignDefinition, snapshot: MarketingSnapshot): CampaignAudience {
    if (campaign.slug === 'annual-rebooking') {
        return {
            count: snapshot.annualRebookingWindow,
            primaryLabel: 'Past customers roughly 9-15 months since their last event',
            breakdown: [{ label: 'Annual rebooking window', count: snapshot.annualRebookingWindow }]
        }
    }
    if (campaign.slug === 'dormant-winback') {
        return {
            count: snapshot.dormant12PlusMonths,
            primaryLabel: 'Past customers with no booking in 12+ months',
            breakdown: [{ label: 'Dormant 12+ months', count: snapshot.dormant12PlusMonths }]
        }
    }
    if (campaign.slug === 'open-availability-opportunity') {
        return {
            count: snapshot.eligibleContacts,
            primaryLabel: 'All eligible contacts - urgency comes from the specific open date range, not audience targeting',
            breakdown: [{ label: 'Eligible contacts', count: snapshot.eligibleContacts }]
        }
    }
    const reachable = Math.max(0, snapshot.eligibleContacts - snapshot.upcomingEventCustomers)
    return {
        count: reachable,
        primaryLabel: 'Eligible contacts without an already-booked upcoming event',
        breakdown: [
            { label: 'Total eligible contacts', count: snapshot.eligibleContacts },
            { label: 'Already have an upcoming booked event', count: snapshot.upcomingEventCustomers }
            ]
    }
}
