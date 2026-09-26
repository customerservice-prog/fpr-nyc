// Marketing launch concurrency/safety primitives.
//
// This module is the ONLY place that is allowed to acquire the global
// launch lock, create/resolve a per-recipient send claim, validate a final
// rendered email's links, or send the one owner monitoring copy. Keeping
// all of this in one place - instead of re-implementing "check then send
// then log" inline in the route handler - is what makes today's race
// condition (two concurrent controlledLaunch requests both passing the
// frequency check before either had logged anything) structurally
// impossible to repeat.

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { checkFrequencyProtection } from '@/lib/marketing/schedule'
import { getSuppressedEmails, normalizeEmail } from '@/lib/marketing/eligibility'

import { dailyMarketingUsage } from '@/lib/marketing/queue'
import { getAutopilotConfig } from '@/lib/marketing/autopilotSettings'

const LOCK_ID = 'singleton'
const STALE_LOCK_MINUTES = 10

export interface AcquireLockResult {
  acquired: boolean
  reason?: string
}

export async function acquireLaunchLock(runId: string): Promise<AcquireLockResult> {
  const now = new Date()
  const staleThreshold = new Date(now.getTime() - STALE_LOCK_MINUTES * 60 * 1000)

await prisma.marketingLaunchLock.upsert({
  where: { id: LOCK_ID },
  create: { id: LOCK_ID, status: 'idle' },
  update: {},
})

const result = await prisma.marketingLaunchLock.updateMany({
  where: {
    id: LOCK_ID,
    OR: [
      { status: 'idle' },
      { status: 'running', heartbeatAt: { lt: staleThreshold } },
      { status: 'running', heartbeatAt: null, lockedAt: { lt: staleThreshold } },
      ],
  },
  data: { status: 'running', runId, lockedAt: now, heartbeatAt: now },
})

if (result.count === 0) {
  const current = await prisma.marketingLaunchLock.findUnique({ where: { id: LOCK_ID } })
  return {
    acquired: false,
    reason: 'A marketing launch is already in progress (runId ' + (current?.runId ?? 'unknown') + ', started ' + (current?.lockedAt?.toISOString() ?? 'unknown') + '). Only one controlled launch may run at a time.',
  }
}
  return { acquired: true }
}

export interface HeartbeatResult {
  ownsLock: boolean
}

// Updates the heartbeat ONLY IF this runId still owns the lock row, and
// reports back whether ownership was actually retained. A caller that
// ignores the returned ownsLock flag can keep sending after a stale-lock
// takeover has handed the lock to a different run - see the "lock loss
// during an active run" test. The route handler MUST check this and stop
// (fail closed) the moment ownsLock is false, instead of only calling this
// for its side effect.
export async function heartbeatLaunchLock(runId: string): Promise<HeartbeatResult> {
  const result = await prisma.marketingLaunchLock.updateMany({
    where: { id: LOCK_ID, runId },
    data: { heartbeatAt: new Date() },
  })
  return { ownsLock: result.count > 0 }
}

// Cheap read-only ownership check, so a run can fail closed the instant its
// lock is taken over rather than waiting for the next heartbeat cadence.
export async function stillOwnsLock(runId: string): Promise<boolean> {
  const row = await prisma.marketingLaunchLock.findUnique({ where: { id: LOCK_ID } })
  return !!row && row.status === 'running' && row.runId === runId
}

export async function releaseLaunchLock(runId: string): Promise<void> {
  await prisma.marketingLaunchLock.updateMany({
    where: { id: LOCK_ID, runId },
    data: { status: 'idle', runId: null, lockedAt: null, heartbeatAt: null },
  })
}

export type ClaimStatus = 'claimed' | 'sent' | 'simulated' | 'failed' | 'ambiguous'

export interface ClaimAttempt {
  claimed: boolean
  claimId?: string
  reason?: string
}

export async function tryClaimRecipient(campaignSlug: string, email: string, runId: string): Promise<ClaimAttempt> {
  email = normalizeEmail(email)
  try {
    const claim = await prisma.marketingSendClaim.create({
      data: { campaignSlug, email, runId, status: 'claimed' },
    })
    return { claimed: true, claimId: claim.id }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return {
        claimed: false,
        reason: 'Recipient already claimed for this exact campaign (by this run or an earlier one) - refusing to send a duplicate.',
      }
    }
    throw e
  }
}

export async function resolveClaim(claimId: string, status: ClaimStatus): Promise<void> {
  await prisma.marketingSendClaim.update({
    where: { id: claimId },
    data: { status, resolvedAt: new Date() },
  })
}

export interface LinkValidationResult {
  valid: boolean
  issues: string[]
  checkedLinks: number
}

const ALLOWED_INTERNAL_PATH_PREFIXES = [
  '/', '/category', '/contact_us', '/checkout', '/rentals', '/weddings',
  '/api/unsubscribe', '/api/category-image', '/api/item-image', '/images',
  ]

export function validateFinalEmailLinks(html: string, origin: string): LinkValidationResult {
  const issues: string[] = []
    const hrefRe = /href\s*=\s*"([^"]*)"/gi
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  let count = 0

