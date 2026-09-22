import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

async function markReviewed(form: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') throw new Error('Unauthorized')
  const id = String(form.get('id') || '')
  if (!id.startsWith('planning_')) throw new Error('Invalid inquiry')
  await prisma.contactMessage.update({ where: { id }, data: { isRead: form.get('reviewed') === 'true' } })
  revalidatePath('/admin/planning-inquiries')
}
export default async function PlanningInquiries({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string }> }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') redirect('/admin')
  const params = await searchParams
  const filter = ['new','reviewed'].includes(params.filter || '') ? params.filter! : 'all'
  const requestedPage = Number(params.page || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1
  const where = { id: { startsWith: 'planning_' }, ...(filter === 'all' ? {} : { isRead: filter === 'reviewed' }) }
  const [inquiries, count, unread] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 25, skip: (page - 1) * 25 }),
    prisma.contactMessage.count({ where }), prisma.contactMessage.count({ where: { id: { startsWith: 'planning_' }, isRead: false } }),
  ])
  return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6"><div><Link href="/admin" className="text-sm text-blue-700 underline">← Admin</Link><h1 className="mt-4 text-3xl font-bold">Planning inquiries</h1><p className="mt-2 text-sm text-slate-600">{unread} new inquiries. Saved form submissions appear here even when office email delivery is unavailable. Marking reviewed does not contact the customer or reserve an event.</p></div><nav className="flex gap-2" aria-label="Inquiry filters">{['all','new','reviewed'].map(f => <Link key={f} href={'?filter='+f} aria-current={filter === f ? 'page' : undefined} className={'rounded-lg border px-4 py-2 text-sm capitalize ' + (filter === f ? 'bg-blue-900 text-white' : 'bg-white')}>{f}</Link>)}</nav>
    {!inquiries.length && <p className="rounded-xl border bg-white p-8 text-slate-600">No inquiries in this view.</p>}
    {inquiries.map(inquiry => <article key={inquiry.id} className="rounded-2xl border bg-white p-5 shadow-sm"><header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{inquiry.name}</h2><p className="mt-1 text-xs text-slate-500">{inquiry.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' })} Eastern · {inquiry.isRead ? 'Reviewed' : 'New'}</p></div><form action={markReviewed}><input type="hidden" name="id" value={inquiry.id}/><input type="hidden" name="reviewed" value={String(!inquiry.isRead)}/><button className="rounded-lg border px-4 py-2 text-sm font-semibold">{inquiry.isRead ? 'Mark new' : 'Mark reviewed'}</button></form></header><div className="my-4 flex flex-wrap gap-4 text-sm"><a className="break-all text-blue-800 underline" href={'mailto:'+inquiry.email}>{inquiry.email}</a><a className="text-blue-800 underline" href={'tel:'+inquiry.phone?.replace(/[^+0-9]/g,'')}>{inquiry.phone}</a><span>Date: {inquiry.eventDate?.toISOString().slice(0,10) || 'Undecided'}</span></div><p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7">{inquiry.message}</p></article>)}
    <div className="flex items-center justify-between text-sm">{page > 1 ? <Link className="underline" href={`?filter=${filter}&page=${page-1}`}>← Previous</Link> : <span/>}<span>Page {page} · {count} inquiries</span>{page * 25 < count ? <Link className="underline" href={`?filter=${filter}&page=${page+1}`}>Next →</Link> : <span/>}</div>
  </div>
}
