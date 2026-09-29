import { prisma } from '@/lib/prisma'
import { getDeliveryQuote } from '@/lib/delivery'
import {
  computeNycCheckoutPricing,
  normalizeCouponCode,
  type CheckoutPricingConfig,
  type CheckoutPricingRequest,
  type CheckoutPricingResult,
  type PricingCatalogItem,
} from '@/lib/nycCheckoutPricing'

/** Active sales-tax rate (percent) or null when none is configured. Never falls back to a guessed rate. */
export async function getActiveTaxRatePercent(): Promise<number | null> {
  const row = await prisma.taxRate.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  const rate = row ? Number(row.rate) : NaN
  return Number.isFinite(rate) && rate >= 0 ? rate : null
}

export async function getActiveDepositRule(): Promise<{ type: string; amount: number } | null> {
  const row = await prisma.depositRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  if (!row || !Number.isFinite(Number(row.amount)) || Number(row.amount) < 0) return null
  return { type: row.type, amount: Number(row.amount) }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
  return typeof value === 'string' && value ? [value] : []
}

/** Builds the pricing inputs from a checkout/order request body. Browser-computed amounts are ignored. */
export function pricingRequestFromCheckoutBody(body: any): CheckoutPricingRequest {
  const scheduling = body?.schedulingDetails && typeof body.schedulingDetails === 'object' ? body.schedulingDetails : null
  return {
    items: (Array.isArray(body?.items) ? body.items : []).map((item: any) => ({
      id: typeof item?.id === 'string' ? item.id : '',
      quantity: Number(item?.quantity),
    })),
    eventDate: body?.eventDate,
    durationTierId: typeof body?.durationTierId === 'string' ? body.durationTierId : null,
    specialRequestIds: asStringArray(body?.specialRequests),
    couponCode: typeof body?.couponCode === 'string' ? body.couponCode : null,
    damageWaiver: body?.damageWaiver === true || body?.damageWaiver === 'true',
    exactDeliveryRequested: !!scheduling?.exactDeliveryRequested,
    exactDeliveryTime: typeof scheduling?.exactDeliveryTime === 'string' ? scheduling.exactDeliveryTime : null,
    pickupType: typeof scheduling?.pickupType === 'string' ? scheduling.pickupType : null,
    exactPickupTime: typeof scheduling?.exactPickupTime === 'string' ? scheduling.exactPickupTime : null,
    tipAmount: Number(body?.tipAmount) || 0,
  }
}

/**
 * Recomputes the full NYC checkout price on the server from the approved catalog,
 * pricing tiers, special-request fees, coupon, tax rate, deposit rule, and the
 * server ZIP delivery quote. Throws DeliveryQuoteError or CheckoutPricingError.
 */
export async function priceNycCheckout(body: any, now: Date = new Date()): Promise<CheckoutPricingResult> {
  const request = pricingRequestFromCheckoutBody(body)
  const quote = await getDeliveryQuote(body?.eventZip)
  const ids = Array.from(new Set(request.items.map(item => item.id).filter(Boolean)))
  const couponCode = normalizeCouponCode(request.couponCode)

  const [catalog, tiers, fees, coupon, taxRatePercent, depositRule] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, cost: true, displayToCustomer: true, status: true, bookableAfter: true },
    }),
    prisma.pricingTier.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.specialRequestFee.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    couponCode ? prisma.coupon.findUnique({ where: { code: couponCode } }) : Promise.resolve(null),
    getActiveTaxRatePercent(),
    getActiveDepositRule(),
  ])

  const items: Record<string, PricingCatalogItem> = {}
  for (const item of catalog) {
    const bookable = !item.bookableAfter || new Date(item.bookableAfter).getTime() <= now.getTime()
    items[item.id] = {
      id: item.id,
      name: item.name,
      cost: Number(item.cost),
      purchasable: item.displayToCustomer && item.status === 'Available' && bookable,
    }
  }

  const config: CheckoutPricingConfig = {
    items,
    tiers: tiers.map(tier => ({ id: tier.id, label: tier.label, minDays: tier.minDays, maxDays: tier.maxDays, percent: Number(tier.percent) })),
    specialRequestFees: fees.map(fee => ({ id: fee.id, name: fee.name, amount: Number(fee.amount) })),
    coupon: coupon ? { code: coupon.code, discountType: coupon.discountType, discountAmount: Number(coupon.discountAmount), isActive: coupon.isActive, expiresAt: coupon.expiresAt } : null,
    taxRatePercent,
    depositRule,
    deliveryFee: quote.fee,
    now,
  }
  return computeNycCheckoutPricing(request, config)
}

/** Combined quantity per catalog item (the same item can appear once per selected color). */
export function aggregateQuantities(items: Array<{ id: string; quantity: number }>): Map<string, number> {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (!item.id || !Number.isFinite(item.quantity) || item.quantity <= 0) continue
    totals.set(item.id, (totals.get(item.id) || 0) + item.quantity)
  }
  return totals
}
