'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ALL_REPORTS } from '@/lib/reportsConfig'

interface Column {
  key: string
  label: string
}

interface SummaryItem {
  label: string
  value: string | number
}

interface ReportData {
  title: string
  columns: Column[]
  rows: Array<Record<string, any>>
  summary: SummaryItem[]
}

const MONEY_PATTERN = /amount|total|paid|balance|revenue|price|cost|fee|payment|refund|deposit|due|subtotal|tax|owed|charge|collected/i
const COUNT_PATTERN = /\borders\b|\bcustomers\b|\bitems\b|\bbookings\b|\brentals\b|\breservations\b|\bunits\b|\bresults\b|\bproducts\b|\brecords\b|\bquantity\b|\bquantities\b|\bcount\b/i

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function looksLikeMoney(a: string, b: string) {
  const text = a + ' ' + b
  if (COUNT_PATTERN.test(text)) return false
  return MONEY_PATTERN.test(text)
}

function formatCurrency(value: number) {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCell(key: string, label: string, value: any) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') {
    if (looksLikeMoney(key, label)) return formatCurrency(value)
    return value.toLocaleString('en-US')
  }
  return String(value)
}

function formatSummaryValue(label: string, value: string | number) {
  if (typeof value === 'number') {
    if (looksLikeMoney(label, label)) return formatCurrency(value)
    return value.toLocaleString('en-US')
  }
  return String(value)
}

function csvEscape(value: string) {
  const needsQuotes = value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1
  const escaped = value.split('"').join('""')
  return needsQuotes ? '"' + escaped + '"' : escaped
}

function downloadCsv(data: ReportData, slug: string) {
  const header = data.columns.map((c) => csvEscape(c.label)).join(',')
  const lines = data.rows.map((row) =>
    data.columns
      .map((c) => {
        const raw = row[c.key]
        const text = raw === null || raw === undefined ? '' : String(raw)
        return csvEscape(text)
      })
      .join(',')
  )
  const csv = [header].concat(lines).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = slug + '-report.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ReportSlugPage() {
  const params = useParams<{ slug: string }>()
  const slug = (params ? params.slug : '') as string
  const [data, setData] = useState<ReportData | null>(null)
  const [notImplemented, setNotImplemented] = useState(false)
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const meta = ALL_REPORTS.find((r) => r.slug === slug)

  const load = () => {
    setLoading(true)
    const qs = start && end ? '?start=' + start + '&end=' + end : ''
    fetch('/api/admin/reports/' + slug + qs)
      .then((r) => r.json())
      .then((d) => {
        if (d.notImplemented) {
          setNotImplemented(true)
          setData(null)
        } else {
          setData(d)
          setNotImplemented(false)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (slug) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const pageTitle = data ? data.title : meta ? meta.title : titleFromSlug(slug || '')
  const rowCount = data ? data.rows.length : 0

  return (
    <div className="max-w-[1500px] mx-auto p-6 md:p-8 space-y-6">
      <div className="print:hidden">
        <Link href="/admin/reports" className="text-sm text-secondary hover:underline">&larr; Back to Reports</Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-dark">{pageTitle}</h1>
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
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <button onClick={load} className="bg-admin-green text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90">Apply</button>
          <button onClick={() => data && downloadCsv(data, slug)} disabled={!data || data.rows.length === 0} className="border border-gray-300 text-dark text-sm font-medium px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Export CSV</button>
          <button onClick={() => window.print()} className="border border-gray-300 text-dark text-sm font-medium px-4 py-2 rounded hover:bg-gray-50">Print</button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading report data...</p>}

      {!loading && notImplemented && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-lg font-semibold text-dark mb-2">Coming Soon</p>
          <p className="text-sm text-gray-500">This report is not built yet. Check back soon as we continue wiring up the full reports catalog.</p>
        </div>
      )}

      {!loading && data && (
        <>
          {data.summary && data.summary.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.summary.map((s) => (
                <div key={s.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-dark mt-1">{formatSummaryValue(s.label, s.value)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-500">{rowCount} {rowCount === 1 ? 'result' : 'results'}</p>
            </div>
            {rowCount === 0 ? (
              <p className="text-sm text-gray-500 p-6">No data found for this report.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-gray-50">
                      {data.columns.map((c) => (
                        <th key={c.key} className="py-2.5 px-4 font-semibold text-dark whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {data.columns.map((c) => (
                          <td key={c.key} className="py-2.5 px-4 whitespace-nowrap">{formatCell(c.key, c.label, row[c.key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
