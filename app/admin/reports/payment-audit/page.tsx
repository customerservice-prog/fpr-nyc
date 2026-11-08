import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'NYC Payment Audit', robots: { index: false, follow: false } }

const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const dateUtc = (value: Date | null) => value ? value.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—'

type PaymentRow = {
  id: string
  amount: number
  method: string
  status: string
  createdAt: Date
  stripePaymentId: string | null
  orderId: string
  order: { id: string; orderNumber: string; status: string }
}
type WebhookRow = {
  id: string
  type: string
  status: string
  attempts: number
  receivedAt: Date
  orderId: string | null
}

export default async function NycPaymentAuditPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') {
    return <div className="p-6" role="alert">Administrator access required.</div>
  }

  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let payments: PaymentRow[] = []
  let webhookIssues: WebhookRow[] = []
  let grossRecorded = 0
  let refunded = 0
  let successfulPayments = 0
  let refundCount = 0
  let webhookIssueCount = 0
  let pendingPaymentCount = 0
  let error = ''

  try {
    const [recent, collected, refunds, issues, issueCount, pendingCount] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: periodStart } },
        orderBy: { createdAt: 'desc' }, take: 75,
        select: {
          id: true, amount: true, method: true, status: true,
          createdAt: true, stripePaymentId: true, orderId: true,
          order: { select: { id: true, orderNumber: true, status: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: periodStart }, status: 'succeeded', amount: { gt: 0 } },
        _sum: { amount: true }, _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: periodStart }, status: 'succeeded', amount: { lt: 0 } },
        _sum: { amount: true }, _count: { _all: true },
      }),
      prisma.stripeWebhookEvent.findMany({
        where: {
          receivedAt: { gte: periodStart },
          status: { in: ['failed', 'rejected', 'processing'] },
        },
        orderBy: { receivedAt: 'desc' }, take: 40,
        select: { id: true, type: true, status: true, attempts: true, receivedAt: true, orderId: true },
      }),
      prisma.stripeWebhookEvent.count({
        where: { receivedAt: { gte: periodStart }, status: { in: ['failed', 'rejected', 'processing'] } },
      }),
      prisma.payment.count({
        where: { createdAt: { gte: periodStart }, status: { in: ['pending', 'processing'] } },
      }),
    ])
    payments = recent
    webhookIssues = issues
    grossRecorded = Number(collected._sum.amount || 0)
    refunded = Math.abs(Number(refunds._sum.amount || 0))
    successfulPayments = collected._count._all
    refundCount = refunds._count._all
    webhookIssueCount = issueCount
    pendingPaymentCount = pendingCount
  } catch {
    error = 'Could not read the NYC payment ledger. No totals are displayed because the audit data could not be verified.'
  }

  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-dark">NYC Payment Audit</h1>
        <p className="mt-1 text-sm text-gray-600">Read-only · Friendly Party Rental NYC / Riverdale · last 30 days</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/settings/nyc-launch-readiness" className="font-semibold text-blue-700 underline">Launch readiness</Link>
        <Link href="/admin/orders" className="font-semibold text-blue-700 underline">NYC orders</Link>
      </div>
    </div>
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      These are amounts in NYC's local payment ledger, not proof that Stripe settled or deposited the money.
      The 30-day window uses each ledger entry's creation date, not the original transaction date at the bank.
      Confirm transfers, disputes and payouts separately in the NYC Stripe account.
    </p>

    {error ? <p className="rounded-lg border border-red-300 p-4 text-red-800" role="alert">{error}</p> : <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="NYC payment summary">
        {[
          ['Recorded positive payments', money(grossRecorded), successfulPayments + ' succeeded'],
          ['Recorded successful refunds', money(refunded), refundCount + ' entries'],
          ['Net recorded', money(grossRecorded - refunded), 'Payments less recorded refunds'],
          ['Needs review', String(webhookIssueCount + pendingPaymentCount), webhookIssueCount + ' webhook records · ' + pendingPaymentCount + ' pending payments'],
        ].map(([label, value, detail]) => <div className="rounded-xl border bg-white p-4" key={label}>
          <p className="text-xs font-semibold text-gray-600">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
          <p className="mt-1 text-xs text-gray-600">{detail}</p>
        </div>)}
      </section>

      <section className="rounded-xl border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-dark">Stripe webhook records needing review</h2>
        <p className="mb-3 text-xs text-gray-600">Failed, rejected or still-processing event records. Rejected can mean an event was safely blocked; it does not necessarily mean money was lost. No retries are initiated by this page.</p>
        {webhookIssues.length === 0 ? <p className="text-sm text-gray-600">No currently flagged events received in the last 30 days.</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Received</th><th className="p-2">Event</th><th className="p-2">Status</th><th className="p-2">Attempts</th><th className="p-2">Order</th></tr></thead>
            <tbody>{webhookIssues.map(row => <tr key={row.id} className="border-b">
              <td className="whitespace-nowrap p-2">{dateUtc(row.receivedAt)}</td>
              <td className="break-all p-2">{row.type}</td>
              <td className="p-2 font-semibold text-amber-800">{row.status}</td>
              <td className="p-2">{row.attempts}</td>
              <td className="p-2">{row.orderId ? <Link className="text-blue-700 underline" href={'/admin/orders/' + encodeURIComponent(row.orderId)}>Open order</Link> : 'Unlinked'}</td>
            </tr>)}</tbody>
          </table></div>}
        {webhookIssueCount > webhookIssues.length && <p className="mt-2 text-xs text-gray-600">Showing the newest {webhookIssues.length} of {webhookIssueCount} flagged webhook records.</p>}
      </section>

      <section className="rounded-xl border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-dark">Recent NYC payment ledger entries</h2>
        <p className="mb-3 text-xs text-gray-600">Up to 75 newest entries. This is not a payout or bank-deposit report, and pending entries are not counted as collected.</p>
        {payments.length === 0 ? <p className="text-sm text-gray-600">No local payment ledger entries in this period.</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Recorded</th><th className="p-2">Order</th><th className="p-2">Method</th><th className="p-2">Status</th><th className="p-2">Amount</th><th className="p-2">Source</th></tr></thead>
            <tbody>{payments.map(row => <tr key={row.id} className="border-b">
              <td className="whitespace-nowrap p-2">{dateUtc(row.createdAt)}</td>
              <td className="p-2"><Link className="text-blue-700 underline" href={'/admin/orders/' + encodeURIComponent(row.order.id)}>{row.order.orderNumber}</Link></td>
              <td className="p-2">{row.method}</td>
              <td className="p-2">{row.status}</td>
              <td className="whitespace-nowrap p-2 font-semibold">{money(row.amount)}</td>
              <td className="p-2">{row.stripePaymentId ? 'Stripe reference' : 'No Stripe reference'}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>}
    <p className="text-xs text-gray-600">NYC-only administrator report. This page does not charge cards, issue refunds, resend webhooks, modify order balances or send customer messages.</p>
  </main>
}
