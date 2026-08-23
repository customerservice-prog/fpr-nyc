'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function ReportSlugPage() {
  const params = useParams<{ slug: string }>()
  const slug = (params ? params.slug : '') as string
  const [data, setData] = useState<ReportData | null>(null)
  const [notImplemented, setNotImplemented] = useState(false)
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

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

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/reports" className="text-sm text-secondary hover:underline">&larr; Back to Reports</Link>
          <h1 className="text-xl font-bold text-dark mt-1">{data ? data.title : titleFromSlug(slug || '')}</h1>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500">Start</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">End</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <button onClick={load} className="bg-admin-green text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90">Apply</button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading report data...</p>}

      {!loading && notImplemented && (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-lg font-semibold text-dark mb-2">Coming Soon</p>
          <p className="text-sm text-gray-500">This report is not built yet. Check back soon as we continue wiring up the full reports catalog.</p>
        </div>
      )}

      {!loading && data && (
        <>
          {data.summary && data.summary.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.summary.map((s) => (
                <div key={s.label} className="bg-white rounded shadow p-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-dark mt-1">{String(s.value)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded shadow p-6">
            {data.rows.length === 0 ? (
              <p className="text-sm text-gray-500">No data found for this report.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      {data.columns.map((c) => (
                        <th key={c.key} className="py-2 pr-4">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {data.columns.map((c) => (
                          <td key={c.key} className="py-2 pr-4">{String(row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '')}</td>
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
