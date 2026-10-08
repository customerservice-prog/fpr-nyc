export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNycCheckoutPolicy } from '@/lib/nycCheckoutPricingServer'
import { NYC_SALES_TAX_JURISDICTIONS, formatTaxRatePercent } from '@/lib/nycSalesTax'
import { BUSINESS } from '@/lib/utils'

interface FaqEntry {
  q: string
  a: string
}

const FAQ_DATA: FaqEntry[] = [
  { q: 'How do I book a rental?', a: 'Browse our catalog, select items, choose your event date, and complete checkout online. You can also call 315-884-1498 for help.' },
  { q: 'What can I rent from you?', a: 'We carry tents, tables and chairs, linens, lighting, bounce houses and waterslides, concessions and beverage service, dance floors, generators, photo booths, yard games, heating and cooling, wedding packages, and party accessories.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards through our secure online checkout.' },
  { q: 'When is the remaining balance due?', a: 'The remaining balance is due 3 days before your event. Your contract must be read and signed at final payment, or delivery will not occur.' },
  { q: 'Do you have coupons or promo codes?', a: 'Yes, if you have a coupon code you can enter it at checkout to apply your discount.' },
  { q: 'What is your cancellation policy? What if I need to cancel or reschedule my order?', a: 'Deposits are non-refundable, but rainchecks are valid for one year. There is no additional cancellation fee beyond the non-refundable deposit.' },
  { q: 'Can I modify my order after booking?', a: 'Yes, with 48-72 hours notice.' },
  { q: 'Do I need to sign a contract?', a: 'Yes. Your contract must be read and signed at final payment. If payment is not received and the contract is not signed, delivery will not occur.' },
  { q: 'What if items in my quote get reserved by someone else?', a: 'If items in your quote were already reserved for another event before you complete checkout, please call our office and we will help you find available substitute items.' },
  { q: 'What time will my delivery arrive?', a: 'Deliveries are scheduled within the delivery window you choose at checkout and arrive in the order our trucks reach each stop on their route that day.' },
  { q: 'What if I am picking up my order myself?', a: 'Friendly Party Rental NYC is delivery only. Warehouse pickup is not available; our crew delivers your rentals and collects them after your event.' },
  { q: 'Does the price include delivery and setup?', a: 'Delivery is charged per order based on your delivery ZIP code, and the exact delivery fee and sales tax are shown at checkout before you pay. Setup requirements for tents and inflatables are confirmed with our team before booking.' },
  { q: 'What areas do you serve?', a: 'We deliver to Riverdale, Fieldston, Kingsbridge and nearby Bronx neighborhoods, plus Yonkers, Mount Vernon, New Rochelle, Bronxville, Tuckahoe, Eastchester and Pelham in Lower Westchester. The delivery fee for your ZIP code is shown at checkout.' },
  { q: 'When do you set up and pick up?', a: 'Setup is coordinated in advance based on your event schedule, and pickup is typically the same day or the following morning for evening events.' },
  { q: 'Does setup time count toward my rental period?', a: 'No, setup time does not count toward your rental period.' },
  { q: 'What if my event starts early in the morning?', a: 'Early setups are available - just let us know your event time when booking.' },
  { q: 'What if my location has stairs or hills or a tiered yard?', a: 'Please contact our office in advance if your location includes stairs, hills, a tiered backyard, or other obstacles so we can review setup options. If undisclosed obstacles extend setup time, a $50 fee may apply.' },
  { q: 'Should I tip the delivery crew?', a: 'Tipping is optional but appreciated. You will see a tip prompt during checkout if you would like to add one for the delivery team.' },
  { q: 'What happens if there is bad weather?', a: 'We monitor weather closely. Past and fully-booked dates are shown as closed on our calendar. Light rain is generally fine for setups, but severe weather may require pausing inflatables for safety.' },
  { q: 'Can I see my order status or delivery tracking?', a: 'Yes. Use the secure My Order page at /my-order to verify your reservation by email, see your current order details, and send change requests to the NYC team. For live truck timing, call or text ' + BUSINESS.phone + '.' },
  { q: 'Can bounce houses be set up indoors?', a: 'Yes, as long as the space has a minimum 14-16 ft ceiling height.' },
  { q: 'What happens if it rains during my event?', a: 'Light rain is generally okay, but heavy rain, lightning, or high winds require shutting down inflatables for safety.' },
  { q: 'Can you set up at parks?', a: 'Yes. Permits may be required for park setups, and the customer is responsible for obtaining them.' },
  { q: 'What surfaces can you set up on?', a: 'Frame tents, tables, and equipment can be set up on grass, pavement, turf, gravel, or concrete. Pole tents must be staked into the ground with a gas-powered hammer about 42 inches deep, so they cannot go on concrete or pavement.' },
  { q: 'Do I need a permit for a backyard tent?', a: 'Usually not for residential setups. Large tents at commercial venues may require permits.' },
  { q: 'Can you do a free yard assessment?', a: 'Yes! Call 315-884-1498 to schedule one.' },
  { q: 'Is your equipment clean and safe?', a: 'Yes - every piece is cleaned, sanitized, and inspected before and after every rental. Our commercial-grade equipment is safe for children with adult supervision recommended.' },
  { q: 'What if something breaks?', a: 'Normal wear is expected and not charged. Damage from misuse may have additional associated costs; ask our team about damage responsibility when you book.' },
  { q: 'Do you carry insurance?', a: 'Yes, we are fully insured.' },
  { q: 'How much does a bounce house cost?', a: 'Current bounce house and waterslide prices are listed on each item in our Bounce House & Waterslide Rentals category. Choose your event date to see what is available.' },
  { q: 'Do bounce houses need power?', a: 'Yes, constant air supply is needed - a 20-amp outlet within 100 feet is required. We also rent generators for locations without power.' },
  { q: 'Do water slides need a water hookup?', a: 'Yes, a standard garden hose connection is needed.' },
  { q: 'Do you have wedding packages?', a: 'Yes! We offer full wedding and party packages that bundle tents, tables, chairs, linens, lighting, and more - see our Weddings page for details.' },
  { q: 'Do you rent linens?', a: 'Yes, we carry a variety of linens to match your event colors and style.' },
  { q: 'Do you rent lighting?', a: 'Yes, we offer event lighting rentals to help set the mood for your party.' },
  { q: 'Do you rent generators?', a: 'Yes, we rent generators for locations without easy power access. Current prices are listed in our Generator Rentals category.' },
  { q: 'Do you rent photo booths?', a: 'Yes, we offer photobooth rentals for weddings and parties.' },
  { q: 'Do you rent concession machines?', a: 'Yes, we carry concession machines and beverage and food service equipment like popcorn, cotton candy, and snow cone machines.' },
  { q: 'Do you rent yard games?', a: 'Yes, we carry a variety of yard games for parties and events.' },
  { q: 'Do you rent dance floors?', a: 'Yes, we offer dance floor and stage add-on rentals.' },
]

