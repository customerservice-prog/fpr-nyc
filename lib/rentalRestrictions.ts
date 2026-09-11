import { prisma } from './prisma'

// ---------------------------------------------------------------------------
// Rental Restriction ("Do Not Rent") matching + normalization
// ---------------------------------------------------------------------------
// This is the ONE canonical place that decides whether a booking attempt
// matches an active rental restriction. Checkout, admin manual order
// creation, and any future entry point should all call
// evaluateRentalRestrictions() instead of re-implementing matching logic.
//
// Design notes:
// - Matching is intentionally deterministic (exact normalized match only).
//   No fuzzy/similarity matching is used to hard-block a checkout, because
//   that risks blocking innocent customers. Fuzzy matching could be added
//   later as a "possible match" surfaced to staff only, but is out of scope
//   here on purpose.
// - A restriction can carry multiple identifiers (customer, email, phone,
//   address). ANY active identifier matching is enough to block.
// - Address matching never uses fuzzy street-name similarity - only exact
//   normalized street/city/state(/zip) equality, so "123 Main St" can never
//   match "125 Main St".
// - Secondary/day-of contact emails and phones are checked the same way as
//   primary ones (all are just "EMAIL"/"PHONE" identifiers to this
//   service). This is a deliberate simplification: it means a restricted
//   phone number blocks a booking even if it only appears as a secondary or
//   day-of contact, not just the primary customer contact.

export type IdentifierType = 'CUSTOMER_ID' | 'EMAIL' | 'PHONE' | 'ADDRESS'
export type AddressScope = 'EXACT_UNIT' | 'ENTIRE_PROPERTY'

export interface AddressInput {
    street1?: string | null
    unit?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
}

export interface RestrictionMatch {
    restrictionId: string
    identifierType: IdentifierType
    matchedValue: string
    reasonCategory: string
    status: string
}

export interface EvaluateInput {
    customerId?: string | null
    emails?: (string | null | undefined)[]
    phones?: (string | null | undefined)[]
    address?: AddressInput | null
}

