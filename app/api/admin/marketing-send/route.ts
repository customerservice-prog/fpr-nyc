export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMarketingContacts, matchesMarketingSegment } from '@/lib/marketing/contacts'
import { feedbackHeaders } from '@/lib/marketing/feedbackToken'
import { sendMarketingEmail as sendEmail, marketingTransportStatus } from '@/lib/marketing/delivery'
import { getAutomationPlan } from '@/lib/marketing/plannerData'
import { automationSegmentForCampaign } from '@/lib/marketing/planner'
import { filterToMarketingEligible, type EligibilityResult } from '@/lib/marketing/eligibility'
import { checkFrequencyProtection } from '@/lib/marketing/schedule'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import {
  acquireLaunchLock,
  releaseLaunchLock,
  heartbeatLaunchLock,
  processClaimedSend,
  validateFinalEmailLinks,
  sendOwnerMonitoringCopy,
} from '@/lib/marketing/launch'
import { wrapEmail, unsubscribeHeaders } from '@/lib/marketing/message'
type Segment = 'all' | 'outstanding' | 'recent' | 'lapsed' | 'manual' | 'highConfidence' | 'annualRebooking' | 'dormant' | `automation:${string}`
async function resolveRecipients(segment: Segment, manual: string): Promise<EligibilityResult> {
  if (segment.startsWith('automation:')) {
    const slug = segment.slice('automation:'.length)
    if (!automationSegmentForCampaign(slug)) return { eligible: [], excluded: { invalidFormat: 0, testRecord: 0, suppressed: 0, duplicate: 0 } }
    const plan = await getAutomationPlan()
    return filterToMarketingEligible(plan.opportunities.filter(o => o.slug === slug).map(o => ({ email: o.email })))
  }
  if (segment === 'manual') return filterToMarketingEligible(manual.split(/[,;\n]/).map(email => ({email:email.trim()})).filter(c => c.email))
  const contacts = await getMarketingContacts()
  return filterToMarketingEligible(contacts.filter(c => matchesMarketingSegment(c,segment)))
}

const INTERNAL_TEST_DOMAIN = '@friendlypartyrental.com'

function publicOrigin(request: NextRequest): string {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (configured) return configured
  return new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAuthenticated && !auth.isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.isAuthenticated && !auth.isCron && !auth.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

const body = await request.json()
  const subject: string = (body.subject || '').trim()
  const html: string = body.html || ''
  const mode: string = body.mode || 'test'
  const segment: Segment = body.segment || (mode === 'controlledLaunch' ? 'highConfidence' : 'all')
  const manual: string = body.manual || ''
  const testEmail: string = (body.testEmail || '').trim()
  const preheaderText: string = body.preheaderText || ''
  const campaignId: string = (body.campaignId || '').trim()
  const campaignName: string = (body.campaignName || subject || 'Untitled campaign').trim()
  const subjectSlug = subject.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
  const campaignSlug: string = campaignId || `manual-${subjectSlug || Date.now()}`

const origin = publicOrigin(request)

if (mode === 'preview') {
  const { eligible: previewRecipients, excluded: previewExcluded } = await resolveRecipients(segment, manual)
  const claimed = campaignId ? await prisma.marketingSendClaim.findMany({where:{campaignSlug:campaignId},select:{email:true}}) : []
  const used = new Set(claimed.map(c=>c.email))
  const unclaimed = previewRecipients.filter(email=>!used.has(email)).length
  return NextResponse.json({ mode: 'preview', segment, recipients: previewRecipients.length, unclaimed, excluded: previewExcluded })
}

if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (!html) return NextResponse.json({ error: 'Email content is required' }, { status: 400 })

    if (mode === 'test') {
      if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(testEmail)) {
        return NextResponse.json({ error: 'A valid test email address is required' }, { status: 400 })
      }
      if (!testEmail.toLowerCase().endsWith(INTERNAL_TEST_DOMAIN)) {
        return NextResponse.json(
          { error: `Test sends are restricted to an internal ${INTERNAL_TEST_DOMAIN} address for preview testing. Real customer campaigns require a separately confirmed administrator launch.` },
          { status: 423 }
          )
      }
      const wrapped = wrapEmail(html, testEmail, origin, preheaderText)
      const res = await sendEmail({ to: testEmail, subject: '[TEST] ' + subject, html: wrapped, headers: unsubscribeHeaders(origin, testEmail) })
      return NextResponse.json({ mode: 'test', recipients: 1, result: res })
    }

