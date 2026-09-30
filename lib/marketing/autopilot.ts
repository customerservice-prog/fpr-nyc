import { prisma } from '@/lib/prisma'
import { CAMPAIGN_LIBRARY, campaignToBlocks, VISUAL_THEMES } from '@/lib/marketing/campaignLibrary'
import { blocksToHtml, type Block } from '@/lib/marketing/emailRenderer'
import { getAutomationPlan, refreshRecipientOpportunity } from '@/lib/marketing/plannerData'
import { isAutomationSendWindow, AUTO_SCHEDULE_CONFIG, type AutomationOpportunity } from '@/lib/marketing/planner'
import { dailyMarketingUsage, marketingPacing, fairMarketingQueue } from '@/lib/marketing/queue'
import { getAutopilotConfig, hasCurrentApproval, updateAutopilotConfig, revokeApproval, approvalFingerprint, type AutopilotConfig } from '@/lib/marketing/autopilotSettings'
import { acquireLaunchLock, heartbeatLaunchLock, releaseLaunchLock, processClaimedSend, validateFinalEmailLinks } from '@/lib/marketing/launch'
import { marketingTransportStatus, sendMarketingEmail } from '@/lib/marketing/delivery'
import { feedbackMonitorStatus } from '@/lib/marketing/feedbackMonitor'
import { feedbackHeaders } from '@/lib/marketing/feedbackToken'
import { wrapEmail, unsubscribeHeaders } from '@/lib/marketing/message'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'

const ORIGIN = NYC_PUBLIC_ORIGIN
const DAY = 86400000
const SCHEDULER_KEY = { category: 'marketing_scheduler', key: 'last_run' }

export function campaignEmail(slug: string) {
  const campaign = CAMPAIGN_LIBRARY.find(c => c.slug === slug)
  if (!campaign) throw new Error('Unknown campaign')
  const blocks = campaignToBlocks(campaign) as Block[]
  const html = blocksToHtml(blocks, VISUAL_THEMES[campaign.visualStyle])
  return { campaign, blocks, html, subject: campaign.subject }
}

async function schedulerState() {
  const row = await prisma.systemSetting.findUnique({ where: { category_key: SCHEDULER_KEY } })
  try { return row?.value ? JSON.parse(row.value) : null } catch { return null }
}

export async function autopilotReadiness(config: AutopilotConfig, now = new Date(), runningScheduler = false) {
  const transport = marketingTransportStatus()
  const [scheduler, feedback] = await Promise.all([schedulerState(), feedbackMonitorStatus(now)])
  const heartbeatFresh = runningScheduler || (!!scheduler?.completedAt && Number.isFinite(Date.parse(scheduler.completedAt)) && now.getTime() - Date.parse(scheduler.completedAt) < 20 * 60000)
  const contentValid = config.enabledCampaigns.every(slug => {
    const email = campaignEmail(slug)
    return validateFinalEmailLinks(wrapEmail(email.html, 'preview@friendlypartyrental.com', ORIGIN, email.campaign.preheader), ORIGIN).valid
  })
  const checks = [
    { key: 'feedback', label: 'Automatic delivery monitoring', ok: feedback.ready, detail: feedback.ready ? `The sending mailbox is checked for verified bounce and abuse reports. ${feedback.state?.matched || 0} matched reports; ${feedback.state?.unmatched || 0} older or unmatched reports need mailbox review. Sending stops if monitoring becomes unavailable. Providers may not report individual spam complaints.` : feedback.configured ? 'Waiting for a successful mailbox check. Automatic sending stays blocked if the monitor fails or becomes stale.' : 'The sending mailbox must support secure feedback checks before automatic sending can start.' },
    { key: 'transport', label: 'Email connection', ok: transport.configured, detail: transport.configured ? `${transport.dedicated ? 'Dedicated marketing' : 'Existing business'} email connection configured. Activation verifies the connection without sending.` : 'Configure the business email connection before activating.' },
    { key: 'sender', label: 'Sending address configured', ok: !!transport.senderDomain, detail: transport.senderDomain ? `Sending domain: ${transport.senderDomain}. This confirms the configured address, not domain authentication or inbox delivery.` : 'A valid sending address is required.' },
    { key: 'scheduler', label: 'Automatic checks', ok: heartbeatFresh, detail: heartbeatFresh ? 'Scheduler is checking every five minutes.' : 'The scheduler has not checked in within 20 minutes.' },
    { key: 'campaigns', label: 'Selected campaigns', ok: config.enabledCampaigns.length > 0, detail: `${config.enabledCampaigns.length} targeted campaigns selected. Unverified scarcity campaigns stay manual.` },
    { key: 'content', label: 'Email links', ok: contentValid, detail: contentValid ? 'Selected templates pass the link preflight.' : 'A selected template has an invalid link and needs review.' },
  ]
  return { ready: checks.every(c => c.ok), checks }
}

