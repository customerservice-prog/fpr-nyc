export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { getEasternParts, easternTimeLabel, TIMEZONE, FREQUENCY_RULES, SCHEDULE_CONFIG } from '@/lib/marketing/schedule'
import { getMarketingSnapshot, getCampaignAudience, type MarketingSnapshot } from '@/lib/marketing/audience'
import { getCampaignBySlug } from '@/lib/marketing/campaignLibrary'
import { AUTO_SCHEDULE_CONFIG, isAutomationSendWindow } from '@/lib/marketing/planner'

// Calendar and audience facts only. Activation, suppression, frequency, and
// duplicate checks run separately immediately before a real delivery.
function marketingScheduleCampaigns(snapshot: MarketingSnapshot, now: Date) {
  return Object.entries(SCHEDULE_CONFIG).map(([slug, manualConfig]) => {
    const automaticConfig = AUTO_SCHEDULE_CONFIG[slug]
    const supported = !!automaticConfig
    const definition = getCampaignBySlug(slug)
    const audience = definition ? getCampaignAudience(definition, snapshot) : null
    const planned = supported ? snapshot.campaignAudiences?.[slug] : undefined
    const config = automaticConfig || manualConfig
    const seasonal = config.type === 'seasonal' ? config : null
    const manualSeasonal = manualConfig.type === 'seasonal' ? manualConfig : null
    const dueRecipients = planned?.dueCount ?? 0
    const timingAndAudienceReady = supported && dueRecipients > 0 && isAutomationSendWindow(now)
    return {
      slug, name: definition?.name ?? slug, family: definition?.family ?? null,
      automaticSupported: supported, requiresManualReview: !supported,
      scheduleSource: supported ? 'Automatic campaign policy' : 'Manual campaign idea',
      scheduleType: config.type,
      activeMonths: seasonal?.activeMonths ?? null,
      preferredDay: seasonal?.preferredDay ?? null,
      preferredTime: seasonal?.preferredTime ?? null,
      plannedTouches: seasonal?.plannedTouches ?? null,
      touchPlanNote: supported ? 'A finite number of seasonal touches; each recipient is rechecked before delivery.' : manualSeasonal?.touchPlanNote ?? null,
      conditionRequired: manualSeasonal?.conditionRequired ?? null,
      opportunityDriven: !!manualSeasonal?.opportunityDriven,
      trigger: manualConfig.type === 'triggered' ? manualConfig.trigger : null,
      priorityTier: config.priorityTier,
      priorityLabel: manualConfig.priorityLabel,
      isActiveWindow: supported && (!seasonal || seasonal.activeMonths.includes(getEasternParts(now).month)),
      isPreferredSlotNow: timingAndAudienceReady,
      eligibleToday: timingAndAudienceReady,
      timingAndAudienceReady,
      dueRecipients,
      nextRunAt: planned?.nextRunAt ?? null,
      reasons: supported
        ? [planned?.label || 'A current customer-history plan is required.',
          'Timing and audience only. Sending still requires activation, campaign selection, delivery readiness, and recipient protections.']
        : [audience?.primaryLabel || 'Manual audience review required.', 'No automatic send or fixed run is scheduled for this template.'],
      estimatedAudience: audience ? { count: audience.count, primaryLabel: audience.primaryLabel } : null,
    }
  })
}

export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  const now = new Date()
  const snapshot = await getMarketingSnapshot(now)
  return NextResponse.json({
    generatedAt: now.toISOString(), timezone: TIMEZONE,
    currentEasternTime: easternTimeLabel(now), frequencyRules: FREQUENCY_RULES,
    recommendationSource: 'Automatic campaign policies use verified customer history and an initial operating schedule. Other templates are manual campaign ideas.',
    campaigns: marketingScheduleCampaigns(snapshot, now),
  })
}
