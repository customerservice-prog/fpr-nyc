'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function MiscSettingsPage() {
const [requireSignature, setRequireSignature] = useState(false)
const [showPrices, setShowPrices] = useState(true)
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/system-settings?category=misc')
.then((r) => r.json())
.then((d) => {
const settings = d.settings || []
const sig = settings.find((s: any) => s.key === 'requireSignature')
const prices = settings.find((s: any) => s.key === 'showPricesToCustomers')
if (sig) setRequireSignature(sig.value === 'true')
if (prices) setShowPrices(prices.value === 'true')
setLoading(false)
})
}, [])

const save = async () => {
const res = await fetch('/api/admin/system-settings', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
items: [
{ category: 'misc', key: 'requireSignature', value: String(requireSignature) },
{ category: 'misc', key: 'showPricesToCustomers', value: String(showPrices) },
],
}),
})
if (res.ok) {
toast.success('Settings saved')
} else {
toast.error('Failed to save')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Misc Settings</h1>
<p className="text-sm text-gray-600 mb-4">
Miscellaneous options that affect orders and the customer-facing experience.
</p>
<label className="flex items-center gap-2 mb-4 text-sm">
<input type="checkbox" checked={requireSignature} onChange={(e) => setRequireSignature(e.target.checked)} />
Require signature on delivery
</label>
<label className="flex items-center gap-2 mb-4 text-sm">
<input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} />
Show prices to customers
</label>
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={save}>
Save
</button>
</div>
)
}
