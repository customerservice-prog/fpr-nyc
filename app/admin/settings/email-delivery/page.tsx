import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { SC_EMAIL_ADDRESS, SC_EMAIL_TAG } from '@/lib/scEmail'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Riverdale Email Delivery', robots: { index: false, follow: false } }
export default async function EmailDeliveryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') return <div className="p-6">Administrator access required.</div>
  // Only report booleans. Never render, return or log credential values.
  const configured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
    <Link href="/admin/settings" className="text-blue-700 underline">Back to settings</Link>
    <h1 className="text-2xl font-bold">Riverdale email delivery</h1>
    <section className={`rounded-xl border p-5 ${configured ? 'border-blue-200 bg-blue-50' : 'border-amber-300 bg-amber-50'}`}>
      <h2 className="text-lg font-bold">{configured ? 'Sender credentials are present' : 'Automatic email is not configured'}</h2>
      <p className="mt-2">{configured ? 'Credential presence does not prove successful delivery. Confirm a delivered test message before relying on notifications.' : 'Contact inquiries and applications are saved, but website-to-inbox notifications cannot be sent until the authorized sender is configured.'}</p>
      <p className="mt-2">This screen does not send messages or expose stored passwords.</p>
    </section>
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold">One inbox, unmistakable location</h2>
      <p className="mt-2 break-all">Shared inbox: {SC_EMAIL_ADDRESS}</p>
      <p className="mt-2">Subject example: <strong>{SC_EMAIL_TAG} Riverdale rental inquiry</strong></p>
      <p className="mt-2">Sender label: Friendly Party Rental - New York. Messages include a SOUTH CAROLINA / GREENVILLE banner. Replies to contact notifications go to the customer.</p>
    </section>
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold">Secure sender setup</h2>
      <p className="mt-2">Enter EMAIL_USER and EMAIL_PASS in this Riverdale service’s private Railway variables using credentials approved for the sender. Do not put passwords in chat, source code, screenshots or support tickets. New York’s service must remain unchanged.</p>
      <a className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-3 font-medium text-white" href="https://railway.com/project/2d289439-6196-4fa8-96c8-1623ee05d1ad/service/5b568990-7c9e-4767-9bcd-57212d543bd6?environmentId=6c998fda-f9f6-47ab-a983-d525fd964187" target="_blank" rel="noopener noreferrer">Open Riverdale Railway service</a>
    </section>
    <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Open content decisions</h2><p className="mt-2">Legacy wedding-package rows and matching inventory descriptions contain conflicting inclusions. Prices and inclusions have not been silently changed. Review and approve the offer in both records before advertising it as finalized.</p><div className="mt-3 flex flex-wrap gap-4"><Link href="/admin/wedding-packages" className="text-blue-700 underline">Review wedding packages</Link><Link href="/admin/items" className="text-blue-700 underline">Review matching rental items and exact product photos</Link></div></section>
  </div>
}
