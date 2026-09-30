// Server-side NYC checkout pricing.
//
// Pure module (no Prisma / Next.js imports) so the math can be unit tested; the
// database-backed loader lives in lib/nycCheckoutPricingServer.ts. The payment
// page does not repeat this arithmetic: it shows the result of this exact function
// (POST /api/checkout/quote), and the order API recomputes it and refuses the order
// if the customer was shown a different total.
//
// The server never trusts browser-supplied prices, subtotals, taxes, fees,
// discounts, or totals: it recomputes everything from the approved catalog and
// settings.
//
// Fail-closed rules:
//   - every item must exist in the catalog, be customer-visible, available, and
//     have a price above $0;
//   - the owner-approved checkout policy (minimum order and optional fees) must be
//     configured; a fee the policy does not offer cannot be charged or requested;
//   - sales tax comes from the delivery ZIP's jurisdiction (lib/nycSalesTax.ts);
//     unknown ZIPs and ZIPs that cross municipal lines are never guessed;
//   - an active deposit rule must be configured;
//   - the delivery fee comes from the server ZIP quote (unconfigured ZIPs never
//     price as free delivery);
//   - orders within 24 hours of the event and below the approved minimum are refused.

import type { NycCheckoutPolicy } from './nycCheckoutPolicy'
import type { SalesTaxResolution } from './nycSalesTax'

export const NYC_PRICING_VERSION = 'nyc-server-pricing-v2'
export const NYC_QUOTE_EDIT_PRICING_VERSION = 'nyc-quote-self-edit-v1'
/** Pricing versions whose stored totals were computed by the server (safe to charge online). */
export const NYC_SERVER_PRICED_VERSIONS = [NYC_PRICING_VERSION, NYC_QUOTE_EDIT_PRICING_VERSION]

export const NYC_MAX_TIP_RATIO = 1
const MINIMUM_LEAD_HOURS = 24
const LAST_MINUTE_WINDOW_HOURS = 72
const LATE_PICKUP_FROM = 22 * 60
const LATE_PICKUP_UNTIL = 23 * 60 + 30

export class CheckoutPricingError extends Error {
  readonly status: number
  readonly code: string
  constructor(code: string, message: string, status = 409) {
    super(message)
    this.name = 'CheckoutPricingError'
    this.code = code
    this.status = status
  }
}

export interface PricingCatalogItem {
  id: string
  name: string
  cost: number
  purchasable: boolean
}

export interface PricingTierConfig {
  id: string
  label: string
  minDays: number
  maxDays: number | null
  percent: number
}

export interface SpecialRequestFeeConfig {
  id: string
  name: string
  amount: number
}

export interface CouponConfig {
  code: string
  discountType: string
  discountAmount: number
  isActive: boolean
  expiresAt: Date | string | null
}

export interface DepositRuleConfig {
  type: string
  amount: number
}

export interface CheckoutPricingConfig {
  items: Record<string, PricingCatalogItem>
  /** All pricing tiers in display (sortOrder) order. */
  tiers: PricingTierConfig[]
  /** Active special-request fees in display (sortOrder) order. */
  specialRequestFees: SpecialRequestFeeConfig[]
  /** Coupon looked up by the normalized code, or null when not found. */
  coupon: CouponConfig | null
  /** Sales-tax jurisdiction of the delivery ZIP, or null when it could not be determined. */
  salesTax: SalesTaxResolution | null
  /** Active deposit rule, or null when none is configured. */
  depositRule: DepositRuleConfig | null
  /** Delivery fee from the server-side ZIP quote. */
  deliveryFee: number
  /** Owner-approved minimum order and optional fees, or null when not configured. */
  policy: NycCheckoutPolicy | null
  /** Office phone shown in customer-facing messages. */
  phone?: string
  now: Date
}

export interface CheckoutPricingRequest {
  items: Array<{ id: string; quantity: number }>
  eventDate: string | Date
  durationTierId?: string | null
  specialRequestIds?: string[]
  couponCode?: string | null
  damageWaiver?: boolean
  exactDeliveryRequested?: boolean
  exactDeliveryTime?: string | null
  pickupType?: string | null
  exactPickupTime?: string | null
  tipAmount?: number
}

