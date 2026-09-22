import { prisma } from '@/lib/prisma'
import { easternDateTime, type AutomationOpportunity } from './planner'

const DAY = 86400000
const WINDOW_MS = 8 * 60 * 60 * 1000
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })

export function easternDayStart(now: Date) {
  const parts = dateFormat.formatToParts(now)
  const part = (name: string) => parts.find(p => p.type === name)!.value
  return easternDateTime(`${part('year')}-${part('month')}-${part('day')}`, '00:00')
}

export type DailyMarketingUsage = { used: number; lastAttemptAt: Date | null }

// Claims reserve capacity even after an uncertain provider response. Legacy logs
// without a corresponding claim also consume capacity. Never erase or merge
// ambiguous historical log rows to make more room in the daily allowance.
export async function dailyMarketingUsage(now = new Date(), excludeClaimId?: string): Promise<DailyMarketingUsage> {
  const since = easternDayStart(now)
  const [claims, logs] = await Promise.all([
    prisma.marketingSendClaim.findMany({ where: { claimedAt: { gte: since }, status: { in: ['claimed', 'sent', 'ambiguous', 'failed'] }, ...(excludeClaimId ? { id: { not: excludeClaimId } } : {}) }, select: { email: true, runId: true, claimedAt: true } }),
    prisma.marketingSendLog.findMany({ where: { sentAt: { gte: since } }, select: { email: true, runId: true, sentAt: true } }),
  ])
  const represented = new Set(claims.map(c => `${c.email.trim().toLowerCase()}\n${c.runId}`))
  const unclaimed = logs.filter(l => !l.runId || !represented.has(`${l.email.trim().toLowerCase()}\n${l.runId}`))
  const timestamps = [...claims.map(c => c.claimedAt.getTime()), ...logs.map(l => l.sentAt.getTime())]
  return { used: claims.length + unclaimed.length, lastAttemptAt: timestamps.length ? new Date(Math.max(...timestamps)) : null }
}

export function marketingPacing(now: Date, dailyLimit: number, usage: DailyMarketingUsage) {
  const start = easternDayStart(now)
  const dayParts = dateFormat.formatToParts(start)
  const part = (name: string) => dayParts.find(p => p.type === name)!.value
  const key = `${part('year')}-${part('month')}-${part('day')}`
  const open = easternDateTime(key, '09:00'), close = easternDateTime(key, '17:00')
  const tomorrowKey = new Date(Date.parse(key + 'T12:00:00Z') + DAY).toISOString().slice(0, 10)
  const tomorrow = easternDateTime(tomorrowKey, '09:00')
  const intervalMs = Math.ceil(WINDOW_MS / dailyLimit)
  const remaining = Math.max(0, dailyLimit - usage.used)
  let next = new Date(Math.max(open.getTime(), usage.lastAttemptAt ? usage.lastAttemptAt.getTime() + intervalMs : open.getTime()))
  if (!remaining || now >= close || next >= close) next = tomorrow
  const allowed = remaining > 0 && now >= open && now < close && now >= next
  return { allowed, remaining, used: usage.used, intervalMinutes: intervalMs / 60000, nextSlotAt: (allowed ? now : next).toISOString() }
}

// Choose the best matching offer per inbox before this sort. Across inboxes,
// campaign priority must not keep pushing the same customers to the front.
export function fairMarketingQueue(opportunities: AutomationOpportunity[], lastContact: Map<string, number>) {
  return [...opportunities].sort((a, b) =>
    (lastContact.get(a.email) ?? -Infinity) - (lastContact.get(b.email) ?? -Infinity)
    || a.dueAt.localeCompare(b.dueAt) || a.priority - b.priority
    || a.expiresAt.localeCompare(b.expiresAt) || a.email.localeCompare(b.email) || a.slug.localeCompare(b.slug))
}
