'use client'

import { useEffect, useState } from 'react'

interface TextLog {
id: string
toPhone: string
message: string
status: string
createdAt: string
}

export default function TextLogsPage() {
const [logs, setLogs] = useState<TextLog[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
fetch('/api/admin/text-logs')
.then((r) => r.json())
.then((d) => {
setLogs(d.textLogs || [])
setLoading(false)
})
}, [])

if (loading) return <div className="p-6">Loading...</div>

return (
<div className="p-6 max-w-4xl mx-auto">
<h1 className="text-2xl font-semibold mb-4">Text Logs</h1>
<p className="text-sm text-gray-600 mb-4">
A record of text messages sent through the system. Connect a text messaging provider under General Config to begin sending texts.
</p>
{logs.length === 0 ? (
<p className="text-sm text-gray-500">No text messages have been sent yet.</p>
) : (
<table className="w-full border-collapse">
<thead>
<tr className="text-left text-xs text-gray-500 border-b">
<th className="py-2">To</th>
<th className="py-2">Message</th>
<th className="py-2">Status</th>
<th className="py-2">Sent</th>
</tr>
</thead>
<tbody>
{logs.map((l) => (
<tr key={l.id} className="border-b">
<td className="py-2 text-sm">{l.toPhone}</td>
<td className="py-2 text-sm">{l.message}</td>
<td className="py-2 text-sm">{l.status}</td>
<td className="py-2 text-sm">{new Date(l.createdAt).toLocaleString()}</td>
</tr>
))}
</tbody>
</table>
)}
</div>
)
}
