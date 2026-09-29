// Server-side NYC checkout pricing.
//
// Pure module (no Prisma / Next.js imports) so the math can be unit tested; the
// database-backed loader lives in lib/nycCheckoutPricingServer.ts.
//
// The arithmetic intentionally mirrors app/(public)/checkout/payment/page.tsx so a
// customer who has not tampered with anything always sees the exact total that
// the server will charge. The server never trusts browser-supplied prices,
// subtotals, taxes, fees, discounts, or totals: it recomputes everything from the
// approved catalog and settings, then rejects the order if the browser displayed
// a different total.
//
// Fail-closed rules:
//   - every item must exist in the catalog, be customer-visible and available;
//   - an active sales-tax rate must be configured (no hard-coded fallback rate);
//   - an active deposit rule must be configured;
//   - the delivery fee comes from the server ZIP quote (unconfigured ZIPs never
//     price as free delivery);
//   - orders within 24 hours of the event and below the delivery minimum are refused.

export const NYC_PRICING_VERSION = 'nyc-server-pricing-v1'
export const NYC_QUOTE_EDIT_PRICING_VERSION = 'nyc-quote-self-edit-v1'
/** Pricing versions whose stored totals were computed by the server (safe to charge online). */
export const NYC_SERVER_PRICED_VERSIONS = [NYC_PRICING_VERSION, NYC_QUOTE_EDIT_PRICING_VERSION]

// Business rules that already existed in the NYC storefront code. They are kept
// identical here so the server total equals the total the customer is shown.
export const NYC_MINIMUM_DELIVERY_SUBTOTAL = 100
export const NYC_LAST_MINUTE_FEE = 49.99
export const NYC_DAMAGE_WAIVER_RATE = 0.1
export const NYC_EXACT_DELIVERY_FEE = 50
export const NYC_EXACT_PICKUP_FEE = 50
export const NYC_LATE_EXACT_PICKUP_FEE = 75
export const NYC_MAX_TIP_RATIO = 1

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
  /** Active sales-tax rate in percent, or null when none is configured. */
  taxRatePercent: number | null
  /** Active deposit rule, or null when none is configured. */
  depositRule: DepositRuleConfig | null
  /** Delivery fee from the server-side ZIP quote. */
  deliveryFee: number
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
  specialRequestFee: number
  specialRequestNames: string | null
  couponCode: string | null
  couponDiscount: number
  damageWaiver: boolean
  damageWaiverFee: number
  lastMinuteFee: number
  exactDeliveryFee: number
  exactPickupFee: number
  deliveryFee: number
  taxRate: number
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
  if (!value) return -1
  const [h, m] = value.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return -1
  return h * 60 + m
}

export function exactPickupFeeFor(time: string | null | undefined): number {
  const minutes = timeToMinutes(time)
  if (minutes >= 22 * 60 && minutes <= 23 * 60 + 30) return NYC_LATE_EXACT_PICKUP_FEE
  return NYC_EXACT_PICKUP_FEE
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

export function computeNycCheckoutPricing(request: CheckoutPricingRequest, config: CheckoutPricingConfig): CheckoutPricingResult {
  if (!Array.isArray(request.items) || request.items.length === 0) {
    throw new CheckoutPricingError('cart_empty', 'Your cart is empty. Please add items before checkout.', 400)
  }

  const eventTime = new Date(request.eventDate).getTime()
  if (!Number.isFinite(eventTime)) throw new CheckoutPricingError('event_date_invalid', 'Please choose a valid event date.', 400)
  const hoursUntilEvent = (eventTime - config.now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilEvent < 24) {
    throw new CheckoutPricingError('event_too_soon', 'Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.', 400)
  }

  const quantities = new Map<string, number>()
  for (const entry of request.items) {
    const id = typeof entry?.id === 'string' ? entry.id : ''
    const quantity = Number(entry?.quantity)
    if (!id || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) {
      throw new CheckoutPricingError('cart_invalid', 'Your cart contains an invalid item or quantity. Please review your cart.', 400)
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity)
  }

  let cartSubtotal = 0
  const lines: CheckoutPricingLine[] = []
  for (const entry of request.items) {
    const item = config.items[entry.id]
    if (!item || !item.purchasable || !Number.isFinite(item.cost) || item.cost < 0) {
      throw new CheckoutPricingError('item_unavailable', 'An item in your cart is no longer available online. Please review your cart or contact us.', 409)
    }
    const quantity = Number(entry.quantity)
    cartSubtotal += item.cost * quantity
    lines.push({ itemId: item.id, itemName: item.name, quantity, unitPrice: item.cost, total: round2(item.cost * quantity) })
  }

  if (cartSubtotal > 0 && cartSubtotal < NYC_MINIMUM_DELIVERY_SUBTOTAL) {
    throw new CheckoutPricingError('below_minimum', 'Minimum order is $' + NYC_MINIMUM_DELIVERY_SUBTOTAL + ' for delivery orders.', 400)
  }

  const tierId = typeof request.durationTierId === 'string' ? request.durationTierId : null
  const durationTier = config.tiers.find(tier => tier.id === tierId) || config.tiers[0] || null
  const durationFee = durationTier ? Math.round(cartSubtotal * (durationTier.percent / 100) * 100) / 100 : 0
  const adjustedSubtotal = Math.round((cartSubtotal + durationFee) * 100) / 100

  // Like the payment page, only currently active special-request fees are applied;
  // an ID that is no longer offered is ignored rather than charged.
  const requestedFeeIds = new Set((request.specialRequestIds || []).filter(id => typeof id === 'string'))
  const selectedFees = config.specialRequestFees.filter(fee => requestedFeeIds.has(fee.id))
  const specialRequestFee = selectedFees.reduce((sum, fee) => sum + fee.amount, 0)

  const couponCode = normalizeCouponCode(request.couponCode)
  const couponDiscount = couponDiscountFor(config.coupon, couponCode, cartSubtotal, config.now)

  const lastMinuteFee = hoursUntilEvent >= 24 && hoursUntilEvent < 72 ? NYC_LAST_MINUTE_FEE : 0
  const damageWaiver = !!request.damageWaiver
  const damageWaiverFee = damageWaiver ? Math.round(adjustedSubtotal * NYC_DAMAGE_WAIVER_RATE * 100) / 100 : 0
  // Same rules the checkout scheduling dialog uses to build the fees it displays.
  const exactDeliveryFee = request.exactDeliveryRequested ? NYC_EXACT_DELIVERY_FEE : 0
  const exactPickupFee = request.pickupType === 'exact' ? exactPickupFeeFor(request.exactPickupTime) : 0
  const schedulingFeeTotal = exactDeliveryFee + exactPickupFee

  if (config.taxRatePercent === null || !Number.isFinite(config.taxRatePercent) || config.taxRatePercent < 0) {
    throw new CheckoutPricingError('tax_not_configured', 'Sales tax has not been configured for online checkout yet. Please contact us to book.', 503)
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
  const taxRate = config.taxRatePercent
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
    specialRequestFee,
    specialRequestNames: selectedFees.map(fee => fee.name).join(', ') || null,
    couponCode: couponDiscount > 0 ? couponCode : null,
    couponDiscount,
    damageWaiver,
    damageWaiverFee,
    lastMinuteFee,
    exactDeliveryFee,
    exactPickupFee,
    deliveryFee,
    taxRate,
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
