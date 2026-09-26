'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Mail {
  id: string
  toAddress: string
  fromAddress: string | null
  subject: string
  body: string
  status: string
  sentAt: string
}

export default function FprMailPage() {
  const [items, setItems] = useState<Mail[]>([])
  const [toAddress, setToAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch('/api/admin/ersmail')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sendItem = async () => {
    if (!toAddress || !subject || !body) { toast.error('All fields are required'); return }
    const res = await fetch('/api/admin/ersmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toAddress, subject, body, status: 'Sent' }),
    })
    if (res.ok) {
      toast.success('Mail logged')
      setToAddress(''); setSubject(''); setBody('')
      load()
    } else {
      toast.error('Failed to send')
    }
  }

  const removeItem = async (id: string) => {
    const res = await fetch(`/api/admin/ersmail?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() } else { toast.error('Delete failed') }
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-dark mb-4">FPRMail</h1>
      <div className="bg-white rounded shadow p-4 mb-4">
        <input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="To Address" value={toAddress} onChange={e => setToAddress(e.target.value)} />
        <input className="border rounded px-3 py-2 text-sm w-full mb-2" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <textarea className="border rounded px-3 py-2 text-sm w-full mb-2" rows={4} placeholder="Body" value={body} onChange={e => setBody(e.target.value)} />
        <button className="bg-admin-dark text-white px-4 py-2 rounded text-sm" onClick={sendItem}>Log Mail</button>
      </div>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">To</th>
              <th className="p-2">Subject</th>
              <th className="p-2">Status</th>
              <th className="p-2">Sent At</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b">
                <td className="p-2">{item.toAddress}</td>
                <td className="p-2">{item.subject}</td>
                <td className="p-2">{item.status}</td>
                <td className="p-2">{new Date(item.sentAt).toLocaleString()}</td>
                <td className="p-2"><button className="text-red-600 text-xs" onClick={() => removeItem(item.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
