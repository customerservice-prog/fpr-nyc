import { prisma } from '@/lib/prisma'
import { prepareDueMarketingDrafts } from '@/lib/marketing/automations'
import { checkMarketingFeedback } from '@/lib/marketing/feedbackMonitor'
import { runMarketingAutopilot } from '@/lib/marketing/autopilot'

export const SCHEDULER_SETTING = { category: 'marketing_scheduler', key: 'last_run' }
export type SchedulerRun = {
  completedAt: string
  status: 'success' | 'partial' | 'failed'
  reviewsReady: number
  draftsPrepared: number
  errors: number
  emailsSent: number
  automationMode?: 'review' | 'automatic' | 'paused'
  blockedReason?: string
  recipientsSuppressed?: number
  eligibleContacts?: number
  dueRecipients?: number
  customerRecords?: number
  readinessReady?: boolean
}

export async function recordSchedulerRun(run: SchedulerRun) {
  await prisma.systemSetting.upsert({
    where: { category_key: SCHEDULER_SETTING },
    create: { ...SCHEDULER_SETTING, value: JSON.stringify(run) },
    update: { value: JSON.stringify(run) },
  })
}

export async function runMarketingScheduler(now = new Date()) {
  const run: SchedulerRun = {
    completedAt: now.toISOString(), status: 'success', reviewsReady: 0,
    draftsPrepared: 0, errors: 0, emailsSent: 0,
  }
  // Feedback checks never send email and continue in Review mode.
  try { await checkMarketingFeedback(now) } catch { console.error('Marketing delivery monitoring could not complete') }
  // Legacy review rules stay independent of the explicitly activated autopilot.
  try {
    const due = await prisma.emailTemplateMarketing.updateMany({
      where: { status: { in: ['scheduled_review', 'scheduled'] }, scheduledAt: { lte: now } },
      data: { status: 'review_ready', sendError: null },
    })
    run.reviewsReady = due.count
    const drafts = await prepareDueMarketingDrafts(now)
    run.errors += drafts.filter(d => 'error' in d).length
    run.draftsPrepared += drafts.filter(d => 'prepared' in d && d.prepared).length
  } catch {
    console.error('Marketing review preparation failed')
    run.errors += 1
  }
  try {
    const autopilot = await runMarketingAutopilot(now)
    run.emailsSent = autopilot.sent
    run.errors += autopilot.failed
    run.draftsPrepared += autopilot.prepared
    run.automationMode = autopilot.mode
    run.recipientsSuppressed = autopilot.suppressed
    if (autopilot.blockedReason) run.blockedReason = autopilot.blockedReason
    if ('eligibleContacts' in autopilot && typeof autopilot.eligibleContacts === 'number') run.eligibleContacts = autopilot.eligibleContacts
    if ('dueRecipients' in autopilot && typeof autopilot.dueRecipients === 'number') run.dueRecipients = autopilot.dueRecipients
    if ('customerRecords' in autopilot && typeof autopilot.customerRecords === 'number') run.customerRecords = autopilot.customerRecords
    if ('readinessReady' in autopilot && typeof autopilot.readinessReady === 'boolean') run.readinessReady = autopilot.readinessReady
  } catch {
    console.error('Marketing autopilot check failed')
    run.errors += 1
    run.blockedReason = 'Automatic marketing could not complete its check. Review sending history before retrying.'
  }
  run.completedAt = new Date().toISOString()
  run.status = run.errors ? 'partial' : 'success'
  await recordSchedulerRun(run)
  return run
}

export function schedulerHealth(run: SchedulerRun | null, configured: boolean, now = Date.now()) {
  if (!configured) return 'Not configured'
  if (!run) return 'Waiting for the first check'
  if (!Number.isFinite(Date.parse(run.completedAt)) || now - Date.parse(run.completedAt) > 20 * 60 * 1000) return 'Overdue — last check is more than 20 minutes old'
  if (run.status !== 'success') return 'Needs attention — the last check reported an error'
  return 'Running — checks every 5 minutes'
}

export async function getSchedulerRun(): Promise<SchedulerRun | null> {
  const row = await prisma.systemSetting.findUnique({ where: { category_key: SCHEDULER_SETTING } })
  try { return row?.value ? JSON.parse(row.value) : null } catch { return null }
}

