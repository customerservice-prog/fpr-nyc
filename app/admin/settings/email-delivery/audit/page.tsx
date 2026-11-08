import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'NYC Email Delivery Audit', robots: { index: false, follow: false } }

export default async function NycEmailAuditPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') return <div className="p-6">Administrator access required.</div>

  const webhookConfigured = Boolean(process.env.NYC_RESEND_WEBHOOK_SECRET)
  const mailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  type Row = { status: string; acceptedAt: Date; lastEvent: string | null; lastEventAt: Date | null }
  let recent: Row[] = []
  let statuses: Array<{ status: string; _count: { _all: number } }> = []
  let unavailable = false
  try {
    ;[recent, statuses] = await Promise.all([
      prisma.nycOutboundEmail.findMany({
        orderBy: { acceptedAt: 'desc' }, take: 30,
        select: { status: true, acceptedAt: true, lastEvent: true, lastEventAt: true },
      }),
      prisma.nycOutboundEmail.groupBy({
        by: ['status'], where: { acceptedAt: { gte: fromDate } },
        _count: { _all: true },
      }),
    ])
  } catch {
    unavailable = true
  }
  const total = statuses.reduce((sum, entry) => sum + entry._count._all, 0)

  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
    <Link href="/admin/settings/email-delivery" className="text-blue-700 underline">Back to NYC email delivery</Link>
    <h1 className="text-2xl font-bold text-dark">NYC transactional email delivery audit</h1>
    <p className="text-sm text-gray-700">Only Resend messages sent by the NYC application are tracked. This dashboard stores no customer addresses, message subjects or email bodies, and does not send or retry messages.</p>

    <section className="rounded-xl border bg-white p-5 space-y-2">
      <h2 className="font-bold">Integration status</h2>
      <p>NYC Resend sender: <strong>{mailConfigured ? 'Configured (send not proven)' : 'Not configured'}</strong></p>
      <p>NYC signed delivery webhook: <strong>{webhookConfigured ? 'Verification secret configured' : 'Not configured'}</strong></p>
      <p className="text-sm text-gray-600">A verified sender domain is not proof that a message reached a customer. "Accepted" means the provider returned a message ID; "delivered" means the signed provider callback confirmed delivery.</p>
    </section>

    {unavailable ? <p role="alert" className="rounded border border-amber-300 p-4 text-amber-900">The NYC email audit database is unavailable. Delivery history cannot be verified.</p> : <>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-bold">Tracked sends over the last 30 days: {total}</h2>
        {statuses.length === 0 ? <p className="mt-2 text-sm text-gray-600">No tracked NYC transactional sends in this period. Do not infer delivery success from configured credentials.</p> :
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{statuses.map(s => <li key={s.status} className="rounded border p-3"><strong>{s._count._all}</strong> {s.status}</li>)}</ul>}
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-bold">Recent NYC sends (up to 30)</h2>
        {recent.length === 0 ? <p className="text-sm text-gray-600">No accepted NYC Resend messages have been recorded yet.</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Accepted (UTC)</th><th className="p-2">Current status</th><th className="p-2">Last signed event</th></tr></thead>
            <tbody>{recent.map((row, index) => <tr key={index} className="border-b"><td className="p-2">{row.acceptedAt.toISOString().slice(0, 19).replace('T', ' ')}</td><td className="p-2 font-semibold">{row.status}</td><td className="p-2">{row.lastEvent || 'Awaiting provider callback'}</td></tr>)}</tbody>
          </table></div>}
      </section>
    </>}
    <p className="text-xs text-gray-500">SMTP fallback messages do not have Resend event IDs and are not included here. Provider callbacks may be delayed; this page is not a real-time inbox or a guarantee of customer receipt.</p>
  </div>
}
