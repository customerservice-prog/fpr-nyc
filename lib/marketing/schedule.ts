// Marketing Admin scheduling configuration and eligibility engine.
//
// Separate from campaignLibrary.ts (which owns campaign content/design) so
// scheduling metadata can be added without editing the large CAMPAIGN_LIBRARY file.
//
// IMPORTANT: all day/time values below are an INITIAL RECOMMENDED SCHEDULE.
// Friendly Party Rental has not yet sent enough (or any) campaigns through this
// Marketing Admin to have proven best-send-time performance data. Never present
// these as "based on past performance" - always label as an initial operating schedule.
//
// Real customer sending remains disabled at the server level regardless of what
// this module calculates. This module only computes recommendations and readiness -
// it never sends anything and never marks anything as sent.

import { AUTO_SCHEDULE_CONFIG, seasonalTouchDates } from '@/lib/marketing/planner'

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

export const TIMEZONE = 'America/New_York'

export interface SeasonalScheduleConfig {
type: 'seasonal'
activeMonths: number[]
preferredDay: DayOfWeek
preferredTime: string
plannedTouches: number
touchPlanNote?: string
conditionRequired?: string
opportunityDriven?: boolean
priorityTier: 1 | 2 | 3 | 4 | 5
priorityLabel: string
}

export interface TriggeredScheduleConfig {
type: 'triggered'
trigger: string
priorityTier: 1 | 2 | 3 | 4 | 5
priorityLabel: string
}

export type ScheduleConfig = SeasonalScheduleConfig | TriggeredScheduleConfig

export const PRIORITY_LABELS: Record<number, string> = {
1: 'Upcoming existing customer / add-on opportunity',
2: 'Annual / same-season rebooking',
3: 'Strong category or event-history match',
4: 'Broad seasonal campaign',
5: 'Generic category / product spotlight',
}

// Frequency protection - initial starting rules. Applies to promotional email
// only. Transactional/service communication (payment and balance notices, order
// confirmations, delivery/pickup information, order changes, service
// communications) is tracked separately and never counts against these caps.
export const FREQUENCY_RULES = {
hardCapCount: 1,
hardCapWindowDays: 7,
softCapCount: 3,
softCapWindowDays: 30,
}

