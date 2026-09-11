import { prisma } from '@/lib/prisma'

// Central place that decides whether a contact is allowed to receive a
// MARKETING (non-transactional) email. Transactional email (receipts,
// contracts, payment reminders, driver/order updates, etc.) must NEVER
// call this service - it is not a blanket send-blocker, it is
// marketing-specific eligibility only.
//
// Consolidates checks that used to be scattered (or missing) across
// marketing routes: unsubscribe status, active RentalRestriction (Do Not
// Rent), the legacy Customer.doNotRent flag, and known test/QA records.

const TEST_RECORD_PATTERNS: RegExp[] = [/@example\.com$/i, /\bqa[\s._-]?/i, /\btest\b/i]

export function normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase()
}

export function isValidEmailFormat(email: string): boolean {
    const e = normalizeEmail(email)
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
}

export function isTestRecord(
    email: string,
    firstName?: string | null,
    lastName?: string | null
  ): boolean {
    const text = `${firstName || ''} ${lastName || ''} ${email || ''}`.toLowerCase()
    return TEST_RECORD_PATTERNS.some((p) => p.test(text))
}

/**
 * Normalized emails that must NEVER receive a marketing send right now:
 * explicit unsubscribe, an active RentalRestriction (matched by EMAIL or
 * CUSTOMER_ID identifier), or the legacy Customer.doNotRent flag.
 *
 * Does NOT apply per-campaign frequency caps or one-off exclusions - those
 * don't exist yet (see MARKETING_AUDIT.md Section T) and are the caller's
 * responsibility once built.
 */
export async function getSuppressedEmails(): Promise<Set<string>> {
    const suppressed = new Set<string>()

  const [unsubscribed, doNotRentCustomers, activeRestrictions] = await Promise.all([
        prisma.customer.findMany({
                where: { unsubscribedFromMarketing: true },
                select: { email: true },
        }),
        prisma.customer.findMany({
                where: { doNotRent: true },
                select: { email: true },
        }),
        prisma.rentalRestriction.findMany({
                where: { status: 'ACTIVE' },
                include: { identifiers: true },
        }),
      ])

  unsubscribed.forEach((c) => suppressed.add(normalizeEmail(c.email)))
    doNotRentCustomers.forEach((c) => suppressed.add(normalizeEmail(c.email)))

  const restrictedCustomerIds = new Set<string>()
    for (const restriction of activeRestrictions) {
          for (const identifier of restriction.identifiers) {
                  if (identifier.type === 'EMAIL') {
                            suppressed.add(normalizeEmail(identifier.normalizedValue))
                  }
                  if (identifier.type === 'CUSTOMER_ID' && identifier.customerIdRef) {
                            restrictedCustomerIds.add(identifier.customerIdRef)
                  }
          }
    }

  if (restrictedCustomerIds.size > 0) {
        const restrictedCustomers = await prisma.customer.findMany({
                where: { id: { in: Array.from(restrictedCustomerIds) } },
                select: { email: true },
        })
        restrictedCustomers.forEach((c) => suppressed.add(normalizeEmail(c.email)))
  }

  return suppressed
}

export interface EligibilityResult {
    eligible: string[]
    excluded: {
      invalidFormat: number
      testRecord: number
      suppressed: number
      duplicate: number
    }
}

/**
 * Given raw contacts pulled for a segment, returns the deduplicated,
 * normalized list currently eligible for a MARKETING send, plus a
 * breakdown of why anyone was excluded (for transparency in the admin UI -
 * see MARKETING_AUDIT.md Section M, "no fake metrics").
 */
export async function filterToMarketingEligible(
    contacts: { email: string; firstName?: string | null; lastName?: string | null }[]
  ): Promise<EligibilityResult> {
    const suppressed = await getSuppressedEmails()
    const seen = new Set<string>()
    const eligible: string[] = []
        const excluded = { invalidFormat: 0, testRecord: 0, suppressed: 0, duplicate: 0 }

  for (const contact of contacts) {
        const email = normalizeEmail(contact.email)

      if (!isValidEmailFormat(email)) {
              excluded.invalidFormat++
              continue
      }
        if (isTestRecord(email, contact.firstName, contact.lastName)) {
                excluded.testRecord++
                continue
        }
        if (seen.has(email)) {
                excluded.duplicate++
                continue
        }
        seen.add(email)
        if (suppressed.has(email)) {
                excluded.suppressed++
                continue
        }
        eligible.push(email)
  }

  return { eligible, excluded }
}
