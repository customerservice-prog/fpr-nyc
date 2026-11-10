import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { NYC_EMAIL_ADDRESS, NYC_NOTIFICATION_EMAIL } from '@/lib/nycEmail'
import NycPaymentReadiness from '@/components/admin/NycPaymentReadiness'
import { prisma } from '@/lib/prisma'
import { summarizeNycPhysicalInventory, type NycStockReadinessSummary } from '@/lib/nycPhysicalInventoryReadiness'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'NYC Launch Readiness', robots: { index: false, follow: false } }

export default async function NycLaunchReadinessPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') return <div className="p-6">Administrator access required.</div>

  // No credential values are included in HTML. Booleans do NOT prove delivery.
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
  const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  const emailTransportConfigured = resendConfigured || smtpConfigured
  const replyMonitoringConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_IMAP_HOST)
  const balanceRemindersEnabled = process.env.NYC_BALANCE_REMINDERS_ENABLED === 'true'
  const resendWebhookConfigured = Boolean(process.env.NYC_RESEND_WEBHOOK_SECRET)

  // Read NYC-only staff confirmations. These records are not the Syracuse-synced
  // public catalog quantities. Explicitly unavailable or confirmed stock now affects checkout.
  let physicalStock: NycStockReadinessSummary | null = null
  try {
    const [catalog, verifications] = await Promise.all([
      prisma.item.findMany({ where: { displayToCustomer: true }, select: { slug: true } }),
      prisma.nycPhysicalStockVerification.findMany({
        select: { itemSlug: true, status: true, verifiedQuantity: true, source: true, verifiedAt: true },
      }),
    ])
    physicalStock = summarizeNycPhysicalInventory(catalog.map(item => item.slug), verifications)
  } catch (error) {
    // Never show fake zeroes or say NYC inventory is ready if its database cannot be read.
    console.error('[nyc-launch-readiness] Physical inventory check unavailable', error)
  }

  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
    <Link href="/admin/settings" className="text-blue-700 underline">Back to NYC settings</Link>
    <div>
      <h1 className="text-2xl font-bold text-dark">NYC 2027 launch readiness</h1>
      <p className="mt-2 text-sm text-gray-600">Read-only checklist for Riverdale/Lower Westchester. It does not submit test orders, send messages, charge cards, enable automations or change settings.</p>
    </div>
    <NycPaymentReadiness />
    <section className="rounded-xl border bg-white p-5 space-y-4" aria-label="NYC physical inventory verification status">
      <h2 className="text-lg font-bold text-dark">Actual NYC stock verification</h2>
      {physicalStock ? <>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4"><p className="text-sm text-gray-600">Staff-confirmed items</p><strong className="text-2xl">{physicalStock.confirmed} / {physicalStock.catalogItems}</strong></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-gray-600">Still unverified</p><strong className="text-2xl">{physicalStock.unverified}</strong></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-gray-600">Marked unavailable</p><strong className="text-2xl">{physicalStock.unavailable}</strong></div>
        </div>
        <p className="text-sm text-gray-700">Of the staff-confirmed items, <strong>{physicalStock.physicallyStaged}</strong> are recorded as NYC-owned or physically staged, and <strong>{physicalStock.supplierCommitted}</strong> have supplier commitments.</p>
        {physicalStock.catalogItems === 0 && <p role="alert" className="text-sm text-amber-800">No public catalog items were found. Verify the NYC catalog sync before using these figures.</p>}
        {physicalStock.unverified > 0 && <p className="text-sm text-amber-800">NYC stock checks are incomplete. Mirrored Syracuse quantities are not confirmation that an item can be delivered in Riverdale.</p>}
      </> : <p role="alert" className="text-sm text-amber-800">Inventory verification data is currently unavailable. Do not assume that any NYC equipment is confirmed.</p>}
      <p className="text-sm text-gray-600">These are staff-entered confirmations, not live reservations or a guarantee that stock, suppliers, drivers, crews or dates are available for a customer order. Catalog quantities are unchanged. Unavailable items are blocked from online bookings; verified NYC quantities cap availability. Unverified items still require physical or supplier confirmation.</p>
      <p><Link href="/admin/inventory/physical-verification" className="inline-flex rounded border px-4 py-2 text-sm font-semibold text-blue-700">Review and confirm NYC physical stock</Link></p>
    </section>
    <p><Link href="/admin/reports/payment-audit" className="inline-flex rounded border px-4 py-2 text-sm font-semibold text-blue-700">View NYC payment ledger and webhook audit</Link></p>
    <section className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="text-lg font-bold text-dark">Email and follow-up readiness</h2>
      <ul className="space-y-3">
        <li className="flex justify-between gap-4 border-b pb-3">
          <span>NYC outgoing email transport</span>
          <strong className={emailTransportConfigured ? 'text-blue-700' : 'text-amber-700'}>{emailTransportConfigured ? 'Configured — test delivery' : 'Not configured'}</strong>
        </li>
        <li className="flex justify-between gap-4 border-b pb-3">
          <span>NYC inbound reply-monitoring credentials</span>
          <strong className={replyMonitoringConfigured ? 'text-blue-700' : 'text-amber-700'}>{replyMonitoringConfigured ? 'Present — test inbox handling' : 'Incomplete'}</strong>
        </li>
        <li className="flex justify-between gap-4 border-b pb-3">
          <span>Staff payment notifications</span>
          <strong className={emailTransportConfigured ? 'text-blue-700' : 'text-amber-700'}>{emailTransportConfigured ? 'Implemented — verify first NYC payment notice' : 'Email sender not configured'}</strong>
        </li>
        <li className="flex justify-between gap-4 border-b pb-3">
          <span>Balance-reminder sending switch</span>
          <strong className={balanceRemindersEnabled ? 'text-blue-700' : 'text-amber-700'}>{balanceRemindersEnabled ? 'Enabled — verify send history' : 'Dry-run / not active'}</strong>
        </li>
        <li className="flex justify-between gap-4 border-b pb-3">
          <span>Incomplete-order follow-up workflow</span>
          <strong className="text-amber-700">Manual-only safety hold</strong>
        </li>
        <li className="flex justify-between gap-4">
          <span>Resend delivery-event webhook</span>
          <strong className={resendWebhookConfigured ? 'text-blue-700' : 'text-amber-700'}>{resendWebhookConfigured ? 'Signed endpoint configured — test events' : 'Awaiting NYC signing secret'}</strong>
        </li>
      </ul>
      <p className="text-sm text-gray-600">An email credential, a webhook secret or a scheduled workflow does not prove actual inbox delivery. Confirm a controlled recipient test and inbound reply before enabling automatic follow-ups.</p>
      <p className="text-sm">Public NYC email: <span className="font-semibold break-all">{NYC_EMAIL_ADDRESS}</span><br/>Staff notifications configured for: <span className="font-semibold break-all">{NYC_NOTIFICATION_EMAIL}</span></p>
      <Link href="/admin/settings/email-delivery" className="inline-flex rounded border px-4 py-2 text-sm font-semibold text-blue-700">Review NYC email setup</Link>
      <Link href="/admin/settings/email-delivery/audit" className="ml-3 inline-flex rounded border px-4 py-2 text-sm font-semibold text-blue-700">View NYC email delivery audit</Link>
    </section>
    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="text-lg font-bold text-dark">Final owner checks before selling NYC rentals</h2>
      <p className="text-sm text-gray-700">Confirm actual Riverdale-area inventory and crew capacity; signed rental agreement and cancel/refund terms; local delivery ZIP/time rules; a Stripe test-mode order with payment verification and refund; delivered customer receipt and staff notification; and an authenticated NYC calendar/order walkthrough.</p>
      <p className="text-sm text-amber-800">Catalog synchronization mirrors Syracuse item records; it is not physical proof that every item and setup crew is present in NYC.</p>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/rental-policies" className="text-blue-700 underline">Review public rental policies</Link>
        <Link href="/privacy-policy" className="text-blue-700 underline">Review privacy policy</Link>
        <Link href="/admin/settings/deposit-rules" className="text-blue-700 underline">Deposit rules</Link>
        <Link href="/admin/scheduling" className="text-blue-700 underline">Scheduling</Link>
      </div>
    </section>
  </div>
}
