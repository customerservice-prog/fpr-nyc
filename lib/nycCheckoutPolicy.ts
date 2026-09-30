// Owner-approved NYC checkout fees and minimum order.
//
// Pure module (no Prisma / Next.js imports). The values come from the non-secret
// NYC_CHECKOUT_POLICY_JSON environment variable so the category pages, checkout,
// payment page and server pricing all read the same approved numbers.
//
// Nothing inherited from another location's storefront applies by default:
//   - a missing or invalid policy blocks online checkout entirely;
//   - an optional fee set to null (or left out) is simply not offered online.
//
// Example (values are illustrative only, not approved prices):
//   {"minimumOrderSubtotal":500,"damageWaiverPercent":null,"lastMinuteFee":null,
//    "exactDeliveryFee":null,"exactPickupFee":null,"lateExactPickupFee":null,
//    "approvedOn":"2026-10-01"}

export interface NycCheckoutPolicy {
  /** Minimum rental subtotal (before fees and tax) for an online delivery order. 0 means no minimum. */
  minimumOrderSubtotal: number
  /** Optional damage waiver as a percent of the rental subtotal; null = not offered. */
  damageWaiverPercent: number | null
  /** Fee for events 24–72 hours away; null = those events cannot be booked online. */
  lastMinuteFee: number | null
  /** Guaranteed exact-time delivery fee; null = not offered online. */
  exactDeliveryFee: number | null
  /** Guaranteed exact-time pickup fee (12:00–9:30 pm); null = not offered online. */
  exactPickupFee: number | null
  /** Guaranteed exact-time pickup fee for 10:00–11:30 pm; null = late exact pickup not offered online. */
  lateExactPickupFee: number | null
  /** Informational: when the owner approved these values (YYYY-MM-DD). */
  approvedOn: string | null
}

export const NYC_MINIMUM_LEAD_HOURS = 24
export const NYC_LAST_MINUTE_WINDOW_HOURS = 72
/** Exact pickup times from 10:00 pm (inclusive) through 11:30 pm use the late fee. */
export const NYC_LATE_EXACT_PICKUP_FROM_MINUTES = 22 * 60
export const NYC_LATE_EXACT_PICKUP_UNTIL_MINUTES = 23 * 60 + 30

const OPTIONAL_AMOUNT_KEYS = ['lastMinuteFee', 'exactDeliveryFee', 'exactPickupFee', 'lateExactPickupFee'] as const
const ALLOWED_KEYS = new Set(['minimumOrderSubtotal', 'damageWaiverPercent', 'approvedOn', ...OPTIONAL_AMOUNT_KEYS])

export interface ParsedCheckoutPolicy {
  policy: NycCheckoutPolicy | null
  /** Safe-to-log reason when the policy is missing or invalid (never contains values). */
  error: string | null
}

/** A dollar amount with at most two decimals (an explicit 0 means "offered at no charge"). */
function money(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000) return 'invalid'
  const cents = value * 100
  if (Math.abs(cents - Math.round(cents)) > 1e-6) return 'invalid'
  return Math.round(cents) / 100
}

/** Parses NYC_CHECKOUT_POLICY_JSON. Any problem yields `policy: null` (online checkout blocked). */
export function parseNycCheckoutPolicy(raw: unknown): ParsedCheckoutPolicy {
  if (typeof raw !== 'string' || !raw.trim()) return { policy: null, error: 'policy_missing' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { policy: null, error: 'policy_not_json' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { policy: null, error: 'policy_not_object' }
  const input = parsed as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) return { policy: null, error: 'policy_unknown_key:' + key.slice(0, 40) }
  }

  const minimum = money(input.minimumOrderSubtotal)
  if (minimum === null || minimum === 'invalid') return { policy: null, error: 'policy_minimum_invalid' }

  let damageWaiverPercent: number | null = null
  if (input.damageWaiverPercent !== null && input.damageWaiverPercent !== undefined) {
    const percent = input.damageWaiverPercent
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return { policy: null, error: 'policy_damage_waiver_invalid' }
    }
    damageWaiverPercent = Math.round(percent * 1000) / 1000
  }

  const amounts: Record<(typeof OPTIONAL_AMOUNT_KEYS)[number], number | null> = {
    lastMinuteFee: null,
    exactDeliveryFee: null,
    exactPickupFee: null,
    lateExactPickupFee: null,
  }
  for (const key of OPTIONAL_AMOUNT_KEYS) {
    const value = money(input[key])
    if (value === 'invalid') return { policy: null, error: 'policy_' + key + '_invalid' }
    amounts[key] = value
  }
  if (amounts.lateExactPickupFee !== null && amounts.exactPickupFee === null) {
    return { policy: null, error: 'policy_late_pickup_without_exact_pickup' }
  }

  const approvedOn = typeof input.approvedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.approvedOn) ? input.approvedOn : null
  if (input.approvedOn !== undefined && input.approvedOn !== null && approvedOn === null) return { policy: null, error: 'policy_approved_on_invalid' }

  return {
    policy: { minimumOrderSubtotal: minimum, damageWaiverPercent, ...amounts, approvedOn },
    error: null,
  }
}

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return -1
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1
  return h * 60 + m
}

export function isLateExactPickupTime(time: string | null | undefined): boolean {
  const minutes = timeToMinutes(time)
  return minutes >= NYC_LATE_EXACT_PICKUP_FROM_MINUTES && minutes <= NYC_LATE_EXACT_PICKUP_UNTIL_MINUTES
}

/**
 * Exact-time pickup fee for a chosen time under the approved policy, or null when that
 * time cannot be booked online (exact pickup not offered, or a late time without a late fee).
 */
export function exactPickupFeeForPolicy(policy: Pick<NycCheckoutPolicy, 'exactPickupFee' | 'lateExactPickupFee'> | null, time: string | null | undefined): number | null {
  if (!policy || policy.exactPickupFee === null) return null
  if (timeToMinutes(time) < 0) return null
  if (isLateExactPickupTime(time)) return policy.lateExactPickupFee
  return policy.exactPickupFee
}

/** Public, secret-free view of the policy for the storefront. */
export function publicCheckoutPolicy(parsed: ParsedCheckoutPolicy) {
  return {
    configured: parsed.policy !== null,
    minimumLeadHours: NYC_MINIMUM_LEAD_HOURS,
    lastMinuteWindowHours: NYC_LAST_MINUTE_WINDOW_HOURS,
    policy: parsed.policy
      ? {
          minimumOrderSubtotal: parsed.policy.minimumOrderSubtotal,
          damageWaiverPercent: parsed.policy.damageWaiverPercent,
          lastMinuteFee: parsed.policy.lastMinuteFee,
          exactDeliveryFee: parsed.policy.exactDeliveryFee,
          exactPickupFee: parsed.policy.exactPickupFee,
          lateExactPickupFee: parsed.policy.lateExactPickupFee,
        }
      : null,
  }
}

export type PublicCheckoutPolicy = ReturnType<typeof publicCheckoutPolicy>