while ((match = hrefRe.exec(html)) !== null) {
  const raw = match[1]
  count++
  if (seen.has(raw)) continue
  seen.add(raw)

  if (!raw || raw.trim() === '') { issues.push('Empty href attribute found.'); continue }
  if (raw.trim() === '#') { issues.push('Placeholder href="#" link found (root cause of a prior broken-link incident).'); continue }
  if (/^mailto:|^tel:/i.test(raw)) continue

  let target = raw
  if (origin && target.startsWith(origin)) target = target.slice(origin.length) || '/'

  if (target.startsWith('/')) {
    if (/^\/rentals(\?|$)/i.test(target) && /category=/i.test(target)) {
      issues.push('Old broken link pattern found: ' + raw + ' (use /category/<slug> instead of /rentals?category=...).')
      continue
    }
    const allowed = ALLOWED_INTERNAL_PATH_PREFIXES.some((p) => target === p || target.startsWith(p + '/') || target.startsWith(p + '?'))
    if (!allowed) issues.push('Internal link does not match an allowed route: ' + raw)
    continue
  }

  if (!/^https?:\/\//i.test(target)) {
    issues.push('Malformed or unsafe link found: ' + raw)
  }
}

return { valid: issues.length === 0, issues, checkedLinks: count }
}

export async function getOwnerMonitoringEmail(): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({
    where: { category_key: { category: 'marketing', key: 'ownerMonitoringEmail' } },
  })
  const value = (row?.value || '').trim()
  return value ? value : null
}

export type OwnerCopyStatus = 'sent' | 'disabled' | 'failed'

export async function sendOwnerMonitoringCopy(opts: { subject: string; html: string }): Promise<OwnerCopyStatus> {
  const to = await getOwnerMonitoringEmail()
  if (!to) return 'disabled'
  const res = await sendEmail({ to, subject: '[Owner Copy] ' + opts.subject, html: opts.html })
  const success = !!(res as { success?: boolean } | undefined)?.success
  const simulated = !!(res as { simulated?: boolean } | undefined)?.simulated
  return success && !simulated ? 'sent' : 'failed'
}

export function isRealEmailConfigured(): boolean {
  return !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS
}

export type SendFn = () => Promise<{ success?: boolean; simulated?: boolean }>
export type ClaimOutcome = 'sent' | 'failed' | 'simulated' | 'suppressed' | 'duplicate' | 'ambiguous'

export interface ProcessClaimedSendResult {
  outcome: ClaimOutcome
  claimId?: string
  suppressionReason?: string
  error?: string
}

// The single place that decides what happens for ONE recipient of ONE
// controlled launch: claim -> frequency check -> send -> resolve (+ log on a
// real success). Centralizing this - instead of inlining "check then send
// then log" in the route handler - is what makes every outcome (duplicate,
// suppressed, sent, failed, simulated, ambiguous) directly testable against
// a real database without needing to fake it.
export async function processClaimedSend(params: {
  campaignSlug: string
  campaignName: string
  email: string
  runId: string
  occurrenceKey?: string
  recheck?: () => Promise<{ allowed: boolean; reason?: string }>
  send: SendFn
}): Promise<ProcessClaimedSendResult> {
  params.email = normalizeEmail(params.email)
  const attempt = await tryClaimRecipient(params.occurrenceKey || params.campaignSlug, params.email, params.runId)
  if (!attempt.claimed || !attempt.claimId) {
    return { outcome: 'duplicate' }
  }

try {
  const suppressed = await getSuppressedEmails()
  const current = params.recheck ? await params.recheck() : { allowed: true }
  if (suppressed.has(params.email) || !current.allowed) {
    await prisma.marketingSendClaim.delete({ where: { id: attempt.claimId } })
    return { outcome: 'suppressed', suppressionReason: current.reason || 'Recipient is no longer eligible for this campaign.' }
  }
  const [limits, usage] = await Promise.all([getAutopilotConfig(), dailyMarketingUsage(new Date(), attempt.claimId)])
  if (usage.used >= limits.dailyLimit) {
    await prisma.marketingSendClaim.delete({ where: { id: attempt.claimId } })
    return { outcome: 'suppressed', suppressionReason: 'Daily marketing limit reached across automatic and manual campaigns.' }
  }
  const freq = await checkFrequencyProtection(params.email, new Date(), attempt.claimId)
  if (!freq.allowed) {
    await prisma.marketingSendClaim.delete({ where: { id: attempt.claimId } })
    return { outcome: 'suppressed', suppressionReason: freq.reason ?? undefined }
  }

  const res = await params.send()
  const success = !!res?.success
  const simulated = !!res?.simulated

  if (success && simulated) {
    await resolveClaim(attempt.claimId, 'simulated')
    return { outcome: 'simulated', claimId: attempt.claimId }
  }

  if (success) {
    await resolveClaim(attempt.claimId, 'sent')
    await prisma.marketingSendLog.create({ data: { campaignSlug: params.campaignSlug, campaignName: params.campaignName, email: params.email, runId: params.runId } })
    return { outcome: 'sent', claimId: attempt.claimId }
  }

  await resolveClaim(attempt.claimId, 'failed')
  return { outcome: 'failed', claimId: attempt.claimId }
} catch (e) {
  await resolveClaim(attempt.claimId, 'ambiguous')
  return { outcome: 'ambiguous', claimId: attempt.claimId, error: (e as Error).message }
}
}

