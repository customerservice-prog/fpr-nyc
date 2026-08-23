'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function AutoChargePage() {
const [loading, setLoading] = useState(true)
const [enabled, setEnabled] = useState(false)
const [daysBeforeEvent, setDaysBeforeEvent] = useState('3')
const [chargeRemainingBalance, setChargeRemainingBalance] = useState(true)
const [notifyCustomer, setNotifyCustomer] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/auto-charge')
const data = await res.json()
if (data.settings) {
setEnabled(data.settings.enabled)
setDaysBeforeEvent(String(data.settings.daysBeforeEvent))
setChargeRemainingBalance(data.settings.chargeRemainingBalance)
setNotifyCustomer(data.settings.notifyCustomer)
}
setLoading(false)
}

useEffect(() => {
load()
}, [])

const save = async () => {
const res = await fetch('/api/admin/auto-charge', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ enabled, daysBeforeEvent, chargeRemainingBalance, notifyCustomer }),
})
if (res.ok) {
toast.success('Auto charge settings saved')
} else {
toast.error('Failed to save settings')
}
}

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-2xl">
<h1 className="text-xl font-bold text-dark mb-2">Auto Charge</h1>
<p className="text-sm text-gray-500 mb-4">
Automatically charge the customer&apos;s card on file before their event, using your existing Stripe checkout integration.
</p>
<div className="bg-white border rounded p-4 space-y-4">
<label className="flex items-center gap-2 text-sm">
<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
Enable auto charge
</label>
<div>
<label className="block text-sm mb-1">Days before event to charge</label>
<input
className="border rounded px-3 py-2 text-sm w-full"
type="number"
value={daysBeforeEvent}
onChange={(e) => setDaysBeforeEvent(e.target.value)}
/>
</div>
<label className="flex items-center gap-2 text-sm">
<input
type="checkbox"
checked={chargeRemainingBalance}
onChange={(e) => setChargeRemainingBalance(e.target.checked)}
/>
Charge remaining balance (not just deposit)
</label>
<label className="flex items-center gap-2 text-sm">
<input
type="checkbox"
checked={notifyCustomer}
onChange={(e) => setNotifyCustomer(e.target.checked)}
/>
Notify customer by email when charged
</label>
<button onClick={save} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
Save Settings
</button>
</div>
</div>
)
}
