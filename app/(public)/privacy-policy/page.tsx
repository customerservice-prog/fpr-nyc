import Link from 'next/link'
import { nycPageMetadata } from '@/lib/nycSeo'
import { BUSINESS } from '@/lib/utils'

export const metadata = nycPageMetadata(
  '/privacy-policy',
  'Privacy Policy | Friendly Party Rental NYC',
  'Learn how Friendly Party Rental NYC handles event inquiries, rental orders, payments, website analytics and customer contact information.'
)

export default function PrivacyPolicyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12 text-slate-800">
    <h1 className="text-3xl font-bold text-slate-950">Privacy Policy — Friendly Party Rental NYC</h1>
    <p className="mt-2 text-sm text-slate-600">Updated November 8, 2026 · Applies to friendlypartyrentalnyc.com</p>
    <p className="mt-6 leading-7">Friendly Party Rental NYC is operated by {BUSINESS.legalName}. We use information you share to provide rental quotes, respond to questions, process bookings, coordinate delivery and communicate about your event.</p>

    <h2 className="mt-8 text-xl font-bold">Information we may collect</h2>
    <p className="mt-3 leading-7">When you contact us, browse the catalog or place an order, we may process your name, email, phone number, event date, venue and delivery address, selected rental items, cart selections, setup requests, payment status, signed agreements, messages and support requests. Website usage, approximate device/browser information and advertising or analytics events may be recorded when those features are enabled. Some cart preferences may be stored in your browser.</p>

    <h2 className="mt-8 text-xl font-bold">Payments and optional saved cards</h2>
    <p className="mt-3 leading-7">Online payment-card entry is handled through Stripe rather than a general inquiry form. If you separately authorize saving a payment method for later charges, the authorization shown during checkout or in the applicable agreement describes that use. Please do not send payment card details by email, text or contact form.</p>

    <h2 className="mt-8 text-xl font-bold">How information is used</h2>
    <p className="mt-3 leading-7">We use relevant details to answer questions, prepare and update quotes, check availability, process payments or refunds, provide contracts and receipts, arrange delivery or collection, send transactional messages and balance reminders where applicable, investigate issues, protect against misuse and maintain business records. Marketing messages, when offered, should include a way to opt out of future marketing communications.</p>

    <h2 className="mt-8 text-xl font-bold">Service providers and sharing</h2>
    <p className="mt-3 leading-7">Information may be processed by providers that support this website and its bookings, such as hosting, payments, email, customer service, scheduling, analytics and authorized delivery or setup partners. Information needed to carry out a rental may be shared with the provider responsible for that part of the service. Their processing is subject to their respective terms and privacy notices.</p>

    <h2 className="mt-8 text-xl font-bold">Cookies, analytics &amp; browser storage</h2>
    <p className="mt-3 leading-7">Site features may use browser storage or cookies to maintain your session, cart and preferences, and may use analytics or conversion measurement when configured. You can manage browser storage and cookie settings in your browser, although clearing them may reset an unfinished cart or require you to sign in again.</p>

    <h2 className="mt-8 text-xl font-bold">Retention, corrections &amp; questions</h2>
    <p className="mt-3 leading-7">Information may be retained as needed for booking operations, accounting, dispute handling, security and applicable legal requirements. If you have a question about information associated with your NYC order, or wish to request a correction or deletion where applicable, please contact us. Some records may need to be retained for legitimate business or legal reasons.</p>

    <h2 className="mt-8 text-xl font-bold">Contact Friendly Party Rental NYC</h2>
    <p className="mt-3 leading-7">Email <a className="font-semibold underline break-all" href={BUSINESS.emailHref}>{BUSINESS.email}</a> or call <a className="font-semibold underline" href="tel:+19172747857">{BUSINESS.phone}</a>. This policy is for the NYC website; the Syracuse operation has its own booking information.</p>
    <p className="mt-8 text-sm text-slate-600">For deposit, delivery and cancellation information, see <Link href="/rental-policies" className="font-semibold underline">NYC Rental Policies</Link>. We may update this page as the website or applicable practices change.</p>
  </main>
}
