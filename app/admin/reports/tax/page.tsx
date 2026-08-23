'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CityRow {
  city: string
  state: string
  count: number
  amountPaid: number
  paidNontaxable: number
  paidTaxable: number
  paidTax: number
}

interface Totals {
  count: number
  amountPaid: number
  paidNontaxable: number
  paidTaxable: number
  paidTax: number
}

function money(n: number) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default function TaxReportPage() {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2018 }, (_, i) => currentYear - i)

  const [year, setYear] = useState(currentYear)
  const [range, setRange] = useState<'month' | 'quarter' | 'year'>('month')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1)
  const [cities, setCities] = useState<CityRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('year', String(year))
    if (range === 'month') params.set('month', String(month))
    if (range === 'quarter') params.set('quarter', String(quarter))
    fetch(`/api/admin/reports/tax?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setCities(d.cities || [])
        setTotals(d.totals || null)
      })
      .finally(() => setLoading(false))
  }, [year, range, month, quarter])

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-dark">Tax Report</h1>
        <Link href="/admin/reports" className="text-sm text-secondary hover:underline">
          &larr; Back to Reports
        </Link>
      </div>

      <div className="bg-white rounded shadow p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="border rounded px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">View By</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as 'month' | 'quarter' | 'year')}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Full Year</option>
          </select>
        </div>

        {range === 'month' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="border rounded px-3 py-2 text-sm"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        {range === 'quarter' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quarter</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(parseInt(e.target.value, 10))}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value={1}>Q1 (Jan - Mar)</option>
              <option value={2}>Q2 (Apr - Jun)</option>
              <option value={3}>Q3 (Jul - Sep)</option>
              <option value={4}>Q4 (Oct - Dec)</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded shadow p-4">
        {loading && <p className="text-gray-500 text-sm">Loading tax data...</p>}

        {!loading && cities.length === 0 && (
          <p className="text-gray-500 text-sm">No payments found for this period.</p>
        )}

        {!loading && cities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-admin-green text-white">
                <tr>
                  <th className="px-3 py-2 text-left">City</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="px-3 py-2 text-right"># Payments</th>
                  <th className="px-3 py-2 text-right">Amount Paid</th>
                  <th className="px-3 py-2 text-right">Nontaxable</th>
                  <th className="px-3 py-2 text-right">Taxable</th>
                  <th className="px-3 py-2 text-right">Tax Collected</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.city + c.state} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{c.city}</td>
                    <td className="px-3 py-2">{c.state}</td>
                    <td className="px-3 py-2 text-right">{c.count}</td>
                    <td className="px-3 py-2 text-right">{money(c.amountPaid)}</td>
                    <td className="px-3 py-2 text-right">{money(c.paidNontaxable)}</td>
                    <td className="px-3 py-2 text-right">{money(c.paidTaxable)}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(c.paidTax)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="px-3 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right">{totals.count}</td>
                    <td className="px-3 py-2 text-right">{money(totals.amountPaid)}</td>
                    <td className="px-3 py-2 text-right">{money(totals.paidNontaxable)}</td>
                    <td className="px-3 py-2 text-right">{money(totals.paidTaxable)}</td>
                    <td className="px-3 py-2 text-right">{money(totals.paidTax)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Nontaxable/taxable/tax amounts are prorated per payment based on each order&apos;s recorded tax rate and
        taxable subtotal. City is based on the event address on file for each order.
      </p>
    </div>
  )
}