export const SCHEDULE_CONFIG: Record<string, ScheduleConfig> = {
'wedding-planning-season': {
type: 'seasonal', activeMonths: [1, 2, 3], preferredDay: 'Wednesday', preferredTime: '10:00',
plannedTouches: 3, touchPlanNote: 'Approximately 3 deliberate touches across the active window, not weekly.',
priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'wedding-tent-seating': {
type: 'seasonal', activeMonths: [2, 3, 4], preferredDay: 'Tuesday', preferredTime: '10:00',
plannedTouches: 3, priorityTier: 3, priorityLabel: PRIORITY_LABELS[3],
},
'spring-event-planning': {
type: 'seasonal', activeMonths: [2, 3], preferredDay: 'Thursday', preferredTime: '10:00',
plannedTouches: 2, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'graduation-early-booking': {
type: 'seasonal', activeMonths: [3, 4], preferredDay: 'Tuesday', preferredTime: '10:00',
plannedTouches: 3, touchPlanNote: 'Early awareness, planning, then action.',
priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'wedding-reception-essentials': {
type: 'seasonal', activeMonths: [3, 4], preferredDay: 'Thursday', preferredTime: '10:00',
plannedTouches: 2, priorityTier: 5, priorityLabel: PRIORITY_LABELS[5],
},
'graduation-tent-availability': {
type: 'seasonal', activeMonths: [3, 4], preferredDay: 'Wednesday', preferredTime: '10:00',
plannedTouches: 2, conditionRequired: 'Do not make unverified availability claims.',
priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'graduation-tables-chairs': {
type: 'seasonal', activeMonths: [3, 4], preferredDay: 'Thursday', preferredTime: '10:00',
plannedTouches: 2, priorityTier: 5, priorityLabel: PRIORITY_LABELS[5],
},
'wedding-last-availability': {
type: 'seasonal', activeMonths: [4, 5], preferredDay: 'Tuesday', preferredTime: '10:00',
plannedTouches: 2, conditionRequired: 'Only use "last availability" or "limited availability" language when supported by actual availability data.',
priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'graduation-party-package': {
type: 'seasonal', activeMonths: [4, 5], preferredDay: 'Wednesday', preferredTime: '10:00',
plannedTouches: 3, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'graduation-last-availability': {
type: 'seasonal', activeMonths: [5], preferredDay: 'Thursday', preferredTime: '10:00',
plannedTouches: 2, conditionRequired: 'Condition required. Never manufacture scarcity.',
priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
},
'backyard-summer-events': {
    type: 'seasonal', activeMonths: [5, 6], preferredDay: 'Wednesday', preferredTime: '10:00',
    plannedTouches: 3, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'family-event-package': {
    type: 'seasonal', activeMonths: [5, 6], preferredDay: 'Thursday', preferredTime: '10:00',
    plannedTouches: 2, priorityTier: 5, priorityLabel: PRIORITY_LABELS[5],
    },
    'inflatable-waterslide-season': {
    type: 'seasonal', activeMonths: [6, 7], preferredDay: 'Wednesday', preferredTime: '10:00',
    plannedTouches: 3, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'corporate-picnic-season': {
    type: 'seasonal', activeMonths: [6, 7], preferredDay: 'Tuesday', preferredTime: '09:30',
    plannedTouches: 2, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'summer-weekend-availability': {
    type: 'seasonal', activeMonths: [6, 7, 8], preferredDay: 'Thursday', preferredTime: '10:00',
    plannedTouches: 0, opportunityDriven: true,
    touchPlanNote: 'Opportunity/availability-driven - queues only when real booking-pace data supports it, not every Thursday.',
    priorityTier: 3, priorityLabel: 'Strong category/event-history match (availability-driven)',
    },
    'fall-events': {
    type: 'seasonal', activeMonths: [9], preferredDay: 'Wednesday', preferredTime: '10:00',
    plannedTouches: 2, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'fall-tent-rentals': {
    type: 'seasonal', activeMonths: [9, 10], preferredDay: 'Tuesday', preferredTime: '10:00',
    plannedTouches: 2, priorityTier: 3, priorityLabel: PRIORITY_LABELS[3],
    },
    'halloween-fall-party': {
    type: 'seasonal', activeMonths: [9, 10], preferredDay: 'Thursday', preferredTime: '10:00',
    plannedTouches: 3, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'corporate-holiday-early-planning': {
    type: 'seasonal', activeMonths: [9, 10], preferredDay: 'Tuesday', preferredTime: '09:30',
    plannedTouches: 2, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'holiday-corporate-events': {
    type: 'seasonal', activeMonths: [10, 11], preferredDay: 'Tuesday', preferredTime: '09:30',
    plannedTouches: 2, priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },
    'new-years-eve-events': {
    type: 'seasonal', activeMonths: [11, 12], preferredDay: 'Thursday', preferredTime: '10:00',
    plannedTouches: 3, touchPlanNote: 'Stop when continued promotion is no longer operationally useful.',
    priorityTier: 4, priorityLabel: PRIORITY_LABELS[4],
    },

    'photo-booth-spotlight': { type: 'triggered', trigger: 'General product awareness - queued opportunistically, not on a fixed weekday.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'annual-rebooking': { type: 'triggered', trigger: 'Customer enters their annual rebooking window and has not already rebooked.', priorityTier: 2, priorityLabel: PRIORITY_LABELS[2] },
    'dormant-winback': { type: 'triggered', trigger: 'Customer has not booked in 12+ months.', priorityTier: 2, priorityLabel: PRIORITY_LABELS[2] },
    'open-availability-opportunity': { type: 'triggered', trigger: 'Marketing Brain detects a specific upcoming weekend running behind booking pace.', priorityTier: 3, priorityLabel: 'Strong category/event-history match (availability-driven)' },
    'wedding-photobooth-spotlight': { type: 'triggered', trigger: 'Upcoming wedding order exists without a photo booth already included.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'wedding-lighting-ambiance': { type: 'triggered', trigger: 'Upcoming wedding order exists without event lighting already included.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'holiday-photo-booth': { type: 'triggered', trigger: 'Upcoming corporate/family holiday order exists without a photo booth already included.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'corporate-annual-rebooking': { type: 'triggered', trigger: 'Company booked a corporate event roughly a year ago and has not rebooked.', priorityTier: 2, priorityLabel: PRIORITY_LABELS[2] },
    'same-season-rebooking': { type: 'triggered', trigger: "Customer's past event happened in the same season last year.", priorityTier: 2, priorityLabel: PRIORITY_LABELS[2] },
    'dormant-18-month-winback': { type: 'triggered', trigger: 'Customer did not respond to the 12-month winback and remains dormant at 18 months.', priorityTier: 2, priorityLabel: PRIORITY_LABELS[2] },
    'repeat-customer-appreciation': { type: 'triggered', trigger: 'Customer has booked multiple times - periodic loyalty touch, not a hard sell.', priorityTier: 3, priorityLabel: PRIORITY_LABELS[3] },
    'high-value-personal-outreach': { type: 'triggered', trigger: 'Customer meets top-tier lifetime-value criteria - short personal note, not a bulk send.', priorityTier: 3, priorityLabel: PRIORITY_LABELS[3] },
    'past-customer-reengagement': { type: 'triggered', trigger: 'Past customer who does not fit the annual-rebooking or dormant windows.', priorityTier: 4, priorityLabel: PRIORITY_LABELS[4] },
    'tent-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'tables-chairs-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'linen-styling-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'yard-games-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'concessions-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'dance-floor-stage-spotlight': { type: 'triggered', trigger: 'Standalone product education spotlight - queued opportunistically.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    'newly-opened-date': { type: 'triggered', trigger: 'A cancellation or schedule change opens a specific real date.', priorityTier: 3, priorityLabel: 'Strong category/event-history match (availability-driven)' },
    'last-minute-weekend-opportunity': { type: 'triggered', trigger: 'Marketing Brain detects a specific upcoming weekend running behind typical booking pace.', priorityTier: 3, priorityLabel: 'Strong category/event-history match (availability-driven)' },
    'underutilized-category-opportunity': { type: 'triggered', trigger: 'Marketing Brain detects a specific rental category with unusually high current availability.', priorityTier: 3, priorityLabel: 'Strong category/event-history match (availability-driven)' },
    'upsell-lighting-addon': { type: 'triggered', trigger: 'Existing order does not already include event lighting.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'upsell-photobooth-addon': { type: 'triggered', trigger: 'Existing order does not already include a photo booth.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'upsell-games-addon': { type: 'triggered', trigger: 'Existing order does not already include yard games.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'upsell-linens-addon': { type: 'triggered', trigger: 'Existing order does not already include linens/table styling.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'upsell-extra-seating-addon': { type: 'triggered', trigger: 'Existing order could reasonably use additional tables/chairs capacity.', priorityTier: 1, priorityLabel: PRIORITY_LABELS[1] },
    'new-product-launch': { type: 'triggered', trigger: 'A new product or service is added to the rental catalog.', priorityTier: 5, priorityLabel: PRIORITY_LABELS[5] },
    }

    export interface EasternParts {
    weekday: DayOfWeek
    year: number
    month: number
    day: number
    hour: number
    minute: number
    }

    // DST-safe America/New_York wall-clock parts via Intl - no extra dependency.
    export function getEasternParts(date: Date = new Date()): EasternParts {
    const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const parts = fmt.formatToParts(date)
    const get = (t: string) => parts.find(p => p.type === t)?.value || ''
    const hourRaw = Number(get('hour'))
    return {
    weekday: get('weekday') as DayOfWeek,
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: hourRaw === 24 ? 0 : hourRaw,
    minute: Number(get('minute')),
    }
    }

    export function easternTimeLabel(date: Date = new Date()): string {
    const p = getEasternParts(date)
    const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12
    const ampm = p.hour < 12 ? 'AM' : 'PM'
    const hh = String(p.hour).padStart(2, '0')
    const mm = String(p.minute).padStart(2, '0')
    return `${p.weekday} ${hh}:${mm} ET (${h12}:${mm} ${ampm})`
    }

    function timeStringToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
    }

    export interface SchedulingEligibility {
    slug: string
    found: boolean
    type: 'seasonal' | 'triggered' | 'unknown'
    isActiveWindow: boolean
    isPreferredSlotNow: boolean
    eligibleToday: boolean
    reasons: string[]
    }

    /**
     *  * Calendar/time-of-day eligibility only. Does NOT decide whether to actually
      * send - real send eligibility also requires: a planned touch being due, a
       * real eligible audience, frequency caps being respected, no higher-priority
        * campaign being more relevant to that recipient, no inappropriate
         * acquisition messaging to an already-booked customer, any availability or
          * scarcity claim being verifiable against real data, and the campaign
           * passing its readiness/compliance checks. See resolveCampaignPriority() and
            * checkFrequencyProtection() below for the recipient-level pieces.
             */
             export function getSchedulingEligibility(slug: string, now: Date = new Date()): SchedulingEligibility {
             const config = SCHEDULE_CONFIG[slug]
             if (!config) {
             return { slug, found: false, type: 'unknown', isActiveWindow: false, isPreferredSlotNow: false, eligibleToday: false, reasons: ['No schedule configured for this campaign yet.'] }
             }
             const reasons: string[] = []
             const parts = getEasternParts(now)

             if (config.type === 'triggered') {
             reasons.push(`Always-On / trigger-based: ${config.trigger}`)
             reasons.push('Not evaluated on a fixed weekday - only queues when the real condition above is actually met.')
             return { slug, found: true, type: 'triggered', isActiveWindow: true, isPreferredSlotNow: false, eligibleToday: false, reasons }
             }

             const isActiveWindow = config.activeMonths.includes(parts.month)
             if (!isActiveWindow) {
             reasons.push(`Outside active window (active months: ${config.activeMonths.join(', ')}; current month: ${parts.month}).`)
             }

             const isPreferredDay = parts.weekday === config.preferredDay
             const nowMinutes = parts.hour * 60 + parts.minute
             const preferredMinutes = timeStringToMinutes(config.preferredTime)
             const deliveryWindowMinutes = 120
             const withinTimeWindow = nowMinutes >= preferredMinutes && nowMinutes <= preferredMinutes + deliveryWindowMinutes
             const isPreferredSlotNow = isPreferredDay && withinTimeWindow

             if (!isPreferredDay) {
             reasons.push(`Today (${parts.weekday}) is not this campaign's preferred send day (${config.preferredDay}).`)
             } else if (nowMinutes < preferredMinutes) {
             reasons.push(`Today is the preferred day, but it is before the ${config.preferredTime} ET delivery window.`)
             } else if (nowMinutes > preferredMinutes + deliveryWindowMinutes) {
             reasons.push(`Today's ${config.preferredTime} ET delivery window has already passed.`)
             }

             if (config.opportunityDriven) {
             reasons.push('Opportunity/availability-driven - even on the preferred day, this only queues when real booking-pace data supports it, not automatically.')
             }
             if (config.conditionRequired) {
             reasons.push(`Condition required before sending: ${config.conditionRequired}`)
             }

             const eligibleToday = isActiveWindow && isPreferredSlotNow && !config.opportunityDriven

             if (eligibleToday) {
             reasons.push('In active window and inside the preferred delivery window - still subject to touch plan, audience, frequency cap, and priority checks below.')
             }

             return { slug, found: true, type: 'seasonal', isActiveWindow, isPreferredSlotNow, eligibleToday, reasons }
             }

             export function getAllSchedulingEligibility(now: Date = new Date()): SchedulingEligibility[] {
             return Object.keys(SCHEDULE_CONFIG).map(slug => getSchedulingEligibility(slug, now))
             }


             // ---- Frequency protection ----
             // Real, persisted send history for FUTURE use once customer sending is
             // enabled. The MarketingSendLog table stays empty today because sending is
             // disabled - these functions simply return "no history yet" until then, so
             // the safeguards are real code now instead of a future redesign.

             export interface FrequencyStatus {
             email: string
             sentLast7Days: number
             sentLast30Days: number
             hardCapExceeded: boolean
             softCapExceeded: boolean
             mostRecentSendAt: Date | null
             mostRecentCampaignSlug: string | null
             allowed: boolean
             reason: string | null
             }

             export async function checkFrequencyProtection(email: string, now: Date = new Date(), excludeClaimId?: string): Promise<FrequencyStatus> {
             const { prisma } = await import('@/lib/prisma')
             const normalized = email.trim().toLowerCase()
             const sevenDaysAgo = new Date(now.getTime() - FREQUENCY_RULES.hardCapWindowDays * 24 * 60 * 60 * 1000)
             const thirtyDaysAgo = new Date(now.getTime() - FREQUENCY_RULES.softCapWindowDays * 24 * 60 * 60 * 1000)

             const logs = await prisma.marketingSendLog.findMany({
             where: { email: normalized, sentAt: { gte: thirtyDaysAgo } },
             orderBy: { sentAt: 'desc' },
             select: { sentAt: true, campaignSlug: true, runId: true },
             })

             // Durable claims also reserve the contact's frequency allowance when the
             // provider outcome is uncertain or its send log could not be saved.
             const claims = await prisma.marketingSendClaim.findMany({
               where: { email: normalized, claimedAt: { gte: thirtyDaysAgo }, status: { in: ['sent','ambiguous','claimed'] }, ...(excludeClaimId ? { id: { not: excludeClaimId } } : {}) },
               select: { claimedAt: true, campaignSlug: true, runId: true },
             })
             const loggedRuns = new Set(logs.map(log => log.runId).filter(Boolean))
             const recent = [...logs, ...claims.filter(claim => !loggedRuns.has(claim.runId)).map(claim => ({ sentAt: claim.claimedAt, campaignSlug: claim.campaignSlug, runId: claim.runId }))].sort((a,b) => b.sentAt.getTime() - a.sentAt.getTime())
             const sentLast7Days = recent.filter(r => r.sentAt >= sevenDaysAgo).length
             const sentLast30Days = recent.length
             const hardCapExceeded = sentLast7Days >= FREQUENCY_RULES.hardCapCount
             const softCapExceeded = sentLast30Days >= FREQUENCY_RULES.softCapCount
             const mostRecent = recent[0] || null

             let reason: string | null = null
             if (hardCapExceeded) {
             reason = `Recipient already received a promotional email in the last ${FREQUENCY_RULES.hardCapWindowDays} days (${mostRecent?.campaignSlug ?? 'unknown campaign'}).`
             } else if (softCapExceeded) {
             reason = `Recipient has reached the ${FREQUENCY_RULES.softCapCount}-email soft cap for the last ${FREQUENCY_RULES.softCapWindowDays} days.`
             }

             return {
             email: normalized,
             sentLast7Days,
             sentLast30Days,
             hardCapExceeded,
             softCapExceeded,
             mostRecentSendAt: mostRecent?.sentAt ?? null,
             mostRecentCampaignSlug: mostRecent?.campaignSlug ?? null,
             allowed: !hardCapExceeded && !softCapExceeded,
             reason,
             }
             }

             // ---- Priority resolution ----
             // Given multiple campaigns a recipient could receive today, pick the single
             // most relevant one and report why the others were suppressed. Does not
             // send anything - callers decide what to do with the result.

             export interface CampaignCandidate {
             slug: string
             priorityTier: number
             }

             export interface PriorityResolution {
             selectedSlug: string | null
             suppressed: { slug: string; reason: string }[]
             }

             export function resolveCampaignPriority(candidates: CampaignCandidate[]): PriorityResolution {
             if (candidates.length === 0) {
             return { selectedSlug: null, suppressed: [] }
             }
             const sorted = [...candidates].sort((a, b) => a.priorityTier - b.priorityTier)
             const winner = sorted[0]
             const suppressed = sorted.slice(1).map(c => ({
             slug: c.slug,
             reason: `Suppressed - a higher-priority campaign (${winner.slug}, ${PRIORITY_LABELS[winner.priorityTier]}) is more relevant for this recipient right now.`,
             }))
             return { selectedSlug: winner.slug, suppressed }
             }

             // Example suppression message for a recipient who already received a
             // higher-priority campaign within the frequency window (used by the
             // Scheduler UI to explain, not to send):
             // "Suppressed - recipient received a higher-priority marketing campaign 3 days ago."
             export function frequencySuppressionMessage(daysAgo: number, campaignSlug: string): string {
             const days = daysAgo === 1 ? '1 day' : `${daysAgo} days`
             return `Suppressed - recipient received a higher-priority marketing campaign (${campaignSlug}) ${days} ago.`
             }
             
             // Given a seasonal campaign slug, returns the next date (YYYY-MM-DD) on or
             // after `now` that falls within one of the campaign's active months AND
             // matches its preferred weekday. Used by the Scheduler UI to show the next
             // planned/eligible touch date. Triggered and opportunity-driven campaigns
             // have no fixed calendar slot, so this returns null for those.
             export function getNextPreferredOccurrence(slug: string, now: Date = new Date()): string | null {
               const config = AUTO_SCHEDULE_CONFIG[slug]
               if (!config || config.type !== 'seasonal') return null
               const year = getEasternParts(now).year
               const next = [year, year + 1].flatMap(y => seasonalTouchDates(slug, y))
                 .find(date => date.getTime() >= now.getTime())
               if (!next) return null
               const parts = getEasternParts(next)
               return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
             }
