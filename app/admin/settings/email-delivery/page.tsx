import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { NYC_EMAIL_ADDRESS, NYC_EMAIL_TAG } from '@/lib/nycEmail'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Riverdale Email Delivery', robots: { index: false, follow: false } }
export default async function EmailDeliveryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') return <div className="p-6">Administrator access required.</div>
  // Only report booleans. Never render, return or log credential values.
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
  const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  const configured = resendConfigured || smtpConfigured
  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
    <Link href="/admin/settings" className="text-blue-700 underline">Back to settings</Link>
    <h1 className="text-2xl font-bold">Riverdale email delivery</h1>
    <section className={`rounded-xl border p-5 ${configured ? 'border-blue-200 bg-blue-50' : 'border-amber-300 bg-amber-50'}`}>
      <h2 className="text-lg font-bold">{configured ? 'Outbound sender is configured' : 'Automatic email is not configured'}</h2>
      <p className="mt-2">{configured ? 'Credential presence does not prove successful delivery. Confirm a delivered test message before relying on notifications.' : 'Contact inquiries and applications are saved, but website-to-inbox notifications cannot be sent until the authorized sender is configured.'}</p>
      <p className="mt-2">Active transport: {resendConfigured ? 'Resend transactional email' : smtpConfigured ? 'SMTP' : 'none'}. This screen does not send messages or expose stored credentials.</p>
    </section>
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold">One inbox, unmistakable location</h2>
      <p className="mt-2 break-all">Shared inbox: {NYC_EMAIL_ADDRESS}</p>
      <p className="mt-2">Subject example: <strong>{NYC_EMAIL_TAG} Riverdale rental inquiry</strong></p>
      <p className="mt-2">Sender label: Friendly Party Rental NYC. Messages include a NYC / DOWNSTATE NEW YORK banner. Replies to contact notifications go to the customer.</p>
    </section>
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold">Secure sender setup</h2>
      <p className="mt-2">Preferred outbound setup uses RESEND_API_KEY and RESEND_FROM after the NYC sending domain is verified. Gmail SMTP remains a fallback. EMAIL_USER and EMAIL_PASS are still used by IMAP reply monitoring. Never place credentials in source code, screenshots or support tickets.</p>
      <a className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-3 font-medium text-white" href="https://railway.com/project/58509c3e-6113-4eb3-9f57-2d6f9cf64002/service/296831e0-0015-4e5e-b221-c59176ebb66d/variables?environmentId=cb808a6d-bc11-4263-890c-018cd2d9b41a" target="_blank" rel="noopener noreferrer">Open NYC Railway variables</a>
    </section>
    <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Open content decisions</h2><p className="mt-2">Legacy wedding-package rows and matching inventory descriptions contain conflicting inclusions. Prices and inclusions have not been silently changed. Review and approve the offer in both records before advertising it as finalized.</p><div className="mt-3 flex flex-wrap gap-4"><Link href="/admin/wedding-packages" className="text-blue-700 underline">Review wedding packages</Link><Link href="/admin/items" className="text-blue-700 underline">Review matching rental items and exact product photos</Link></div></section>
  </div>
}