// Every candidate remains reviewable; successful/uncertain claims and frequency
// caps are applied before choosing the highest-priority offer for each inbox.
export async function availableOpportunities(opportunities: AutomationOpportunity[], config: AutopilotConfig, now = new Date()) {
  const enabled = opportunities.filter(o => config.enabledCampaigns.includes(o.slug))
  if (!enabled.length) return []
  const emails = [...new Set(enabled.map(o => o.email))]
  const keys = [...new Set(enabled.map(o => o.occurrenceKey))]
  const [claims, sends, frequencyClaims, latestLogs, latestClaims] = await Promise.all([
    prisma.marketingSendClaim.findMany({ where: { campaignSlug: { in: keys }, email: { in: emails } }, select: { campaignSlug: true, email: true } }),
    prisma.marketingSendLog.findMany({ where: { email: { in: emails }, sentAt: { gte: new Date(now.getTime() - 30 * DAY) } }, select: { email: true, sentAt: true, runId: true } }),
    prisma.marketingSendClaim.findMany({ where: { email: { in: emails }, claimedAt: { gte: new Date(now.getTime() - 30 * DAY) }, status: { in: ['sent','ambiguous','claimed'] } }, select: { email: true, claimedAt: true, runId: true } }),
    prisma.marketingSendLog.groupBy({ by: ['email'], where: { email: { in: emails } }, _max: { sentAt: true } }),
    prisma.marketingSendClaim.groupBy({ by: ['email'], where: { email: { in: emails }, status: { in: ['sent', 'ambiguous', 'claimed'] } }, _max: { claimedAt: true } }),
  ])
  const lastContact = new Map<string, number>()
  for (const row of latestLogs) if (row._max.sentAt) lastContact.set(row.email, row._max.sentAt.getTime())
  for (const row of latestClaims) if (row._max.claimedAt) lastContact.set(row.email, Math.max(lastContact.get(row.email) || 0, row._max.claimedAt.getTime()))
  const claimed = new Set(claims.map(c => `${c.campaignSlug}\n${c.email}`))
  const loggedRuns = new Set(sends.filter(s => s.runId).map(s => `${s.email}\n${s.runId}`))
  const history = new Map<string, Date[]>()
  for (const event of [...sends, ...frequencyClaims.filter(c => !loggedRuns.has(`${c.email}\n${c.runId}`)).map(c => ({ email: c.email, sentAt: c.claimedAt }))]) {
    const list = history.get(event.email) || []
    list.push(event.sentAt); history.set(event.email, list)
  }
  const chosen = new Set<string>()
  const selected = enabled.filter(o => {
    if (chosen.has(o.email) || claimed.has(`${o.occurrenceKey}\n${o.email}`)) return false
    const recent = history.get(o.email) || []
    if (recent.length >= 3 || recent.some(sentAt => now.getTime() - sentAt.getTime() <= 7 * DAY)) return false
    chosen.add(o.email)
    return true
  })
  return fairMarketingQueue(selected, lastContact)
}