export interface EvaluateResult {
    matched: boolean
    matches: RestrictionMatch[]
    restrictionIds: string[]
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Trim + lowercase only. Deliberately does NOT strip Gmail dots/+suffixes -
 * that transformation is provider-specific and risks false matches. */
export function normalizeEmail(email?: string | null): string | null {
    if (!email) return null
    const trimmed = email.trim().toLowerCase()
    return trimmed ? trimmed : null
}

/** Canonicalizes to E.164-ish form for 10/11-digit US numbers
 * (+1XXXXXXXXXX). Falls back to digits-only for anything else so matching
 * still works consistently even for unusual input, without ever throwing. */
export function normalizePhone(phone?: string | null): string | null {
    if (!phone) return null
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null
    if (digits.length === 10) return '+1' + digits
    if (digits.length === 11 && digits[0] === '1') return '+' + digits
    return digits
}

const STREET_SUFFIX_MAP: Record<string, string> = {
    street: 'ST', st: 'ST',
    avenue: 'AVE', ave: 'AVE',
    boulevard: 'BLVD', blvd: 'BLVD',
    drive: 'DR', dr: 'DR',
    court: 'CT', ct: 'CT',
    lane: 'LN', ln: 'LN',
    road: 'RD', rd: 'RD',
    place: 'PL', pl: 'PL',
    circle: 'CIR', cir: 'CIR',
    terrace: 'TER', ter: 'TER',
    parkway: 'PKWY', pkwy: 'PKWY',
    highway: 'HWY', hwy: 'HWY',
    way: 'WAY',
    trail: 'TRL', trl: 'TRL',
    square: 'SQ', sq: 'SQ',
}

/** Uppercase, strip punctuation, collapse whitespace, apply a small
   * conservative street-suffix abbreviation dictionary. Never touches the
   * house number, so "123 Main St" and "125 Main St" always stay distinct. */
function normalizeStreet(street?: string | null): string {
    if (!street) return ''
    const s = street.toUpperCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim()
    const parts = s.split(' ').map((word) => STREET_SUFFIX_MAP[word.toLowerCase()] || word)
    return parts.join(' ')
}

function normalizeUnit(unit?: string | null, streetLine?: string | null): string {
    // Unit may be supplied separately, or embedded in the street line itself
  // (e.g. "123 Main St Apt 2"). Pull it out of the street line if needed.
  let raw = unit || ''
    if (!raw && streetLine) {
          const m = streetLine.match(/(?:apt|apartment|unit|suite|ste|#)\.?\s*([a-z0-9-]+)/i)
          if (m) raw = m[1]
    }
    return raw.toUpperCase().replace(/[.,#\s]/g, '')
}

function stripUnitFromStreet(street?: string | null): string {
    if (!street) return ''
    return street.replace(/,?\s*(?:apt|apartment|unit|suite|ste|#)\.?\s*[a-z0-9-]+/i, '').trim()
}

function normalizeZip(zip?: string | null): string {
    if (!zip) return ''
    const digits = zip.replace(/\D/g, '')
    return digits.slice(0, 5)
}

function normalizeState(state?: string | null): string {
    if (!state) return ''
    return state.trim().toUpperCase().slice(0, 2)
}

function normalizeCity(city?: string | null): string {
    if (!city) return ''
    return city.trim().toUpperCase().replace(/\s+/g, ' ')
}

export interface NormalizedAddress {
    propertyKey: string
    unitKey: string
    unit: string
}

/** Produces two canonical keys for an address:
 *  - propertyKey: street + city + state (+ zip if present) - identifies the
 *    physical property regardless of unit.
 *  - unitKey: propertyKey + unit (or the same as propertyKey if there is no
 *    unit) - identifies one specific unit at that property.
 * Requires street + city + state to all be present; an address missing any
 * of those is never turned into a matchable key (fails safe / no match
 * rather than guessing). */
export function normalizeAddress(input: AddressInput): NormalizedAddress | null {
    const streetOnly = stripUnitFromStreet(input.street1)
    const street = normalizeStreet(streetOnly)
    const city = normalizeCity(input.city)
    const state = normalizeState(input.state)
    const zip = normalizeZip(input.zip)
    const unit = normalizeUnit(input.unit, input.street1)

  if (!street || !city || !state) return null

  const propertyKey = zip ? `${street}|${city}|${state}|${zip}` : `${street}|${city}|${state}`
    const unitKey = unit ? `${propertyKey}|UNIT:${unit}` : propertyKey
    return { propertyKey, unitKey, unit }
}

// ---------------------------------------------------------------------------
// Evaluation (matching)
// ---------------------------------------------------------------------------

export async function evaluateRentalRestrictions(input: EvaluateInput): Promise<EvaluateResult> {
    const normalizedEmails = Array.from(
          new Set((input.emails || []).map(normalizeEmail).filter((v): v is string => !!v))
        )
    const normalizedPhones = Array.from(
          new Set((input.phones || []).map(normalizePhone).filter((v): v is string => !!v))
        )
    const normalizedAddress = input.address ? normalizeAddress(input.address) : null

  const orConditions: Record<string, unknown>[] = []
      if (input.customerId) {
            orConditions.push({ type: 'CUSTOMER_ID', customerIdRef: input.customerId })
      }
    if (normalizedEmails.length) {
          orConditions.push({ type: 'EMAIL', normalizedValue: { in: normalizedEmails } })
    }
    if (normalizedPhones.length) {
          orConditions.push({ type: 'PHONE', normalizedValue: { in: normalizedPhones } })
    }
    if (normalizedAddress) {
          orConditions.push({
                  type: 'ADDRESS',
                  normalizedValue: { in: Array.from(new Set([normalizedAddress.propertyKey, normalizedAddress.unitKey])) },
          })
    }

  if (orConditions.length === 0) {
        return { matched: false, matches: [], restrictionIds: [] }
  }

  const identifiers = await prisma.rentalRestrictionIdentifier.findMany({
        where: {
                OR: orConditions,
                restriction: { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        },
        include: { restriction: true },
  })

  const matches: RestrictionMatch[] = identifiers.map((identifier) => ({
        restrictionId: identifier.restrictionId,
        identifierType: identifier.type as IdentifierType,
        matchedValue: identifier.displayValue,
        reasonCategory: identifier.restriction.reasonCategory,
        status: identifier.restriction.status,
  }))

  const restrictionIds = Array.from(new Set(matches.map((m) => m.restrictionId)))

  return { matched: matches.length > 0, matches, restrictionIds }
}

// ---------------------------------------------------------------------------
// Restriction creation / management helpers
// ---------------------------------------------------------------------------

export interface CreateRestrictionIdentifierInput {
    type: IdentifierType
    value: string
    addressScope?: AddressScope
    address?: AddressInput
    customerId?: string
}

export interface CreateRestrictionInput {
    reasonCategory: string
    internalNotes?: string
    sourceOrderId?: string
    sourceOrderNumber?: string
    sourceCustomerId?: string
    createdByName?: string
    expiresAt?: Date | null
    identifiers: CreateRestrictionIdentifierInput[]
}

/** Turns one staff-selected identifier into the row shape Prisma expects,
 * or null if it isn't usable (e.g. empty value). Exported so the "test
 * match" admin tool can show staff exactly what a value normalizes to. */
export function buildIdentifierRecord(input: CreateRestrictionIdentifierInput) {
    if (input.type === 'EMAIL') {
          const normalized = normalizeEmail(input.value)
          if (!normalized) return null
          return { type: 'EMAIL' as const, normalizedValue: normalized, displayValue: input.value.trim() }
    }
    if (input.type === 'PHONE') {
          const normalized = normalizePhone(input.value)
          if (!normalized) return null
          return { type: 'PHONE' as const, normalizedValue: normalized, displayValue: input.value.trim() }
    }
    if (input.type === 'CUSTOMER_ID') {
          if (!input.customerId) return null
          return {
                  type: 'CUSTOMER_ID' as const,
                  normalizedValue: input.customerId,
                  displayValue: input.value,
                  customerIdRef: input.customerId,
          }
    }
    if (input.type === 'ADDRESS') {
          const addr = input.address
          if (!addr) return null
          const normalized = normalizeAddress(addr)
          if (!normalized) return null
          const scope: AddressScope = input.addressScope || 'EXACT_UNIT'
          const normalizedValue = scope === 'ENTIRE_PROPERTY' ? normalized.propertyKey : normalized.unitKey
          return {
                  type: 'ADDRESS' as const,
                  normalizedValue,
                  displayValue: input.value.trim(),
                  addressScope: scope,
                  addressStreet: addr.street1 || null,
                  addressUnit: normalized.unit || null,
                  addressCity: addr.city || null,
                  addressState: addr.state || null,
                  addressZip: addr.zip || null,
          }
    }
    return null
}

export async function createRentalRestriction(input: CreateRestrictionInput) {
    const identifierRecords = input.identifiers
      .map(buildIdentifierRecord)
      .filter((r): r is NonNullable<ReturnType<typeof buildIdentifierRecord>> => !!r)

  if (identifierRecords.length === 0) {
        throw new Error('At least one valid identifier (customer, email, phone, or address) is required')
  }

  return prisma.rentalRestriction.create({
        data: {
                reasonCategory: input.reasonCategory,
                internalNotes: input.internalNotes || null,
                sourceOrderId: input.sourceOrderId || null,
                sourceOrderNumber: input.sourceOrderNumber || null,
                sourceCustomerId: input.sourceCustomerId || null,
                createdByName: input.createdByName || null,
                expiresAt: input.expiresAt || null,
                identifiers: { create: identifierRecords },
        },
        include: { identifiers: true },
  })
}

export async function deactivateRentalRestriction(id: string, byName: string, reason: string) {
    return prisma.rentalRestriction.update({
          where: { id },
          data: {
                  status: 'INACTIVE',
                  deactivatedAt: new Date(),
                  deactivatedByName: byName,
                  deactivationReason: reason,
          },
    })
}

/** Returns an already-active identifier with this exact normalized value,
 * if one exists, so the "Add Restriction" UI can warn staff before
 * creating a duplicate case. */
export async function findExistingActiveIdentifier(type: IdentifierType, normalizedValue: string) {
    return prisma.rentalRestrictionIdentifier.findFirst({
          where: { type, normalizedValue, restriction: { status: 'ACTIVE' } },
          include: { restriction: true },
    })
}

export const REASON_CATEGORIES = [
    'Payment Issue',
    'Chargeback',
    'Equipment Damage',
    'Equipment Not Returned',
    'Unsafe Property / Site',
    'Abusive / Threatening Conduct',
    'Fraud Concern',
    'Repeated Policy Violations',
    'Unauthorized Use',
    'Other',
  ]