if (mode === 'controlledLaunch') {
  if (!auth.isAdmin || auth.isCron) {
    return NextResponse.json({ error: 'Controlled launch requires an authenticated admin session and cannot be triggered by an automated/cron caller.' }, { status: 403 })
  }
  if (body.action !== 'LAUNCH_REAL_CUSTOMER_CAMPAIGN' || body.confirmProductionSend !== true) {
    return NextResponse.json(
      { error: 'A real customer launch requires an explicit confirmation ("action":"LAUNCH_REAL_CUSTOMER_CAMPAIGN","confirmProductionSend":true). This is intentionally separate from "mode" so no preview/test/audit call can ever drift into a real send.' },
      { status: 400 }
      )
  }
  if (!campaignId) {
    return NextResponse.json(
      { error: 'campaignId is required for a controlled launch so two concurrent requests for the same campaign always share the same idempotency key (campaignSlug).' },
      { status: 400 }
      )
  }

  if (!marketingTransportStatus().configured) {
    return NextResponse.json(
      { error: 'The marketing email connection is not configured. Set valid marketing credentials or the existing business email credentials before launching.' },
      { status: 503 }
      )
  }

  const limit = Number(body.limit)
  if (!Number.isInteger(limit) || limit <= 0 || limit > 300) {
    return NextResponse.json({ error: 'limit must be a positive integer up to ' + 300 + ' for a controlled launch batch.' }, { status: 400 })
  }

  if (!['all','outstanding','recent','lapsed','highConfidence','annualRebooking','dormant'].includes(segment) && !(segment.startsWith('automation:') && automationSegmentForCampaign(segment.slice(11)))) return NextResponse.json({ error: 'Select a supported campaign audience' }, { status: 400 })
  const { eligible: highConfidence, excluded: hcExcluded } = await resolveRecipients(segment, '')
  const previousClaims = await prisma.marketingSendClaim.findMany({ where: { campaignSlug }, select: { email: true } })
  const previouslyClaimed = new Set(previousClaims.map(c => c.email))
  const batch = highConfidence.filter(email => !previouslyClaimed.has(email)).slice(0, limit)
  if (batch.length === 0) {
    return NextResponse.json({ error: 'No new eligible recipients remain for this campaign', excluded: hcExcluded }, { status: 400 })
  }

  const previewWrapped = wrapEmail(html, 'preflight-check@friendlypartyrental.com', origin, preheaderText)
  const linkCheck = validateFinalEmailLinks(previewWrapped, origin)
  if (!linkCheck.valid) {
    return NextResponse.json(
      { error: 'Final email failed link preflight - refusing to launch.', issues: linkCheck.issues },
      { status: 422 }
      )
  }

  const initiatedByName = auth.name || auth.username || null
  const initiatedByUserId = auth.userId

  const run = await prisma.marketingRun.create({
    data: {
      campaignSlug,
      campaignName,
      subject,
      mode: 'controlledLaunch',
      segment,
      requestedLimit: limit,
      resolvedAudienceCount: highConfidence.length,
      initiatedByUserId,
      initiatedByName,
      status: 'queued',
    },
  })

  const lock = await acquireLaunchLock(run.id)
  if (!lock.acquired) {
    await prisma.marketingRun.update({
      where: { id: run.id },
      data: { status: 'blocked', errorMessage: lock.reason, completedAt: new Date() },
    })
    return NextResponse.json({ error: lock.reason, runId: run.id }, { status: 409 })
  }

  await prisma.marketingRun.update({ where: { id: run.id }, data: { status: 'running', startedAt: new Date() } })
  let clSent = 0
  let clFailed = 0
  let clSimulated = 0
  let clSuppressedByFrequency = 0
  let clDuplicateBlocked = 0
  const clErrors: string[] = []
    const clSuppressedSample: { email: string; reason: string }[] = []
      let abortedReason: string | null = null

  try {
    for (let i = 0; i < batch.length; i++) {
      const to = batch[i]

    const heartbeat = await heartbeatLaunchLock(run.id)
      if (!heartbeat.ownsLock) {
        abortedReason = 'Lost ownership of the global launch lock mid-run (stale takeover or the lock row was otherwise reassigned) - aborting the remaining batch rather than continuing to send without exclusive ownership.'
        break
      }

    const result = await processClaimedSend({
      campaignSlug,
      campaignName,
      email: to,
      runId: run.id,
      recheck: async () => {
        if (segment.startsWith('automation:')) {
          const current = await resolveRecipients(segment, '')
          return { allowed: current.eligible.includes(to), reason: 'This customer no longer matches the campaign trigger.' }
        }
        const current = await getMarketingContacts(to)
        return { allowed: current.some(c => c.email === to && matchesMarketingSegment(c,segment)), reason: 'This customer no longer matches the selected audience.' }
      },
      send: () => sendEmail({ to, subject, html: wrapEmail(html, to, origin, preheaderText, { campaignSlug, runId: run.id }), headers: { ...unsubscribeHeaders(origin, to), ...feedbackHeaders(to, run.id) } }),
    })

    if (result.outcome === 'duplicate') {
      clDuplicateBlocked++
    } else if (result.outcome === 'suppressed') {
      clSuppressedByFrequency++
      if (clSuppressedSample.length < 20) {
        clSuppressedSample.push({ email: to, reason: result.suppressionReason || 'Frequency cap exceeded' })
      }
    } else if (result.outcome === 'simulated') {
      clSimulated++
      abortedReason = 'Email provider reported a simulated send mid-run (credentials likely became unavailable). Aborting the remaining batch rather than continuing to "send" simulated messages.'
      break
    } else if (result.outcome === 'sent') {
      clSent++
    } else if (result.outcome === 'failed') {
      clFailed++
    } else if (result.outcome === 'ambiguous') {
      clFailed++
      if (clErrors.length < 5) clErrors.push(result.error || 'Ambiguous send outcome')
    }

    await new Promise((r) => setTimeout(r, 150))
    }
  } finally {
    await releaseLaunchLock(run.id)
  }

  let ownerMonitoringCopyStatus: 'sent' | 'disabled' | 'failed' = 'disabled'
  try {
    const ownerWrapped = wrapEmail(html, 'owner-monitoring-copy@friendlypartyrental.com', origin, preheaderText)
    ownerMonitoringCopyStatus = await sendOwnerMonitoringCopy({ subject, html: ownerWrapped })
  } catch {
    ownerMonitoringCopyStatus = 'failed'
  }

  await prisma.marketingRun.update({
    where: { id: run.id },
    data: {
      status: abortedReason ? 'failed' : 'completed',
      completedAt: new Date(),
      claimedCount: clSent + clFailed + clSimulated,
      sentCount: clSent,
      failedCount: clFailed,
      suppressedCount: clSuppressedByFrequency,
      duplicateBlockedCount: clDuplicateBlocked,
      simulatedCount: clSimulated,
      ownerMonitoringCopyStatus,
      errorMessage: abortedReason,
    },
  })

  await prisma.emailTemplateMarketing.updateMany({ where: { id: campaignId }, data: {
    status: abortedReason || clFailed ? 'partial' : clSent > 0 ? 'sent' : 'review_ready', sentAt: clSent > 0 ? new Date() : undefined,
    recipientCount: await prisma.marketingSendLog.count({ where: { campaignSlug } }), sendError: abortedReason || (clFailed ? `${clFailed} deliveries need review in send history.` : null),
  } })

  return NextResponse.json({
    mode: 'controlledLaunch',
    runId: run.id,
    campaignSlug,
    totalHighConfidenceEligible: highConfidence.length,
    batchSize: batch.length,
    excluded: hcExcluded,
    sent: clSent,
    failed: clFailed,
    simulated: clSimulated,
    duplicateBlocked: clDuplicateBlocked,
    suppressedByFrequency: clSuppressedByFrequency,
    suppressedSample: clSuppressedSample,
    ownerMonitoringCopyStatus,
    aborted: !!abortedReason,
    abortedReason,
    errors: clErrors,
  })
}

return NextResponse.json({ error: 'Choose a preview, internal test, or explicitly confirmed administrator launch. Automatic campaigns are managed in Marketing → Automations.' }, { status: 423 })
}