async function performanceSummary(now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY)
  const sends = await prisma.marketingSendLog.findMany({ where: { sentAt: { gte: since } }, select: { email: true, sentAt: true } })
  if (!sends.length) return { sent: 0, uniqueRecipients: 0, bookings: 0, bookedRevenue: 0, collectedRevenue: 0 }
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: since, lte: now }, status: { notIn: ['canceled','cancelled','quote','draft','incomplete'] }, customer: { email: { in: [...new Set(sends.map(s => s.email))], mode: 'insensitive' } } }, select: { createdAt: true, totalAmount: true, amountPaid: true, customer: { select: { email: true } } } })
  const attributed = orders.filter(o => sends.some(s => s.email === o.customer.email.trim().toLowerCase() && s.sentAt <= o.createdAt && o.createdAt.getTime() - s.sentAt.getTime() <= 30 * DAY))
  return { sent: sends.length, uniqueRecipients: new Set(sends.map(s => s.email.trim().toLowerCase())).size, bookings: attributed.length, bookedRevenue: Math.round(attributed.reduce((sum,o) => sum + o.totalAmount,0) * 100) / 100, collectedRevenue: Math.round(attributed.reduce((sum,o) => sum + o.amountPaid,0) * 100) / 100 }
}

export async function getAutopilotStatus(now = new Date()) {
  const [config, plan, scheduler, recentRuns, performance] = await Promise.all([
    getAutopilotConfig(), getAutomationPlan(now), schedulerState(),
    prisma.marketingRun.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, campaignName: true, status: true, sentCount: true, failedCount: true, completedAt: true } }),
    performanceSummary(now),
  ])
  const [readiness, due, usage] = await Promise.all([autopilotReadiness(config, now), availableOpportunities(plan.opportunities, config, now), dailyMarketingUsage(now)])
  const approved = hasCurrentApproval(config, marketingTransportStatus().senderDomain)
  if (config.mode === 'automatic' && !approved) readiness.checks.push({ key: 'approval', label: 'Setup changed', ok: false, detail: 'Review and approve the current campaign content and limits to resume automatic sending.' })
  readiness.ready = readiness.checks.every(c => c.ok)
  const currentFingerprint = approvalFingerprint(config, marketingTransportStatus().senderDomain)
  const confirmationsCurrent = config.approvalFingerprint === currentFingerprint
  const domainConfirmed = confirmationsCurrent && config.domainAuthenticationConfirmed
  const feedbackConfirmed = confirmationsCurrent && config.feedbackMonitoringConfirmed
  const prerequisites = [
    { key: 'domainAuthentication', label: 'Verify your email identity', ok: domainConfirmed, detail: domainConfirmed ? 'An administrator confirmed SPF, DKIM and DMARC with the email provider for this setup. The website does not independently verify these records.' : 'Pending review: verify SPF, DKIM and DMARC with the email provider so receiving inboxes can recognize mail from your business. A configured email connection does not confirm this.' },
    { key: 'feedbackMonitoring', label: 'Handle failed deliveries and complaints', ok: feedbackConfirmed, detail: feedbackConfirmed ? 'Verified delivery reports suppress the recipient automatically. An administrator also confirmed responsibility for complaints that the provider does not expose automatically.' : 'Review the automatic mailbox monitor and confirm who handles complaints that the email provider does not report automatically.' },
    { key: 'audiencePermission', label: 'Review marketing permission', ok: confirmationsCurrent && config.audiencePermissionConfirmed, detail: 'A usable address and past rental do not establish marketing permission. Confirm permission for the selected customer groups before activation.' },
    { key: 'launchApproval', label: 'Approve customer sending', ok: approved, detail: approved ? 'The current campaigns and sending limits have administrator approval.' : 'Pending approval: review the emails, customer groups and limits, then explicitly enable sending. Saving or previewing the setup does not send customer emails.' },
  ]
  return {
    config: { ...config, reviewFingerprint: currentFingerprint }, readiness: { ...readiness, launchReady: readiness.ready && approved, prerequisites }, scheduler, recentRuns, performance, generatedAt: now.toISOString(),
    queue: { ...marketingPacing(now, config.dailyLimit, usage), preview: due.slice(0, 8).map(o => ({ email: o.email, campaign: CAMPAIGN_LIBRARY.find(c => c.slug === o.slug)!.name, reason: o.reason })) },
    summary: { customerRecords: plan.customerRecords, eligibleContacts: plan.eligibleCount, dueRecipients: due.length },
    campaigns: plan.campaigns.map(c => {
      const definition = CAMPAIGN_LIBRARY.find(d => d.slug === c.slug)!
      const timing = AUTO_SCHEDULE_CONFIG[c.slug]
      return { slug: c.slug, name: c.name, goal: definition.goal, enabled: config.enabledCampaigns.includes(c.slug), eligibleCount: c.audienceCount, dueCount: due.filter(o => o.slug === c.slug).length, nextRunAt: c.nextRunAt, audience: c.reason,
        cadence: timing?.type === 'seasonal' ? `${timing.plannedTouches} planned touches across its seasonal window; daily 9 am–5 pm ET.` : 'Checks real order history; one message per matching event or lifecycle occurrence, daily 9 am–5 pm ET.' }
    }),
  }
}

