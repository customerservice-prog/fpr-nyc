'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ALL_REPORTS } from '@/lib/reportsConfig'

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

function csvEscape(value: string) {
  const needsQuotes = value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1
  const escaped = value.split('"').join('""')
  return needsQuotes ? '"' + escaped + '"' : escaped
}

function downloadCsv(cities: CityRow[], totals: Totals | null, year: number) {
  const header = ['City', 'State', '# Payments', 'Amount Paid', 'Nontaxable', 'Taxable', 'Tax Collected'].map(csvEscape).join(',')
  const lines = cities.map((c) =>
    [c.city, c.state, String(c.count), c.amountPaid.toFixed(2), c.paidNontaxable.toFixed(2), c.paidTaxable.toFixed(2), c.paidTax.toFixed(2)]
      .map(csvEscape)
      .join(',')
  )
  if (totals) {
    lines.push(
      ['Total', '', String(totals.count), totals.amountPaid.toFixed(2), totals.paidNontaxable.toFixed(2), totals.paidTaxable.toFixed(2), totals.paidTax.toFixed(2)]
        .map(csvEscape)
        .join(',')
    )
  }
  const csv = [header].concat(lines).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'tax-report-' + year + '.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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

  const meta = ALL_REPORTS.find((r) => r.slug === 'tax')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('year', String(year))
    if (range === 'month') params.set('month', String(month))
    if (range === 'quarter') params.set('quarter', String(quarter))
    fetch('/api/admin/reports/tax?' + params.toString())
      .then((r) => r.json())
      .then((d) => {
        setCities(d.cities || [])
        setTotals(d.totals || null)
      })
      .finally(() => setLoading(false))
  }, [year, range, month, quarter])

  const rowCount = cities.length

  return (
    <div className="max-w-[1500px] mx-auto p-6 md:p-8 space-y-6">
      <div className="print:hidden">
        <Link href="/admin/reports" className="text-sm text-secondary hover:underline">&larr; Back to Reports</Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-dark">Tax Report</h1>
          {meta && meta.description && (
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">{meta.description}</p>
          )}
          {meta && meta.category && (
            <span className="inline-block text-xs font-medium text-admin-green bg-green-50 px-2 py-0.5 rounded mt-2">
              {meta.category}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="border rounded px-2 py-1.5 text-sm"
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
              className="border rounded px-2 py-1.5 text-sm"
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
                className="border rounded px-2 py-1.5 text-sm"
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
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value={1}>Q1 (Jan - Mar)</option>
                <option value={2}>Q2 (Apr - Jun)</option>
                <option value={3}>Q3 (Jul - Sep)</option>
                <option value={4}>Q4 (Oct - Dec)</option>
              </select>
            </div>
          )}

          <button
            onClick={() => downloadCsv(cities, totals, year)}
            disabled={rowCount === 0}
            className="border border-gray-300 text-dark text-sm font-medium px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button onClick={() => window.print()} className="border border-gray-300 text-dark text-sm font-medium px-4 py-2 rounded hover:bg-gray-50">
            Print
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading tax data...</p>}

      {!loading && totals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Payments</p>
            <p className="text-2xl font-bold text-dark mt-1">{totals.count.toLocaleString('en-US')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Amount Paid</p>
            <p className="text-2xl font-bold text-dark mt-1">{money(totals.amountPaid)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Nontaxable</p>
            <p className="text-2xl font-bold text-dark mt-1">{money(totals.paidNontaxable)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Taxable</p>
            <p className="text-2xl font-bold text-dark mt-1">{money(totals.paidTaxable)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Tax Collected</p>
            <p className="text-2xl font-bold text-dark mt-1">{money(totals.paidTax)}</p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">{rowCount} {rowCount === 1 ? 'city' : 'cities'}</p>
          </div>
          {rowCount === 0 ? (
            <p className="text-sm text-gray-500 p-6">No payments found for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap">City</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap">State</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap text-right"># Payments</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap text-right">Nontaxable</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap text-right">Taxable</th>
                    <th className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap text-right">Tax Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.city + c.state} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-4 whitespace-nowrap">{c.city}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{c.state}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">{c.count}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">{money(c.amountPaid)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">{money(c.paidNontaxable)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">{money(c.paidTaxable)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-medium">{money(c.paidTax)}</td>
                    </tr>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="py-2.5 px-4" colSpan={2}>
                        Total
                      </td>
                      <td className="py-2.5 px-4 text-right">{totals.count}</td>
                      <td className="py-2.5 px-4 text-right">{money(totals.amountPaid)}</td>
                      <td className="py-2.5 px-4 text-right">{money(totals.paidNontaxable)}</td>
                      <td className="py-2.5 px-4 text-right">{money(totals.paidTaxable)}</td>
                      <td className="py-2.5 px-4 text-right">{money(totals.paidTax)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Nontaxable/taxable/tax amounts are prorated per payment based on each order&apos;s recorded tax rate and
        taxable subtotal. City is based on the event address on file for each order. Only payments recorded during
        the selected period are included.
      </p>
    </div>
  )
}
