import { NYC_SERVICE_AREAS } from './nycServiceAreas'

// Delivery-area map only. This is not a showroom or customer pickup address.
export const NYC_SERVICE_MAP_EMBED_URL = 'https://www.google.com/maps?q=Riverdale%2C%20Bronx%2C%20New%20York&output=embed'

export function nycCalendarDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export type NycContactOutcome = 'received' | 'saved-without-email' | 'unconfirmed'
export function nycContactOutcome(status: number, payload: unknown): NycContactOutcome {
  if (status < 200 || status >= 300 || !payload || typeof payload !== 'object') return 'unconfirmed'
  const response = payload as Record<string, unknown>
  // The API also returns success:true to rejected bots. Never call that a saved inquiry.
  if (response.success !== true || response.saved !== true) return 'unconfirmed'
  if (response.notificationSent === true) return 'received'
  if (response.notificationSent === false) return 'saved-without-email'
  return 'unconfirmed'
}

export function nycGoogleProfileHref(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value)
    const allowed = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'g.page']
    return url.protocol === 'https:' && allowed.includes(url.hostname) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export interface NycHelpSection {
  id: string
  title: string
  items: Array<{ question: string; answer: string }>
}

// Do not add inherited prices, insurance claims, deposit amounts, cancellation
// promises or equipment limits here. Those require approved NYC-specific data.
// These answers are shared by the visible FAQ and its structured data.
export const NYC_FAQ_SECTIONS: NycHelpSection[] = [
  {
    id: 'planning', title: 'Planning your NYC event', items: [
      { question: 'Which areas can I ask about for delivery?', answer: `Our listed NYC delivery communities are ${NYC_SERVICE_AREAS.map(area => area.name).join(', ')}. Send your exact event address and ZIP code so the NYC team can check the location, access and delivery arrangements. A listed community is not a guarantee that every address or date is available.` },
      { question: 'What should I include in an inquiry?', answer: 'Include your event date, exact address and ZIP code, guest count, requested items and quantities, setup surface, usable space and access details. Photos and measurements can help the NYC team review the site. For an existing NYC order, include your order number.' },
      { question: 'Does sending an inquiry reserve equipment?', answer: 'No. An inquiry, saved cart or layout idea is not a confirmed reservation. Review availability, the final quote and booking requirements with the NYC team before treating your event as booked.' },
      { question: 'What if I cannot find an item or price online?', answer: 'Call or email the NYC team with the item and event date. An empty category or missing price is not a confirmed stock shortage, a free rental or a confirmed offer. Do not use another location\'s price or availability as a NYC quote.' },
    ],
  },
  {
    id: 'quotes', title: 'Quotes, payments and order changes', items: [
      { question: 'Where can I confirm my total rental cost?', answer: 'Use the final NYC quote or the completed checkout breakdown for your selected items and event details. Review the rental subtotal, delivery, applicable setup or other charges, tax, payment due and remaining balance before approving payment.' },
      { question: 'Are delivery and setup automatically included?', answer: 'Do not assume they are included. Ask the NYC team to confirm the delivery and setup arrangements and charges for your exact address and equipment. A missing delivery price must be reviewed before payment; it does not mean free delivery.' },
      { question: 'What deposit and balance deadline apply?', answer: 'Ask for the deposit requirement and remaining-balance deadline shown on your NYC quote and rental agreement. Do not rely on a general FAQ or another Friendly location\'s policy for your order.' },
      { question: 'What should I do if online payment is unavailable?', answer: 'Contact the NYC team before paying. Do not send card details by email or through the inquiry form, and do not pay through a different Friendly location\'s website. Only use the payment option or link confirmed for your NYC order.' },
      { question: 'How do I request a cancellation, reschedule or item change?', answer: 'Contact the NYC team with your order number and requested change. Ask which cancellation or rescheduling terms apply to your agreement and whether any fees or availability limits apply. A change request is not confirmed until the team confirms it.' },
    ],
  },
  {
    id: 'delivery', title: 'Delivery, setup and collection', items: [
      { question: 'Can I collect my rental from a warehouse?', answer: 'NYC rentals are delivery-only. Customer warehouse pickup is not available. The Riverdale map on our contact page identifies the service area, not a pickup or showroom address.' },
      { question: 'When will delivery and collection happen?', answer: 'Share the event start and finish times, venue access hours and any same-day collection requirement before booking. Delivery, setup and collection windows must be confirmed with the NYC team; do not assume a particular time from the event date alone.' },
      { question: 'What access details does the team need?', answer: 'Tell us about stairs, elevators, narrow gates, long carries, parking or loading restrictions, required appointments and the distance from unloading to setup. Send photos and measurements when access or usable space is uncertain.' },
      { question: 'Can a tent be installed on my surface?', answer: 'Send the proposed surface, measurements and photos before booking. The team must confirm the tent type, space and anchoring arrangement for that site. Do not assume a tent is approved for pavement or that a category image shows a suitable installation for your venue.' },
    ],
  },
  {
    id: 'venue', title: 'Venue and equipment questions', items: [
      { question: 'What should I check with a park, school or other venue?', answer: 'Ask the venue what rental approvals, access rules, setup restrictions and documents it requires, then share those requirements with the NYC team before booking. Venue requirements and item availability need individual confirmation.' },
      { question: 'Can you provide documents requested by my venue?', answer: 'Send the exact venue requirements and deadlines before booking. The NYC team needs to confirm which documents can be supplied and whether the requested event arrangements can be accepted. Do not assume a document or approval is already in place.' },
      { question: 'How do I confirm power, water and space requirements?', answer: 'Ask for the requirements for the exact equipment being quoted. Share the available outlets, water source, usable space and any indoor height limits with the NYC team. Do not use generic amperage, distance, capacity or ceiling-height estimates as approval for a particular item.' },
      { question: 'Where do I get operating and weather instructions?', answer: 'Request the item-specific operating, supervision and weather instructions from the NYC team before use. Follow the instructions supplied for that equipment. Contact the team immediately if instructions are missing or you are unsure how to use an item.' },
    ],
  },
]
