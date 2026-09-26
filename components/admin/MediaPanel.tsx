'use client'

import { useEffect, useState } from 'react'
import ZoomEmbeddedMeeting, { ZoomSdkSession } from './ZoomEmbeddedMeeting'

function getYouTubeEmbedUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const idMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/)
  if (idMatch) {
    return `https://www.youtube.com/embed/${trimmed}`
  }

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      const parts = url.pathname.split('/')
      const embedIndex = parts.indexOf('embed')
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`
      }
    }
  } catch {
    return null
  }

  return null
}

interface Meeting {
  id: string
  customerName: string
  email: string | null
  scheduledAt: string | null
  notes: string | null
  zoomLink: string | null
  zoomMeetingId: string | null
  completed: boolean
  pending: boolean
  token: string | null
}

export default function MediaPanel() {
  const [input, setInput] = useState<string>('')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [sendLinkMode, setSendLinkMode] = useState(false)
  const [zoomSession, setZoomSession] = useState<ZoomSdkSession | null>(null)
  const [joiningMeetingId, setJoiningMeetingId] = useState<string | null>(null)
  const [newMeeting, setNewMeeting] = useState({
    customerName: '',
    email: '',
    scheduledAt: '',
    notes: '',
    zoomLink: '',
  })

  useEffect(() => {
    fetchMeetings()
  }, [])

  async function fetchMeetings() {
    try {
      const res = await fetch('/api/admin/meetings')
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch {
      // ignore network errors, panel will just show empty state
    } finally {
      setLoadingMeetings(false)
    }
  }

  const loadVideo = () => {
    const url = getYouTubeEmbedUrl(input)
    if (url) {
      setEmbedUrl(url)
      setError('')
    } else {
      setError('Could not recognize that as a YouTube link or video ID')
    }
  }

  async function handleAddMeeting() {
    if (!newMeeting.customerName.trim()) return
    if (!sendLinkMode && !newMeeting.scheduledAt) return
    setSavingMeeting(true)
    try {
      const res = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          sendLinkMode
            ? {
                customerName: newMeeting.customerName,
                email: newMeeting.email,
                notes: newMeeting.notes,
                zoomLink: newMeeting.zoomLink,
                sendSchedulingLink: true,
              }
            : newMeeting
        ),
      })
      if (res.ok) {
        setNewMeeting({ customerName: '', email: '', scheduledAt: '', notes: '', zoomLink: '' })
        setSendLinkMode(false)
        setShowAddForm(false)
        fetchMeetings()
      }
    } finally {
      setSavingMeeting(false)
    }
  }

  async function handleCompleteMeeting(id: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id))
    await fetch('/api/admin/meetings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
  }

  async function handleJoinMeeting(id: string) {
    setJoiningMeetingId(id)
    try {
      const res = await fetch(`/api/admin/meetings/${id}/zoom-signature`)
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Could not start the meeting.')
        return
      }
      setZoomSession(data)
    } catch {
      alert('Could not start the meeting.')
    } finally {
      setJoiningMeetingId(null)
    }
  }

  function bookingLink(token: string) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/schedule/${token}`
  }

  function schedulingEmailHref(m: Meeting) {
    const link = bookingLink(m.token || '')
    const body = `Hi ${m.customerName},\n\nPlease pick a date and time that works for you here: ${link}\n\nThanks!`
    if (m.email) {
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent('Pick a time for our call')}&body=${encodeURIComponent(body)}`
    }
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Pick a time for our call')}&body=${encodeURIComponent(body)}`
  }

  const upcoming = meetings.filter((m) => !m.completed)

  return (
    <div className="bg-white rounded shadow p-4 flex-1 flex flex-col">
      <h3 className="font-bold text-dark text-sm mb-3">Screen</h3>
      <div className="flex-1 rounded overflow-hidden bg-gray-100 flex items-center justify-center min-h-[220px]">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <p className="text-gray-400 text-sm text-center px-4">Paste a YouTube link below to watch a video here</p>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadVideo() }}
          placeholder="Paste a YouTube link or video ID"
          className="flex-1 border rounded px-3 py-1.5 text-sm"
        />
        <button onClick={loadVideo} className="bg-admin-green text-white text-sm px-4 py-1.5 rounded">
          Play
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <div className="mt-4 pt-3 border-t">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-dark text-sm">Upcoming Meetings</h4>
          <button onClick={() => setShowAddForm((s) => !s)} className="text-xs text-admin-green hover:underline">
            {showAddForm ? 'Cancel' : '+ Add meeting'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-50 rounded p-2 mb-3 space-y-1.5">
            <input
              type="text"
              placeholder="Customer name"
              value={newMeeting.customerName}
              onChange={(e) => setNewMeeting({ ...newMeeting, customerName: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newMeeting.email}
              onChange={(e) => setNewMeeting({ ...newMeeting, email: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={sendLinkMode}
                onChange={(e) => setSendLinkMode(e.target.checked)}
              />
              Not sure of a time yet — send them a link to pick one
            </label>
            {!sendLinkMode && (
              <input
                type="datetime-local"
                value={newMeeting.scheduledAt}
                onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            )}
            <input
              type="text"
              placeholder="Zoom link (optional, else default is used)"
              value={newMeeting.zoomLink}
              onChange={(e) => setNewMeeting({ ...newMeeting, zoomLink: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <textarea
              placeholder="Notes (optional)"
              value={newMeeting.notes}
              onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
              rows={2}
            />
            <button
              onClick={handleAddMeeting}
              disabled={savingMeeting}
              className="w-full text-sm bg-admin-green text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              {savingMeeting ? 'Saving...' : sendLinkMode ? 'Create & Get Link' : 'Save Meeting'}
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loadingMeetings ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming meetings scheduled</p>
          ) : (
            upcoming.map((m) => (
              <div key={m.id} className="border rounded p-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-dark">{m.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {m.pending || !m.scheduledAt ? (
                        <span className="text-amber-600">Awaiting response</span>
                      ) : (
                        new Date(m.scheduledAt).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteMeeting(m.id)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                    title="Mark as done"
                  >
                    done
                  </button>
                </div>
                {m.notes && <p className="text-xs text-gray-600 mt-1">{m.notes}</p>}
                <div className="flex gap-2 mt-2">
                  {m.pending ? (
                    <a
                      href={schedulingEmailHref(m)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs border rounded px-2 py-1 hover:bg-gray-50 whitespace-nowrap bg-admin-green text-white border-admin-green"
                    >
                      Send scheduling link
                    </a>
                  ) : (
                    <a
                      href={m.zoomLink || 'https://zoom.us/join'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs border rounded px-2 py-1 hover:bg-gray-50 whitespace-nowrap bg-admin-green text-white border-admin-green"
                    >
                      Join Zoom
                    </a>
                  )}
                  {m.zoomMeetingId && !m.pending && (
                    <button
                      onClick={() => handleJoinMeeting(m.id)}
                      disabled={joiningMeetingId === m.id}
                      className="flex-1 text-center text-xs border rounded px-2 py-1 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
                    >
                      {joiningMeetingId === m.id ? 'Joining...' : 'Join Meeting'}
                    </button>
                  )}
                  {m.email && !m.pending && (
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent('Meeting with ' + m.customerName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs border rounded px-2 py-1 hover:bg-gray-50 whitespace-nowrap"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <a
          href="https://mail.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
        >
          Open Email
        </a>
        <a
          href="https://zoom.us/join"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
        >
          Start Zoom Call
        </a>
      </div>

      {zoomSession && (
        <ZoomEmbeddedMeeting session={zoomSession} onClose={() => setZoomSession(null)} />
      )}
    </div>
  )
}