export interface CheckoutPricingLine {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface CheckoutPricingResult {
  version: string
  lines: CheckoutPricingLine[]
  cartSubtotal: number
  durationTier: PricingTierConfig | null
  durationFee: number
  adjustedSubtotal: number
  rentalDays: number
  durationLabel: string | null
  specialRequests: SpecialRequestFeeConfig[]
  specialRequestFee: number
  specialRequestNames: string | null
  couponCode: string | null
  couponDiscount: number
  damageWaiver: boolean
  damageWaiverPercent: number | null
  damageWaiverFee: number
  lastMinuteFee: number
  exactDeliveryFee: number
  exactPickupFee: number
  deliveryFee: number
  taxRate: number
  taxJurisdiction: { id: string; name: string; reportingCode: string; zip: string }
  taxAmount: number
  /** Order total before any tip (what the payment page labels "Order Total"). */
  grandTotal: number
  /** Minimum first payment required by the configured deposit rule. */
  requiredDeposit: number
  tipAmount: number
  /** Stored order total (grand total plus the tip chosen at checkout). */
  totalWithTip: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function toCents(value: number): number {
  return Math.round(value * 100)
}

/** True when two dollar amounts are equal to the cent. */
export function sameCents(a: unknown, b: number): boolean {
  return typeof a === 'number' && Number.isFinite(a) && toCents(a) === toCents(b)
}

function timeToMinutes(value: string | null | undefined): number {
  if (typeof value !== 'string' || !value) return -1
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1
  return h * 60 + m
}

export function normalizeCouponCode(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase().trim() : ''
}

function couponDiscountFor(coupon: CouponConfig | null, code: string, cartSubtotal: number, now: Date): number {
  if (!code || !coupon || !coupon.isActive || normalizeCouponCode(coupon.code) !== code) return 0
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) return 0
  const amount = Number(coupon.discountAmount)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return coupon.discountType === 'percentage'
    ? Math.round(cartSubtotal * (amount / 100) * 100) / 100
    : Math.min(amount, cartSubtotal)
}

function money(value: number): string {
  return '$' + value.toFixed(2)
}

export function computeNycCheckoutPricing(request: CheckoutPricingRequest, config: CheckoutPricingConfig): CheckoutPricingResult {
  const phone = config.phone || 'our office'
  if (!Array.isArray(request.items) || request.items.length === 0) {
    throw new CheckoutPricingError('cart_empty', 'Your cart is empty. Please add items before checkout.', 400)
  }

  const eventTime = new Date(request.eventDate).getTime()
  if (!Number.isFinite(eventTime)) throw new CheckoutPricingError('event_date_invalid', 'Please choose a valid event date.', 400)
  const hoursUntilEvent = (eventTime - config.now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilEvent < MINIMUM_LEAD_HOURS) {
    throw new CheckoutPricingError('event_too_soon', 'Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.', 400)
  }

  const policy = config.policy
  if (!policy) {
    throw new CheckoutPricingError('checkout_policy_not_configured', 'Online checkout pricing has not been set up yet. Please call ' + phone + ' to book.', 503)
  }

  for (const entry of request.items) {
    const id = typeof entry?.id === 'string' ? entry.id : ''
    const quantity = Number(entry?.quantity)
    if (!id || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) {
      throw new CheckoutPricingError('cart_invalid', 'Your cart contains an invalid item or quantity. Please review your cart.', 400)
    }
  }

  let cartSubtotal = 0
  const lines: CheckoutPricingLine[] = []
  for (const entry of request.items) {
    const item = config.items[entry.id]
    // A $0 catalog price is treated as unpriced: it is never sold online.
    if (!item || !item.purchasable || !Number.isFinite(item.cost) || item.cost <= 0) {
      throw new CheckoutPricingError('item_unavailable', 'An item in your cart is no longer available online. Please review your cart or contact us.', 409)
    }
    const quantity = Number(entry.quantity)
    cartSubtotal += item.cost * quantity
    lines.push({ itemId: item.id, itemName: item.name, quantity, unitPrice: item.cost, total: round2(item.cost * quantity) })
  }

  if (cartSubtotal < policy.minimumOrderSubtotal) {
    throw new CheckoutPricingError('below_minimum', 'The minimum online delivery order is ' + money(policy.minimumOrderSubtotal) + ' in rentals before fees and tax. Please add items or call ' + phone + '.', 400)
  }

  const tierId = typeof request.durationTierId === 'string' ? request.durationTierId : null
  const durationTier = config.tiers.find(tier => tier.id === tierId) || config.tiers[0] || null
  const durationFee = durationTier ? Math.round(cartSubtotal * (durationTier.percent / 100) * 100) / 100 : 0
  const adjustedSubtotal = Math.round((cartSubtotal + durationFee) * 100) / 100

  // Only currently active special-request fees are applied; an ID that is no
  // longer offered is ignored rather than charged.
  const requestedFeeIds = new Set((request.specialRequestIds || []).filter(id => typeof id === 'string'))
  const selectedFees = config.specialRequestFees.filter(fee => requestedFeeIds.has(fee.id))
  const specialRequestFee = selectedFees.reduce((sum, fee) => sum + fee.amount, 0)

  const couponCode = normalizeCouponCode(request.couponCode)
  const couponDiscount = couponDiscountFor(config.coupon, couponCode, cartSubtotal, config.now)

  let lastMinuteFee = 0
  if (hoursUntilEvent < LAST_MINUTE_WINDOW_HOURS) {
    if (policy.lastMinuteFee === null) {
      throw new CheckoutPricingError('last_minute_not_offered', 'Events less than 72 hours away cannot be booked online. Please call ' + phone + ' to check availability.', 400)
    }
    lastMinuteFee = policy.lastMinuteFee
  }

  const damageWaiver = !!request.damageWaiver
  if (damageWaiver && policy.damageWaiverPercent === null) {
    throw new CheckoutPricingError('damage_waiver_not_offered', 'The damage waiver is not offered online. Please go back to checkout and review your options.', 400)
  }
  const damageWaiverPercent = policy.damageWaiverPercent
  const damageWaiverFee = damageWaiver && damageWaiverPercent !== null ? Math.round(adjustedSubtotal * (damageWaiverPercent / 100) * 100) / 100 : 0

  let exactDeliveryFee = 0
  if (request.exactDeliveryRequested) {
    if (policy.exactDeliveryFee === null) {
      throw new CheckoutPricingError('exact_delivery_not_offered', 'Guaranteed exact-time delivery is not offered online. Please choose a delivery window or call ' + phone + '.', 400)
    }
    if (timeToMinutes(request.exactDeliveryTime) < 0) {
      throw new CheckoutPricingError('exact_time_invalid', 'Please choose a valid exact delivery time.', 400)
    }
    exactDeliveryFee = policy.exactDeliveryFee
  }

  let exactPickupFee = 0
  if (request.pickupType === 'exact') {
    const minutes = timeToMinutes(request.exactPickupTime)
    if (minutes < 0) throw new CheckoutPricingError('exact_time_invalid', 'Please choose a valid exact pickup time.', 400)
    const late = minutes >= LATE_PICKUP_FROM && minutes <= LATE_PICKUP_UNTIL
    const fee = policy.exactPickupFee === null ? null : late ? policy.lateExactPickupFee : policy.exactPickupFee
    if (fee === null) {
      throw new CheckoutPricingError('exact_pickup_not_offered', 'Guaranteed exact-time pickup is not offered online for that time. Please choose a flexible pickup or call ' + phone + '.', 400)
    }
    exactPickupFee = fee
  }
  const schedulingFeeTotal = exactDeliveryFee + exactPickupFee

  const salesTax = config.salesTax
  if (!salesTax || salesTax.status === 'unknown_zip') {
    throw new CheckoutPricingError('tax_not_configured', 'Sales tax for this delivery ZIP has not been set up for online checkout. Please call ' + phone + ' to book.', 503)
  }
  if (salesTax.status === 'needs_address_review') {
    const names = salesTax.candidates.map(candidate => candidate.name).join(' or ')
    throw new CheckoutPricingError('tax_address_review', 'Sales tax for ZIP ' + salesTax.zip + ' depends on whether the address is in ' + names + '. Please call ' + phone + ' so we can confirm your address and book your order.', 409)
  }
  const taxRate = salesTax.ratePercent
  if (!Number.isFinite(taxRate) || taxRate <= 0) {
    throw new CheckoutPricingError('tax_not_configured', 'Sales tax for this delivery ZIP has not been set up for online checkout. Please call ' + phone + ' to book.', 503)
  }

  if (!config.depositRule || !Number.isFinite(config.depositRule.amount) || config.depositRule.amount < 0) {
    throw new CheckoutPricingError('deposit_not_configured', 'Deposit rules have not been configured for online checkout yet. Please contact us to book.', 503)
  }
  const deliveryFee = config.deliveryFee
  if (!Number.isFinite(deliveryFee) || deliveryFee <= 0) {
    throw new CheckoutPricingError('delivery_not_configured', 'Delivery pricing for this ZIP has not been configured yet. Please contact us before checkout.', 503)
  }

  const discountedSubtotal = Math.max(adjustedSubtotal - couponDiscount, 0)
  const taxableBase = discountedSubtotal + deliveryFee + damageWaiverFee + specialRequestFee + lastMinuteFee + schedulingFeeTotal
  const taxAmount = Math.round(taxableBase * (taxRate / 100) * 100) / 100
  const grandTotal = discountedSubtotal + deliveryFee + damageWaiverFee + specialRequestFee + taxAmount + lastMinuteFee + schedulingFeeTotal

  const rule = config.depositRule
  const requiredDeposit = rule.type !== 'percentage'
    ? Math.min(rule.amount, grandTotal)
    : Math.round(grandTotal * (rule.amount / 100) * 100) / 100

  const tipAmount = Number(request.tipAmount) || 0
  if (!Number.isFinite(tipAmount) || tipAmount < 0) throw new CheckoutPricingError('tip_invalid', 'Please enter a valid tip amount.', 400)
  if (tipAmount > round2(grandTotal * NYC_MAX_TIP_RATIO)) throw new CheckoutPricingError('tip_too_large', 'Please contact us to add a tip larger than the order total.', 400)

  return {
    version: NYC_PRICING_VERSION,
    lines,
    cartSubtotal,
    durationTier,
    durationFee,
    adjustedSubtotal,
    rentalDays: durationTier?.minDays || 1,
    durationLabel: durationTier?.label || null,
    specialRequests: selectedFees.map(fee => ({ id: fee.id, name: fee.name, amount: fee.amount })),
    specialRequestFee,
    specialRequestNames: selectedFees.map(fee => fee.name).join(', ') || null,
    couponCode: couponDiscount > 0 ? couponCode : null,
    couponDiscount,
    damageWaiver,
    damageWaiverPercent,
    damageWaiverFee,
    lastMinuteFee,
    exactDeliveryFee,
    exactPickupFee,
    deliveryFee,
    taxRate,
    taxJurisdiction: { id: salesTax.jurisdiction.id, name: salesTax.jurisdiction.name, reportingCode: salesTax.jurisdiction.reportingCode, zip: salesTax.zip },
    taxAmount,
    grandTotal,
    requiredDeposit,
    tipAmount,
    totalWithTip: grandTotal + tipAmount,
  }
}

/**
 * Validates the amount the customer chose to pay today against server pricing.
 * `principal` excludes the tip. Returns the principal rounded to cents.
 */
export function validateFirstPaymentPrincipal(principal: unknown, pricing: Pick<CheckoutPricingResult, 'grandTotal' | 'requiredDeposit'>): number {
  const value = typeof principal === 'number' ? principal : Number(principal)
  if (!Number.isFinite(value)) throw new CheckoutPricingError('payment_amount_invalid', 'Please choose how much to pay today.', 400)
  const cents = toCents(value)
  if (cents < toCents(pricing.requiredDeposit) || cents > toCents(pricing.grandTotal)) {
    throw new CheckoutPricingError('payment_amount_out_of_range', 'Your payment amount must be between the required deposit and the order total. Please review the payment page.', 409)
  }
  return cents / 100
}