async function prepareReviewDraft(slug: string) {
  const email = campaignEmail(slug)
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`marketing-auto-draft:${slug}`}))`
    const existing = await tx.emailTemplateMarketing.findFirst({ where: { segment: `automation:${slug}`, status: { in: ['draft','review_ready','scheduled_review','scheduled','partial'] } } })
    if (existing) return 0
    await tx.emailTemplateMarketing.create({ data: {
      name: email.campaign.name, subject: email.subject, content: JSON.stringify({ blocks: email.blocks, preheader: email.campaign.preheader, visualStyle: email.campaign.visualStyle, automationSlug: slug }),
      renderedHtml: email.html, segment: `automation:${slug}`, status: 'review_ready', isActive: true,
    } })
    return 1
  })
}

export type AutopilotRunResult = { sent: number; failed: number; prepared: number; suppressed: number; mode: AutopilotConfig['mode']; blockedReason?: string; customerRecords?: number; eligibleContacts?: number; dueRecipients?: number; readinessReady?: boolean }

export async function runMarketingAutopilot(now = new Date()): Promise<AutopilotRunResult> {
  const clockAnchor = Date.now()
  const config = await getAutopilotConfig()
  const result: AutopilotRunResult = { sent: 0, failed: 0, prepared: 0, suppressed: 0, mode: config.mode }
  if (config.mode === 'paused') return { ...result, blockedReason: config.pauseReason || 'Automatic marketing is paused.' }
  const plan = await getAutomationPlan(now)
  const readiness = await autopilotReadiness(config, now, true)
  const available = await availableOpportunities(plan.opportunities, config, now)
  Object.assign(result, { customerRecords: plan.customerRecords, eligibleContacts: plan.eligibleCount, dueRecipients: available.length, readinessReady: readiness.ready })
  if (config.mode === 'review') {
    for (const slug of [...new Set(available.map(o => o.slug))]) {
      try { result.prepared += await prepareReviewDraft(slug) } catch { result.failed++ }
    }
    return result
  }
  if (!hasCurrentApproval(config, marketingTransportStatus().senderDomain)) return { ...result, blockedReason: 'The current setup needs administrator approval.' }
  if (!readiness.ready) return { ...result, blockedReason: 'A readiness check failed. Review Marketing settings.' }
  if (!isAutomationSendWindow(new Date(now.getTime() + Date.now() - clockAnchor))) return { ...result, blockedReason: 'Outside the daily 9 am–5 pm Eastern sending window.' }
  if (!available.length) return result

  const run = await prisma.marketingRun.create({ data: { campaignSlug: 'autopilot', campaignName: 'Automatic marketing', subject: 'Targeted campaigns', mode: 'automatic', segment: 'matched_order_history', requestedLimit: 1, resolvedAudienceCount: available.length, initiatedByName: config.approvedBy, status: 'queued' } })
  const lock = await acquireLaunchLock(run.id)
  if (!lock.acquired) {
    await prisma.marketingRun.update({ where: { id: run.id }, data: { status: 'blocked', errorMessage: 'Another marketing delivery is running.', completedAt: new Date() } })
    return { ...result, blockedReason: 'Another marketing delivery is running.' }
  }
  let attempted = 0
  let duplicate = 0
  const started = Date.now()
  try {
    await prisma.marketingRun.update({ where: { id: run.id }, data: { status: 'running', startedAt: new Date() } })
    // Counting durable claims also reserves capacity if a provider times out or
    // the process stops after acceptance but before recording the send log.
    const pacing = marketingPacing(now, config.dailyLimit, await dailyMarketingUsage(now))
    const limit = pacing.allowed ? Math.min(1, config.batchSize, pacing.remaining) : 0
    if (!limit) result.blockedReason = pacing.remaining ? 'Waiting for the next spaced sending slot.' : 'Daily marketing limit reached. Sending resumes tomorrow.'
    for (const opportunity of available.slice(0, limit)) {
      if (Date.now() - started > 45000) break
      const current = await getAutopilotConfig()
      if (!hasCurrentApproval(current, marketingTransportStatus().senderDomain) || current.approvalFingerprint !== config.approvalFingerprint) { result.blockedReason = 'Sending paused or configuration changed.'; break }
      if (!(await heartbeatLaunchLock(run.id)).ownsLock) { result.blockedReason = 'Delivery lock changed; remaining messages were stopped.'; break }
      const email = campaignEmail(opportunity.slug)
      const html = wrapEmail(email.html, opportunity.email, ORIGIN, email.campaign.preheader, { campaignSlug: opportunity.slug, runId: run.id })
      if (!validateFinalEmailLinks(wrapEmail(email.html, opportunity.email, ORIGIN, email.campaign.preheader), ORIGIN).valid) { result.failed++; result.blockedReason = 'A campaign failed its final link check.'; break }
      const outcome = await processClaimedSend({
        campaignSlug: opportunity.slug, campaignName: email.campaign.name, occurrenceKey: opportunity.occurrenceKey, email: opportunity.email, runId: run.id,
        recheck: async () => {
          const deliveryTime = new Date(now.getTime() + Date.now() - clockAnchor)
          const fresh = isAutomationSendWindow(deliveryTime) ? await refreshRecipientOpportunity(opportunity.email, opportunity.slug, opportunity.occurrenceKey, deliveryTime) : null
          const latest = await getAutopilotConfig()
          const active = hasCurrentApproval(latest, marketingTransportStatus().senderDomain) && latest.approvalFingerprint === config.approvalFingerprint
          const owned = (await heartbeatLaunchLock(run.id)).ownsLock
          return { allowed: !!fresh && active && owned, reason: 'Eligibility, order details, approval or delivery lock changed.' }
        },
        send: () => sendMarketingEmail({ to: opportunity.email, subject: email.subject, html, headers: { ...unsubscribeHeaders(ORIGIN, opportunity.email), ...feedbackHeaders(opportunity.email, run.id) } }),
      })
      if (outcome.outcome === 'sent') { result.sent++; attempted++ }
      else if (outcome.outcome === 'duplicate') duplicate++
      else if (outcome.outcome === 'suppressed') result.suppressed++
      else { result.failed++; attempted++; result.blockedReason = 'Email delivery needs attention. Automatic sending has been paused.'; break }
    }
  } catch {
    result.failed++
    result.blockedReason = 'Automatic delivery encountered an error. Review send history before resuming.'
  } finally {
    await releaseLaunchLock(run.id).catch(() => { result.failed++ })
  }
  if (result.failed) {
    await updateAutopilotConfig(current => current.approvalFingerprint === config.approvalFingerprint ? { ...revokeApproval(current, 'paused'), pauseReason: result.blockedReason || 'Delivery needs attention.' } : current).catch(() => {})
  }
  await prisma.marketingRun.update({ where: { id: run.id }, data: { status: result.failed ? 'partial' : 'completed', completedAt: new Date(), sentCount: result.sent, failedCount: result.failed, suppressedCount: result.suppressed, duplicateBlockedCount: duplicate, claimedCount: attempted, errorMessage: result.blockedReason || null } }).catch(() => { result.failed++ })
  return result
}

