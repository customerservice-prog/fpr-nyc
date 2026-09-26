'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Msg {
id: string
name: string
daysToSend: number
sendOption: string
message: string
filter: string
disableMessage: boolean
}

export default function AutomaticTextMessagingPage() {
const [items, setItems] = useState<Msg[]>([])
const [name, setName] = useState('')
const [daysToSend, setDaysToSend] = useState(0)
const [sendOption, setSendOption] = useState('Before Order Starts')
const [message, setMessage] = useState('')
const [loading, setLoading] = useState(true)

const load = async () => {
const res = await fetch('/api/admin/automatic-text-messaging')
const data = await res.json()
setItems(data.items || [])
setLoading(false)
}

useEffect(() => { load() }, [])

const addItem = async () => {
if (!name || !message) { toast.error('Name and message are required'); return }
const res = await fetch('/api/admin/automatic-text-messaging', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name, daysToSend, sendOption, message, disableMessage: true }),
})
if (res.ok) {
toast.success('Text message added (disabled by default)')
setName(''); setMessage(''); setDaysToSend(0)
load()
} else {
toast.error('Failed to add')
}
}

const toggleDisabled = async (item: Msg) => {
const res = await fetch('/api/admin/automatic-text-messaging', {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ id: item.id, disableMessage: !item.disableMessage }),
})
if (res.ok) { load() } else { toast.error('Update failed') }
}

const removeItem = async (id: string) => {
const res = await fetch(`/api/admin/automatic-text-messaging?id=${id}`, { method: 'DELETE' })
if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
}

if (loading) return <div className="p-4">Loading...</div>

return (
<div className="p-4">
<h1 className="text-xl font-bold text-dark mb-4">Automatic Text Messaging</h1>
<p className="text-xs text-body mb-2">Note: cancelled orders never receive automatic messages. New messages are disabled by default and must be manually enabled.</p>
<div className="bg-white rounded shadow p-4 mb-4">
<div className="grid md:grid-cols-3 gap-2 mb-2">
<input className="border rounded px-3 py-2 text-sm" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
<input type="number" className="border rounded px-3 py-2 text-sm" placeholder="Days to send" value={daysToSend} onChange={e => setDaysToSend(parseInt(e.target.value) || 0)} />
<select className="border rounded px-3 py-2 text-sm" value={sendOption} onChange={e => setSendOption(e.target.value)}>
<option value="Before Order Starts">Before Order Starts</option>
<option value="After Order Ends">After Order Ends</option>
</select>
</div>
<textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={3} placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} />
<button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={addItem}>Add Message</button>
</div>
<div className="bg-white rounded shadow">
<table className="w-full text-sm">
<thead>
<tr className="border-b text-left">
<th className="p-2">Name</th>
<th className="p-2">Days</th>
<th className="p-2">Send Option</th>
<th className="p-2">Message</th>
<th className="p-2">Enabled</th>
<th className="p-2">Actions</th>
</tr>
</thead>
<tbody>
{items.map(item => (
<tr key={item.id} className="border-b">
<td className="p-2">{item.name}</td>
<td className="p-2">{item.daysToSend}</td>
<td className="p-2">{item.sendOption}</td>
<td className="p-2">{item.message}</td>
<td className="p-2"><input type="checkbox" checked={!item.disableMessage} onChange={() => toggleDisabled(item)} /></td>
<td className="p-2"><button className="text-red-600 text-xs" onClick={() => removeItem(item.id)}>Delete</button></td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)
}
