'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const PROVIDER = 'textmessaging'

export default function TextMessagingPage() {
const [apiKey, setApiKey] = useState('')
const [apiSecret, setApiSecret] = useState('')
const [accountId, setAccountId] = useState('')
const [isEnabled, setIsEnabled] = useState(false)
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/integrations')
.then((r) => r.json())
.then((d) => {
const found = (d.integrations || []).find((i: any) => i.provider === PROVIDER)
if (found) {
setApiKey(found.apiKey || '')
setApiSecret(found.apiSecret || '')
setAccountId(found.accountId || '')
setIsEnabled(found.isEnabled)
}
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/integrations', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ provider: PROVIDER, apiKey, apiSecret, accountId, isEnabled }),
})
if (res.ok) {
toast.success('Integration settings saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-2">Text Messaging</h1>
<span className={`inline-block text-xs px-2 py-1 rounded mb-4 ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
{isEnabled ? 'Connected' : 'Not Connected'}
</span>
<p className="text-sm text-gray-600 mb-4">
Enter your text messaging provider credentials (such as Twilio) to send automatic text messages and reminders. Once connected, sent messages will appear under Text Logs.
</p>
<label className="block text-xs text-gray-500 mb-1">Account SID</label>
<input className="border rounded px-3 py-2 text-sm w-full mb-4" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
<label className="block text-xs text-gray-500 mb-1">Auth Token</label>
<input type="password" className="border rounded px-3 py-2 text-sm w-full mb-4" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
<label className="block text-xs text-gray-500 mb-1">Sending Phone Number</label>
<input className="border rounded px-3 py-2 text-sm w-full mb-4" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
<label className="flex items-center gap-2 mb-4 text-sm">
<input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
Enable this integration
</label>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
