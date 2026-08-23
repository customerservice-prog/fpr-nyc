'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function RemindersPage() {
  const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
      const [delivery, setDelivery] = useState('1')
        const [pickup, setPickup] = useState('1')
          const [balance, setBalance] = useState('3')

            const load = async () => {
                const res = await fetch('/api/admin/order-settings')
                    const data = await res.json()
                        if (data.settings) {
                              setDelivery(String(data.settings.reminderDaysBeforeDelivery))
                                    setPickup(String(data.settings.reminderDaysBeforePickup))
                                          setBalance(String(data.settings.reminderDaysBeforeBalance))
                                              }
                                                  setLoading(false)
                                                    }

                                                      useEffect(() => { load() }, [])

                                                        const save = async () => {
                                                            setSaving(true)
                                                                const res = await fetch('/api/admin/order-settings', {
                                                                      method: 'PATCH',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                  body: JSON.stringify({
                                                                                          reminderDaysBeforeDelivery: delivery,
                                                                                                  reminderDaysBeforePickup: pickup,
                                                                                                          reminderDaysBeforeBalance: balance,
                                                                                                                }),
                                                                                                                    })
                                                                                                                        setSaving(false)
                                                                                                                            if (res.ok) {
                                                                                                                                  toast.success('Reminder settings saved')
                                                                                                                                      } else {
                                                                                                                                            toast.error('Failed to save')
                                                                                                                                                }
                                                                                                                                                  }
                                                                                                                                                  
                                                                                                                                                    if (loading) return <div className="p-4">Loading...</div>
                                                                                                                                                    
                                                                                                                                                      return (
                                                                                                                                                          <div className="p-4">
                                                                                                                                                                <h1 className="text-xl font-bold text-dark mb-2">Reminders</h1>
                                                                                                                                                                      <p className="text-sm text-gray-600 mb-6">Set the default number of days before an event that reminder emails go out. These defaults are used by the Delivery Reminder, Pickup Reminder, and Balance Reminder automatic messages.</p>
                                                                                                                                                                      
                                                                                                                                                                            <div className="bg-white rounded shadow p-4 max-w-md space-y-4">
                                                                                                                                                                                    <div>
                                                                                                                                                                                              <label className="block text-sm font-medium mb-1">Days before delivery to send delivery reminder</label>
                                                                                                                                                                                                        <input type="number" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" />
                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                        <div>
                                                                                                                                                                                                                                  <label className="block text-sm font-medium mb-1">Days before pickup to send pickup reminder</label>
                                                                                                                                                                                                                                            <input type="number" value={pickup} onChange={(e) => setPickup(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" />
                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                            <div>
                                                                                                                                                                                                                                                                      <label className="block text-sm font-medium mb-1">Days before event to send balance reminder</label>
                                                                                                                                                                                                                                                                                <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="border rounded px-3 py-2 text-sm w-full" />
                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                <button onClick={save} disabled={saving} className="bg-admin-dark text-white px-4 py-2 rounded text-sm">
                                                                                                                                                                                                                                                                                                          {saving ? 'Saving...' : 'Save'}
                                                                                                                                                                                                                                                                                                                  </button>
                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                              )
                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                              