const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'do', 'does', 'i', 'my', 'you', 'your', 'to', 'for', 'of', 'in', 'on', 'at', 'and', 'or', 'if', 'what', 'when', 'how', 'can', 'need', 'it', 'be', 'me', 'have', 'has', 'there', 'am', 'im'])

const SYNONYMS: Record<string, string> = {
  jumper: 'bounce',
  jumpers: 'bounce',
  jump: 'bounce',
  jumpy: 'bounce',
  bouncy: 'bounce',
  bouncer: 'bounce',
  bouncers: 'bounce',
  moonbounce: 'bounce',
  moonwalk: 'bounce',
  moonwalks: 'bounce',
  inflatable: 'bounce',
  inflatables: 'bounce',
  castle: 'bounce',
  castles: 'bounce',
  slide: 'waterslide',
  slides: 'waterslide',
  canopy: 'tent',
  canopies: 'tent',
  tarp: 'tent',
  marquee: 'tent',
  pric: 'price',
  pricing: 'price',
  rate: 'price',
  rates: 'price',
  cost: 'price',
  costs: 'price',
  charge: 'price',
  charges: 'price',
  reserv: 'book',
  reservation: 'book',
  reservations: 'book',
  schedule: 'book',
  booking: 'book',
  bookings: 'book',
  refund: 'cancel',
  reschedule: 'cancel',
  cancell: 'cancel',
  cancelling: 'cancel',
  deliver: 'delivery',
  delivers: 'delivery',
  payment: 'pay',
  payments: 'pay',
  paying: 'pay',
  paid: 'pay',
  tablecloth: 'linen',
  tablecloths: 'linen',
  napkin: 'linen',
  napkins: 'linen',
  linens: 'linen',
  popcorn: 'concession',
  cottoncandy: 'concession',
  snowcone: 'concession',
  snowcones: 'concession',
  slushie: 'concession',
  slushies: 'concession',
  serve: 'delivery',
  serves: 'delivery',
  serving: 'delivery',
  served: 'delivery',
}

