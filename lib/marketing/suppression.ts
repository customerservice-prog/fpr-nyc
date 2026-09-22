import { prisma } from '@/lib/prisma'

export const MARKETING_SUPPRESSION_CATEGORY = 'marketing_suppressions'
export const MARKETING_SUPPRESSION_REASONS = ['bounce', 'complaint', 'delivery_failure', 'manual'] as const
export type MarketingSuppressionReason = typeof MARKETING_SUPPRESSION_REASONS[number]

export function normalizeSuppressionEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  // One mailbox only. Never accept a display name, recipient list, or header.
  return email.length <= 254 && /^[^\s@<>,;\x00-\x1f\x7f]+@[^\s@<>,;\x00-\x1f\x7f]+\.[^\s@<>,;\x00-\x1f\x7f]{2,}$/.test(email) ? email : null
}

export function isMarketingSuppressionReason(value: unknown): value is MarketingSuppressionReason {
  return MARKETING_SUPPRESSION_REASONS.some(reason => reason === value)
}

export function suppressionReason(value: string | null): MarketingSuppressionReason {
  try {
    const reason = JSON.parse(value || '{}').reason
    return isMarketingSuppressionReason(reason) ? reason : 'manual'
  } catch { return 'manual' }
}

export async function suppressMarketingEmail(email: string, reason: MarketingSuppressionReason): Promise<void> {
  const key = normalizeSuppressionEmail(email)
  if (!key || !isMarketingSuppressionReason(reason)) throw new Error('Invalid marketing suppression')
  const value = JSON.stringify({ reason, recordedAt: new Date().toISOString() })
  await prisma.systemSetting.upsert({
    where: { category_key: { category: MARKETING_SUPPRESSION_CATEGORY, key } },
    create: { category: MARKETING_SUPPRESSION_CATEGORY, key, value },
    update: { value },
  })
}

export async function removeMarketingSuppression(email: string): Promise<void> {
  const key = normalizeSuppressionEmail(email)
  if (!key) throw new Error('Invalid marketing suppression')
  // Removing a delivery hold never clears an unsubscribe or a Do Not Rent rule.
  await prisma.systemSetting.deleteMany({ where: { category: MARKETING_SUPPRESSION_CATEGORY, key } })
}

export async function getDeliverySuppressedEmails(): Promise<Set<string>> {
  const entries = await prisma.systemSetting.findMany({
    where: { category: MARKETING_SUPPRESSION_CATEGORY }, select: { key: true },
  })
  return new Set(entries.map(entry => normalizeSuppressionEmail(entry.key)).filter((email): email is string => !!email))
}

export async function isDeliverySuppressed(email: string): Promise<boolean> {
  const key = normalizeSuppressionEmail(email)
  if (!key) return true
  return !!await prisma.systemSetting.findUnique({
    where: { category_key: { category: MARKETING_SUPPRESSION_CATEGORY, key } }, select: { id: true },
  })
}
