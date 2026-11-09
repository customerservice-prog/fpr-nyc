import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NycInventoryVerificationManager from '@/components/admin/NycInventoryVerificationManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'NYC Physical Inventory Verification', robots: { index: false, follow: false } }

export default async function NycInventoryReadinessPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') {
    return <div role="alert" className="p-6">Administrator access required.</div>
  }

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-dark">NYC Physical Inventory Verification</h1>
        <p className="mt-1 text-sm text-gray-600">Riverdale / Lower Westchester · private NYC staff confirmations, separate from Syracuse catalog sync</p>
      </div>
      <div className="flex gap-4 text-sm">
        <Link className="font-semibold text-blue-700 underline" href="/admin/settings/nyc-launch-readiness">Launch readiness</Link>
        <Link className="font-semibold text-blue-700 underline" href="/admin/items">NYC catalog</Link>
      </div>
    </div>
    <NycInventoryVerificationManager />
  </main>
}