function stem(word: string): string {
  if (word.endsWith('ation') && word.length > 7) {
    const root = word.slice(0, -5)
    if (root.length > 2 && root[root.length - 1] === root[root.length - 2]) return root.slice(0, -1)
    return root
  }
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3)
  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3) + 'y'
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('es') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1)
  return word
}

function normalize(word: string): string {
  const stemmed = stem(word)
  return SYNONYMS[stemmed] ?? SYNONYMS[word] ?? stemmed
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(normalize)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function fuzzyMatches(queryTokenList: string[], targetToken: string): boolean {
  if (targetToken.length < 5) return false
  const maxDist = targetToken.length >= 9 ? 2 : 1
  for (const qt of queryTokenList) {
    if (qt.length < 5) continue
    if (Math.abs(qt.length - targetToken.length) > maxDist) continue
    if (levenshtein(qt, targetToken) <= maxDist) return true
  }
  return false
}

function scoreOverlap(queryTokens: Set<string>, targetText: string): number {
  const queryTokenList = Array.from(queryTokens)
  const targetTokens = tokenize(targetText)
  let score = 0
  const seen = new Set<string>()
  targetTokens.forEach((t) => {
    if (seen.has(t)) return
    if (queryTokens.has(t)) {
      score += 1
      seen.add(t)
    } else if (fuzzyMatches(queryTokenList, t)) {
      score += 1
      seen.add(t)
    }
  })
  return score
}

function detectSmallTalk(trimmed: string): string | null {
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  const wordCount = cleaned.split(' ').length
  if (wordCount > 5) return null
  if (/^(bye|goodbye|good bye|see you|see ya|later|take care)$/.test(cleaned)) {
    return 'Thanks for stopping by! Have a great day, and feel free to come back anytime you have questions.'
  }
  if (/^(thanks|thank you|thx|ty|appreciate it|much appreciated|awesome thanks)$/.test(cleaned)) {
    return "You're welcome! Is there anything else I can help you find or answer?"
  }
  if (/^(hi|hello|hey|hiya|yo|sup|howdy|greetings|good morning|good afternoon|good evening)( there| friend| team)?[!. ]*$/.test(cleaned)) {
    return 'Hi there! I can help with rentals, pricing, delivery times, deposits, and more. What can I help you with today?'
  }
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message : ''
  const trimmed = message.trim()

  if (!trimmed) {
    return NextResponse.json({ answer: 'Could you type a question? I am happy to help!' })
  }

  const smallTalk = detectSmallTalk(trimmed)
  if (smallTalk) {
    return NextResponse.json({ answer: smallTalk })
  }

  const [categories, items, depositRule, tiers, fees] = await Promise.all([
    prisma.category.findMany({ where: { displayToCustomer: true }, orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true, description: true } }).catch(() => []),
    prisma.item.findMany({ where: { displayToCustomer: true, status: 'Available', cost: { gt: 0 } }, select: { name: true, cost: true, category: { select: { name: true } } } }).catch(() => []),
    prisma.depositRule.findFirst({ where: { isActive: true } }).catch(() => null),
    prisma.pricingTier.findMany({ orderBy: { sortOrder: 'asc' } }).catch(() => []),
    prisma.specialRequestFee.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }).catch(() => []),
  ])
  // Every price-related answer comes from approved settings. Nothing is guessed:
  // when a value is not configured the answer says so and points to the office.
  const policy = getNycCheckoutPolicy().policy
  const money = (value: number) => '$' + value.toFixed(2).replace(/\.00$/, '')
  const callUs = 'Call or text ' + BUSINESS.phone + '.'

  const depositText = depositRule
    ? (depositRule.type === 'percentage'
      ? 'Yes, a ' + depositRule.amount + '% deposit is required at booking to reserve your date. The remaining balance is due before delivery.'
      : 'Yes, a ' + money(depositRule.amount) + ' deposit is required at booking to reserve your date. The remaining balance is due before delivery.')
    : 'A deposit is required to reserve your date. Our team will confirm the amount when you book. ' + callUs

  const rates = Object.values(NYC_SALES_TAX_JURISDICTIONS)
  const taxText = 'Yes. New York sales tax is based on your delivery address and is calculated at checkout: '
    + rates.map((j) => j.name + ' ' + formatTaxRatePercent(j.ratePercent)).join(', ') + '.'

  const exactParts: string[] = []
  if (policy?.exactDeliveryFee != null) exactParts.push('a guaranteed exact delivery time is ' + money(policy.exactDeliveryFee))
  if (policy?.exactPickupFee != null) exactParts.push('a guaranteed exact pickup time is ' + money(policy.exactPickupFee) + (policy.lateExactPickupFee != null ? ' (' + money(policy.lateExactPickupFee) + ' from 10pm to 11:30pm)' : ''))
  const exactText = exactParts.length
    ? 'Yes: ' + exactParts.join(', and ') + '. Choose it when you pick your delivery schedule.'
    : 'Guaranteed exact delivery and pickup times are not booked online. Choose a delivery window at checkout, or ' + callUs.charAt(0).toLowerCase() + callUs.slice(1)
  const extraFeesText = fees.length
    ? ' Optional services: ' + fees.map((fee) => fee.name + ' ' + money(fee.amount)).join(', ') + '.'
    : ''

  const damageWaiverText = policy?.damageWaiverPercent != null
    ? 'An optional damage waiver is available at checkout for ' + formatTaxRatePercent(policy.damageWaiverPercent) + ' of the rental subtotal. It covers accidental damage to our equipment while in your possession, but not intentional damage or theft.'
    : 'A damage waiver is not offered online. Please ask our team about damage responsibility when you book. ' + callUs

  const lastMinuteText = policy?.lastMinuteFee != null
    ? 'Online orders must be placed at least 24 hours before your event. Events less than 72 hours away have a ' + money(policy.lastMinuteFee) + ' last-minute booking fee, which you confirm before paying.'
    : 'Online orders must be placed at least 72 hours before your event. For events sooner than that, ' + callUs.charAt(0).toLowerCase() + callUs.slice(1)

  const tiersText = tiers.length > 1
    ? 'Yes. Longer rentals are priced by rental length at checkout: ' + tiers.map((tier) => tier.label + (tier.percent ? ' (+' + tier.percent + '% of the 1-day price)' : '')).join(', ') + '.'
    : 'Online orders are priced for a single event day. For multi-day rentals, ' + callUs.charAt(0).toLowerCase() + callUs.slice(1)

  const dynamicFaq: { q: string; a: string }[] = [
    { q: 'Do I need to pay a deposit?', a: depositText },
    { q: 'Is there sales tax on my order?', a: taxText },
    { q: 'Can I request overnight or exact delivery times?', a: exactText + extraFeesText },
    { q: 'Can I request an exact delivery time?', a: exactText },
    { q: 'Do you charge a damage waiver?', a: damageWaiverText },
    { q: 'Is there a last minute booking fee? How far in advance should I book?', a: 'As early as possible - summer weekends often book weeks ahead. ' + lastMinuteText },
    { q: 'Do you offer discounts for multi-day rentals?', a: tiersText },
  ]

  const allFaq = [...dynamicFaq, ...FAQ_DATA]

  const queryTokens = new Set(tokenize(trimmed))
  if (queryTokens.size === 0) {
    return NextResponse.json({ answer: 'I am not sure I understood that. Could you rephrase your question, or call us at 315-884-1498?' })
  }

  const wantsInventoryInfo = ['have', 'rent', 'available', 'availability', 'cost', 'price', 'much'].some((w) => trimmed.toLowerCase().includes(w))

  let bestItemScore = 0
  let bestItem: { name: string; cost: number; categoryName: string } | null = null
  for (const item of items) {
    const score = scoreOverlap(queryTokens, item.name)
    if (score > bestItemScore) {
      bestItemScore = score
      bestItem = { name: item.name, cost: item.cost, categoryName: item.category?.name ?? '' }
    }
  }

  let bestCategoryScore = 0
  let bestCategory: { name: string; slug: string; description: string | null } | null = null
  for (const cat of categories) {
    const score = scoreOverlap(queryTokens, cat.name + ' ' + (cat.description ?? ''))
    if (score > bestCategoryScore) {
      bestCategoryScore = score
      bestCategory = { name: cat.name, slug: cat.slug, description: cat.description }
    }
  }

  let bestFaqScore = 0
  let bestFaqEntry: { q: string; a: string } | null = null
  for (const entry of allFaq) {
    const score = scoreOverlap(queryTokens, entry.q + ' ' + entry.a)
    if (score > bestFaqScore) {
      bestFaqScore = score
      bestFaqEntry = entry
    }
  }

  if (wantsInventoryInfo && bestItem && bestItemScore >= 2) {
    const price = '$' + bestItem.cost.toFixed(2).replace(/\.00$/, '')
    return NextResponse.json({
      answer: 'Yes! We carry ' + bestItem.name + ' (' + bestItem.categoryName + ') starting at ' + price + '. Check availability for your date by selecting it on our booking calendar, or call 315-884-1498.',
    })
  }

  if (bestItemScore >= 3 && bestItemScore > bestFaqScore) {
    const price = '$' + bestItem!.cost.toFixed(2).replace(/\.00$/, '')
    return NextResponse.json({
      answer: 'We carry ' + bestItem!.name + ' in our ' + bestItem!.categoryName + ' category, starting at ' + price + '. You can check availability for your event date on our booking calendar.',
    })
  }

  if (bestCategoryScore >= 2 && bestCategoryScore > bestFaqScore) {
    return NextResponse.json({
      answer: (bestCategory!.description || ('We carry ' + bestCategory!.name + '.')) + ' Browse our ' + bestCategory!.name + ' selection on the Rentals menu to see items and pricing.',
    })
  }

  if (bestFaqEntry && bestFaqScore >= 2) {
    return NextResponse.json({ answer: bestFaqEntry.a })
  }

  if (bestFaqEntry && bestFaqScore === 1 && bestItemScore === 0 && bestCategoryScore === 0) {
    return NextResponse.json({ answer: bestFaqEntry.a })
  }

  const categoryNames = categories.slice(0, 6).map((c) => c.name).filter((n): n is string => Boolean(n))
  const suggestionText = categoryNames.length > 0
    ? ' We offer things like ' + categoryNames.join(', ') + ', and more.'
    : ''

  return NextResponse.json({
    answer: "I don't have an exact answer for that yet." + suggestionText + " Call or text 315-884-1498, or visit our Contact Us page and we'll get right back to you.",
  })
}
