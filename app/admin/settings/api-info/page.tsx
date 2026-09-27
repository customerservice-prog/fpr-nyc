'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

function randomKey() {
  let out = ''
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 24; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return 'fpr_live_' + out
}

export default function ApiInfoPage() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/system-settings?category=api')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.settings || []).find((s: any) => s.key === 'apiKey')
        if (found) setApiKey(found.value)
        setLoading(false)
      })
  }, [])

  const regenerate = async () => {
    const newKey = randomKey()
    const res = await fetch('/api/admin/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'api', key: 'apiKey', value: newKey }),
    })
    if (res.ok) {
      setApiKey(newKey)
      toast.success('API key regenerated')
    } else {
      toast.error('Failed to regenerate key')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">API Info</h1>
      <p className="text-sm text-gray-600 mb-4">
        This key can be used to authenticate requests to this system's own API from external tools you control.
      </p>
      <label className="block text-xs text-gray-500 mb-1">API Base URL</label>
      <input className="border rounded px-3 py-2 text-sm w-full mb-4 bg-gray-100" readOnly value="https://www.fpr-nyc-production.up.railway.app/api" />
      <label className="block text-xs text-gray-500 mb-1">API Key</label>
      <input className="border rounded px-3 py-2 text-sm w-full mb-4 bg-gray-100" readOnly value={apiKey} />
      <button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={regenerate}>
        Regenerate Key
      </button>
    </div>
  )
}
