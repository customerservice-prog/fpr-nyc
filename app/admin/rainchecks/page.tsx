'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface RaincheckRow {
  id: string
  amount: number
  reason?: string
  issuedAt: string
  expiresAt?: string
  redeemedAt?: string
  redeemedOrderId?: string
  customerId: string
  customer: { firstName: string; lastName: string; email: string }
}

export default function RainchecksPage() {
  const [rainchecks, setRainchecks] = useState<RaincheckRow[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/rainchecks')
      .then((r) => r.json())
      .then((d) => setRainchecks(d.rainchecks || []))
  }, [])

  if (!rainchecks) return <div className="p-4">Loading...</div>

  const statusOf = (rc: RaincheckRow) => {
    if (rc.redeemedAt) return 'Redeemed'
    if (rc.expiresAt && new Date(rc.expiresAt) < new Date()) return 'Expired'
    return 'Active'
  }

  const totalActive = rainchecks.filter((rc) => statusOf(rc) === 'Active').reduce((sum, rc) => sum + rc.amount, 0)

  return (
    <div className="p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Rainchecks</h1>
      <p className="text-body mb-4">Outstanding customer credits issued in place of a refund, redeemable toward a future order balance.</p>
      <div className="bg-white rounded shadow p-4 mb-4 inline-block">
        <div className="text-sm text-body">Total Active Credit Outstanding</div>
        <div className="text-2xl font-bold">{formatCurrency(totalActive)}</div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Issued</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rainchecks.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-body" colSpan={6}>No rainchecks have been issued yet.</td>
              </tr>
            )}
            {rainchecks.map((rc) => {
              const status = statusOf(rc)
              return (
                <tr key={rc.id} className="border-b">
                  <td className="px-4 py-2">
                    <Link href={`/admin/customers/${rc.customerId}`} className="text-secondary hover:underline">
                      {rc.customer.firstName} {rc.customer.lastName}
                    </Link>
                    <div className="text-xs text-body">{rc.customer.email}</div>
                  </td>
                  <td className="px-4 py-2 font-medium">{formatCurrency(rc.amount)}</td>
                  <td className="px-4 py-2">{rc.reason || '-'}</td>
                  <td className="px-4 py-2">{formatDate(rc.issuedAt)}</td>
                  <td className="px-4 py-2">{rc.expiresAt ? formatDate(rc.expiresAt) : '-'}</td>
                  <td className="px-4 py-2">
                    <span className={
                      status === 'Active' ? 'text-green-600 font-medium' :
                      status === 'Redeemed' ? 'text-body font-medium' :
                      'text-red-600 font-medium'
                    }>{status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
