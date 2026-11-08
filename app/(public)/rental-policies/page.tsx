import Link from 'next/link'
import { nycPageMetadata } from '@/lib/nycSeo'
import { BUSINESS } from '@/lib/utils'

export const metadata = nycPageMetadata(
  '/rental-policies',
  'Rental Policies & Booking Information | Friendly Party Rental NYC',
  'Review Riverdale and Lower Westchester rental booking, delivery, payments, setup, weather and event-change information before placing an order.'
)

export default function RentalPoliciesPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12 text-slate-800">
    <h1 className="text-3xl font-bold text-slate-950">NYC Rental Policies &amp; Booking Information</h1>
    <p className="mt-2 text-sm text-slate-600">Updated November 8, 2026 · Friendly Party Rental NYC — Riverdale / Bronx / Lower Westchester</p>
    <p className="mt-6 leading-7">This page describes the NYC booking process. The itemized quote, confirmed invoice and applicable signed rental agreement set the specific rates, deadlines, responsibilities and cancellation terms for your event. Please review those documents before you pay or sign.</p>

    <h2 className="mt-8 text-xl font-bold">2027 bookings, quotes &amp; availability</h2>
    <p className="mt-3 leading-7">New online reservations are available for events on or after January 1, 2027. An inquiry, saved cart, event layout or estimated quote does not reserve equipment or guarantee a date. Availability, delivery capacity and the final total must be confirmed. A completed payment may be followed by a required rental-contract signature before delivery can be confirmed.</p>

    <h2 className="mt-8 text-xl font-bold">Delivery-only service area</h2>
    <p className="mt-3 leading-7">The NYC operation serves approved parts of Riverdale, the Bronx and Lower Westchester by delivery and event collection. Customer warehouse pickup is not offered. Service availability and travel charges depend on your exact event address and ZIP code; a map showing Riverdale is not a public pickup or showroom address.</p>

    <h2 className="mt-8 text-xl font-bold">Rental prices, deposits &amp; other charges</h2>
    <p className="mt-3 leading-7">NYC prices and packages are separate from our Syracuse location. Your checkout or approved quote identifies rental items, multi-day charges if applicable, delivery, optional services, applicable sales tax, and the amount due today. The minimum rental subtotal, deposit and balance due date are determined by the NYC quote and rental agreement. Do not rely on another Friendly Party Rental location’s fees or deposit rules.</p>
    <p className="mt-3 leading-7">A damage-waiver option may be offered at checkout with its price displayed. Its scope and exclusions are described by the applicable agreement; it should not be assumed to cover theft, intentional damage or every loss. Optional exact-time services or last-minute requests are only available when expressly offered and confirmed for your event.</p>

    <h2 className="mt-8 text-xl font-bold">Delivery, setup &amp; venue access</h2>
    <p className="mt-3 leading-7">Share your event start and end times, loading instructions, parking arrangements, stair or elevator access, carry distance, installation surface, usable dimensions and venue restrictions. Delivery and collection windows or guaranteed exact times must be confirmed for your specific order. Venue permissions, access approvals and any required permits should be arranged before the event.</p>

    <h2 className="mt-8 text-xl font-bold">Equipment use &amp; weather</h2>
    <p className="mt-3 leading-7">Equipment must be used according to the instructions provided for that item. Tents and inflatables may require adequate clearance, suitable anchoring, adult supervision and restrictions in unsafe weather. Tell us about slopes, hard surfaces, overhead obstructions and power or water limitations before booking. Our team must approve the proposed setup; a product photograph is not an installation guarantee.</p>

    <h2 className="mt-8 text-xl font-bold">Changes, cancellations, refunds &amp; remaining balances</h2>
    <p className="mt-3 leading-7">Contact the NYC team promptly with your order number if you need to reschedule, change items, cancel or report a problem. The current NYC rental agreement states that deposits are non-refundable and cancellations are eligible for a raincheck valid for one year; it also restricts refunds after setup. Additional restrictions, circumstances and applicable law may affect an individual order. Review the entire agreement, including exceptions, before paying; call us if any term is unclear. A change or refund is not approved until confirmed by the NYC team.</p>

    <h2 className="mt-8 text-xl font-bold">Need an answer before paying?</h2>
    <p className="mt-3 leading-7">Call <a className="font-semibold underline" href="tel:+19172747857">{BUSINESS.phone}</a> or email <a className="font-semibold underline break-all" href={BUSINESS.emailHref}>{BUSINESS.email}</a>. For additional information see <Link href="/frequently_asked_questions" className="font-semibold underline">NYC Frequently Asked Questions</Link>, <Link href="/service-area" className="font-semibold underline">Delivery Areas</Link>, and our <Link href="/privacy-policy" className="font-semibold underline">Privacy Policy</Link>.</p>
    <p className="mt-8 text-sm text-slate-600">This customer information page does not replace an individual signed rental agreement or create an offer for dates or equipment not available in NYC.</p>
  </main>
}
