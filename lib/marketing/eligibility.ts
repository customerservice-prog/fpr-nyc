import { prisma } from '@/lib/prisma'
import { getDeliverySuppressedEmails } from '@/lib/marketing/suppression'
import { normalizeAddress, normalizeEmail as normalizeRestrictionEmail, normalizePhone } from '@/lib/rentalRestrictions'

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
    return normalizeRestrictionEmail(email) || ''
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
 * explicit unsubscribe, an unexpired active RentalRestriction (matched by
 * customer, email, phone, or address), the legacy Customer.doNotRent flag, or a recorded
 * bounce, complaint, uncertain delivery, or manual marketing hold.
 *
 * Per-campaign frequency caps and one-off exclusions remain the caller's
 * responsibility.
 */
export async function getSuppressedEmails(now = new Date()): Promise<Set<string>> {
    const suppressed = new Set<string>()

  const [unsubscribed, doNotRentCustomers, activeRestrictions, deliverySuppressed] = await Promise.all([
        prisma.customer.findMany({
                where: { unsubscribedFromMarketing: true },
                select: { email: true },
        }),
        prisma.customer.findMany({
                where: { doNotRent: true },
                select: { email: true },
        }),
        prisma.rentalRestriction.findMany({
                where: { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                include: { identifiers: true },
        }),
        getDeliverySuppressedEmails(),
      ])

  unsubscribed.forEach((c) => suppressed.add(normalizeEmail(c.email)))
    deliverySuppressed.forEach(email => suppressed.add(email))
    doNotRentCustomers.forEach((c) => suppressed.add(normalizeEmail(c.email)))

  const restrictedCustomerIds = new Set<string>()
    const restrictedEmails = new Set<string>()
    const restrictedPhones = new Set<string>()
    const restrictedAddresses = new Set<string>()
    for (const restriction of activeRestrictions) {
          for (const identifier of restriction.identifiers) {
                  if (identifier.type === 'EMAIL') {
                            const email = normalizeRestrictionEmail(identifier.normalizedValue)
                            if (email) {
                                  suppressed.add(email)
                                  restrictedEmails.add(email)
                            }
                  }
                  if (identifier.type === 'CUSTOMER_ID' && identifier.customerIdRef) {
                            restrictedCustomerIds.add(identifier.customerIdRef)
                  }
                  if (identifier.type === 'PHONE') {
                            const phone = normalizePhone(identifier.normalizedValue)
                            if (phone) restrictedPhones.add(phone)
                  }
                  if (identifier.type === 'ADDRESS' && identifier.normalizedValue) {
                            restrictedAddresses.add(identifier.normalizedValue)
                  }
          }
    }

  const matchContactDetails = restrictedEmails.size > 0 || restrictedPhones.size > 0 || restrictedAddresses.size > 0
  if (!matchContactDetails) {
        if (restrictedCustomerIds.size > 0) {
              const customers = await prisma.customer.findMany({
                    where: { id: { in: Array.from(restrictedCustomerIds) } },
                    select: { email: true },
              })
              customers.forEach(customer => suppressed.add(normalizeEmail(customer.email)))
        }
        return suppressed
  }

    // Imported contact fields are not stored in canonical form. Read the
    // required fields in a single batch, then use the same exact normalized
    // matching as checkout. Per-customer restriction queries would turn a
    // marketing audience check into thousands of database calls.
    const customers = await prisma.customer.findMany({
            select: {
                  id: true, email: true, secondaryEmail: true,
                  phone: true, secondaryPhone: true,
                  address: true, city: true, state: true, zip: true,
                  orders: {
                        select: {
                              eventAddress: true, eventCity: true, eventState: true, eventZip: true,
                              contacts: { select: { email: true, phone: true } },
                        },
                  },
            },
    })
    const matchesEmail = (email: string | null) => {
          const normalized = normalizeRestrictionEmail(email)
          return !!normalized && restrictedEmails.has(normalized)
    }
    const matchesPhone = (phone: string | null) => {
          const normalized = normalizePhone(phone)
          return !!normalized && restrictedPhones.has(normalized)
    }
    const matchesAddress = (street1: string | null, city: string | null, state: string | null, zip: string | null) => {
          const address = normalizeAddress({ street1, city, state, zip })
          return !!address && (restrictedAddresses.has(address.propertyKey) || restrictedAddresses.has(address.unitKey))
    }
    for (const customer of customers) {
          const matched = restrictedCustomerIds.has(customer.id)
                || matchesEmail(customer.email) || matchesEmail(customer.secondaryEmail)
                || matchesPhone(customer.phone) || matchesPhone(customer.secondaryPhone)
                || matchesAddress(customer.address, customer.city, customer.state, customer.zip)
                || (customer.orders || []).some(order =>
                      matchesAddress(order.eventAddress, order.eventCity, order.eventState, order.eventZip)
                      || order.contacts.some(contact => matchesEmail(contact.email) || matchesPhone(contact.phone)))
          if (matched) suppressed.add(normalizeEmail(customer.email))
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
