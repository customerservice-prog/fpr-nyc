'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { wallClockToInstant } from '@/lib/meetingTime'
import { formatMeetingTime, meetingDraft, mergeMeetings, type CalendarEvent, type Meeting, type MeetingView } from './meeting-view'
import InterviewTestSheet from './InterviewTestSheet'

interface CalendarStatus {
  configured: boolean
  configurationSource: 'environment' | 'admin_settings' | null
  connected: boolean
  connectionExists: boolean
  connectionError: string | null
  googleEmail: string | null
  calendarId: string
  callbackUrl: string
  canManageConnection: boolean
  expectedEmail: string
}

type Dialog = 'create' | 'reschedule' | 'cancel' | 'invite' | 'draft' | 'test' | 'disconnect' | null
const button = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
const primary = 'rounded-lg bg-admin-green px-4 py-2.5 text-sm font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40'
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100'
const blankMeeting = { customerName: '', email: '', scheduledAt: '', durationMinutes: 15, notes: '', sendInvite: false, sendSchedulingLink: false }
const decisionLabels: Record<string, string> = {
  undecided: 'Undecided',
  advance: 'Advance',
  hold: 'Hold',
  not_selected: 'Not selected',
  hired: 'Hired',
}

function Modal({ title, children, busy, onClose, wide = false }: { title: string; children: ReactNode; busy: boolean; onClose: () => void; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  const locked = useRef(busy)
  close.current = onClose
  locked.current = busy
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !locked.current) close.current()
      if (event.key !== 'Tab') return
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || [])
      if (!elements.length) { event.preventDefault(); return }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus() }
    }
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = priorOverflow
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [])
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="meeting-dialog-title" tabIndex={-1} className={'max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl focus:outline-none ' + (wide ? 'max-w-5xl' : 'max-w-xl')}>
      <div className="flex items-center justify-between gap-4 border-b p-5">
        <h4 id="meeting-dialog-title" className="text-lg font-black text-slate-900">{title}</h4>
        <button type="button" className={button} onClick={onClose} disabled={busy} aria-label="Close meeting dialog">Close</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
}

function TimePair({ start, allDay = false }: { start: string | null; allDay?: boolean }) {
  if (allDay) return <p className="text-sm text-slate-600">All day · {start?.slice(0, 10)}</p>
  return <div className="space-y-1 text-xs leading-5">
    <p className="font-semibold text-slate-700"><span className="font-normal text-slate-500">New York</span> · {formatMeetingTime(start, 'America/New_York')}</p>
    <p className="text-slate-500">Philippines · {formatMeetingTime(start, 'Asia/Manila')}</p>
  </div>
}

function TimeFields({ value, duration, onTime, onDuration }: { value: string; duration: number; onTime: (value: string) => void; onDuration: (value: number) => void }) {
  let preview: string | null = null
  try { if (value) preview = wallClockToInstant(value).toISOString() } catch { /* The API returns the precise invalid-time error. */ }
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-[1fr_145px]">
      <label className="block text-sm font-semibold text-slate-700">Date & time in New York
        <input aria-label="Date & time in New York" type="datetime-local" required value={value} onChange={event => onTime(event.target.value)} className={input + ' mt-1'} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">Duration
        <select aria-label="Duration" value={duration} onChange={event => onDuration(Number(event.target.value))} className={input + ' mt-1'}>
          {Array.from(new Set([15, 20, 30, 45, 60, duration])).sort((a, b) => a - b).map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
        </select>
      </label>
    </div>
    {preview ? <div className="rounded-lg bg-slate-50 p-3"><TimePair start={preview} /></div> : <p className="text-xs text-slate-500">Enter your New York time. The Philippines date and time will appear here.</p>}
  </div>
}

export default function MediaPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [history, setHistory] = useState(false)
  const [showGoogleSetup, setShowGoogleSetup] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [newMeeting, setNewMeeting] = useState(blankMeeting)
  const [editTime, setEditTime] = useState('')
  const [editDuration, setEditDuration] = useState(15)
  const [inviteEmail, setInviteEmail] = useState('')
  const [notifyAttendees, setNotifyAttendees] = useState(false)
  const [trackingNotes, setTrackingNotes] = useState('')
  const [trackingDecision, setTrackingDecision] = useState('undecided')
  const [origin, setOrigin] = useState('')
  const [callFallback, setCallFallback] = useState<string | null>(null)
  const loadSequence = useRef(0)

  const refresh = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    const failures: string[] = []
    const [saved, status] = await Promise.allSettled([
      fetch('/api/admin/meetings', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load saved meetings.'); return data }),
      fetch('/api/admin/google-calendar/status', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not check Google Calendar.'); return data as CalendarStatus }),
    ])
    if (sequence !== loadSequence.current) return
    if (saved.status === 'fulfilled') setMeetings(saved.value.meetings || [])
    else failures.push(saved.reason instanceof Error ? saved.reason.message : 'Could not load saved meetings.')
    if (status.status === 'fulfilled') {
      setCalendarStatus(status.value)
      if (status.value.connected) {
        try {
          const response = await fetch('/api/admin/google-calendar/events', { cache: 'no-store' })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Could not load the Google Calendar agenda.')
          if (sequence === loadSequence.current) setCalendarEvents(data.events || [])
        } catch (err) { failures.push(err instanceof Error ? err.message : 'Could not load the Google Calendar agenda. Your last loaded events are shown.') }
      } else setCalendarEvents([])
    } else failures.push(status.reason instanceof Error ? status.reason.message : 'Could not check Google Calendar.')
    if (sequence === loadSequence.current) { setLoading(false); setError(failures.join(' ')) }
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    void refresh()
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get('googleCalendar')
    if (oauth === 'connected') setNotice('Google Calendar connected. You can prepare and manage meetings here.')
    if (oauth === 'denied') setError('Google connection was canceled. Nothing was changed.')
    if (oauth === 'invalid-state') setError('The Google connection session expired. Click Connect Google Calendar and try again.')
    if (oauth === 'missing-refresh-token') setError('Google did not return offline access. Reconnect and approve Calendar access.')
    if (oauth === 'error') setError('Google Calendar could not be connected. Check the OAuth setup and try again.')
    if (oauth === 'setup-required') setShowGoogleSetup(true)
    if (oauth) {
      params.delete('googleCalendar')
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : '') + '#video-meetings')
    }
    return () => { loadSequence.current++ }
  }, [refresh])

  const allMeetings = useMemo(() => mergeMeetings(meetings, calendarEvents), [meetings, calendarEvents])
  const visible = useMemo(() => allMeetings.filter(meeting => meeting.history === history).sort((a, b) => history ? (b.start || '').localeCompare(a.start || '') : (a.start || '').localeCompare(b.start || '')), [allMeetings, history])
  const selected = allMeetings.find(meeting => meeting.key === selectedKey) || visible[0] || null
  const selectedEventId = selected?.event?.id || selected?.local?.googleEventId || null
  const hasSelectedEvent = !!selected?.event
  const selectedCancelled = !!selected?.cancelled
  const candidateWorkflow = !!selected && (!!selected.local || /interview/i.test(selected.name))

  useEffect(() => {
    setTrackingNotes(selected?.local?.notes || '')
    setTrackingDecision(selected?.local?.decision || 'undecided')
  }, [selected?.key, selected?.local?.notes, selected?.local?.decision])

  useEffect(() => {
    if (!selectedEventId || hasSelectedEvent || selectedCancelled || !calendarStatus?.connected) return
    const controller = new AbortController()
    setDetailLoading(true)
    fetch('/api/admin/google-calendar/events/' + encodeURIComponent(selectedEventId), { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load the latest meeting details.')
      if (!controller.signal.aborted && data.event) setCalendarEvents(events => [...events.filter(event => event.id !== data.event.id), data.event])
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load the latest meeting details.') })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => { controller.abort(); setDetailLoading(false) }
  }, [selectedEventId, hasSelectedEvent, selectedCancelled, calendarStatus?.connected])

  function openDialog(value: Dialog, meeting = selected) {
    setDialogError('')
    setError('')
    setNotice('')
    setNotifyAttendees(false)
    if (meeting) {
      setSelectedKey(meeting.key)
      setEditTime(meeting.event?.scheduledAtWall || meeting.local?.scheduledAt?.slice(0, 16) || '')
      setEditDuration(meeting.durationMinutes)
      setInviteEmail(meeting.local?.email || '')
    }
    setDialog(value)
  }

  async function copyText(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setNotice(label + ' copied.'); setDialogError('') }
    catch { const message = 'Could not copy automatically. Select the text in the message draft and copy it manually.'; setError(message); if (dialog) setDialogError(message) }
  }

  function joinCall(meeting: MeetingView) {
    if (!meeting.videoLink) return
    const popup = window.open(meeting.videoLink, 'fpr-video-meeting', 'popup,width=1100,height=780')
    if (popup) { popup.opener = null; popup.focus(); setCallFallback(null) }
    else { setCallFallback(meeting.videoLink); setNotice('Your browser blocked the call window. Use the link below to open Google Meet.') }
  }

  async function saveGoogleSetup() {
    if (!googleClientId.trim() || !googleClientSecret.trim()) { setError('Enter both the Google OAuth Client ID and Client Secret.'); return }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/integrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google', apiKey: googleClientId.trim(), apiSecret: googleClientSecret.trim(), accountId: 'primary', isEnabled: true }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save Google OAuth setup.')
      setGoogleClientSecret('')
      setNotice('Google setup saved. Click Connect Google Calendar to finish.')
      setShowGoogleSetup(false)
      await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save Google OAuth setup.') }
    finally { setBusy(false) }
  }

  async function createMeeting() {
    if (!newMeeting.customerName.trim()) { setDialogError('Enter the candidate or customer name.'); return }
    if (newMeeting.sendInvite && !newMeeting.email.trim()) { setDialogError('Enter the candidate’s email before sending an invitation.'); return }
    if (!newMeeting.sendSchedulingLink && !newMeeting.scheduledAt) { setDialogError('Choose the interview date and time in New York.'); return }
    if (!calendarStatus?.connected) { setDialogError('Reconnect Google Calendar before creating a meeting.'); return }
    setBusy(true)
    setDialogError('')
    try {
      const response = await fetch('/api/admin/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newMeeting, sendInvite: newMeeting.sendSchedulingLink ? false : newMeeting.sendInvite }) })
      const data = await response.json()
      if (!response.ok) {
        if (data.calendarUpdated) {
          setDialog(null)
          setNewMeeting(blankMeeting)
          await refresh()
          setError(data.error || 'Google Calendar created this meeting. Review the refreshed list before taking another action.')
          return
        }
        throw new Error(data.error || 'Could not create the meeting.')
      }
      const linkMode = newMeeting.sendSchedulingLink
      setNotice(linkMode ? 'Scheduling link created. Copy the message when you are ready to share it.' : newMeeting.sendInvite ? 'Meeting created. Google Calendar was asked to send the invitation.' : 'Meeting held. No candidate invitation was sent.')
      setNewMeeting(blankMeeting)
      setDialog(null)
      setHistory(false)
      if (data.meeting) { setMeetings(items => [...items, data.meeting]); setSelectedKey('local:' + data.meeting.id) }
      await refresh()
    } catch (err) { setDialogError(err instanceof Error ? err.message : 'Could not create the meeting.') }
    finally { setBusy(false) }
  }

  async function updateMeeting(action: 'reschedule' | 'cancel' | 'invite') {
    if (!selected) return
    if (action === 'invite' && !inviteEmail.trim()) { setDialogError('Enter the candidate’s email to send the invitation.'); return }
    if (action === 'reschedule' && !editTime) { setDialogError('Choose the new date and time in New York.'); return }
    setBusy(true)
    setDialogError('')
    try {
      const path = selected.local ? '/api/admin/meetings/' + selected.local.id : '/api/admin/google-calendar/events/' + encodeURIComponent(selected.event!.id)
      const response = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, scheduledAt: editTime, durationMinutes: editDuration, email: action === 'invite' ? inviteEmail.trim() : undefined, etag: selected.event?.etag, notifyAttendees: action === 'invite' || (selected.attendees.length > 0 && notifyAttendees) }) })
      const data = await response.json()
      if (!response.ok) {
        if (data.calendarUpdated || response.status === 409 || response.status === 412) { setDialog(null); await refresh(); setError(data.error || 'This meeting changed elsewhere. Review the latest details and try again.'); return }
        throw new Error(data.error || 'Could not update the meeting.')
      }
      if (data.meeting) setMeetings(items => items.map(meeting => meeting.id === data.meeting.id ? data.meeting : meeting))
      if (data.event) setCalendarEvents(items => [...items.filter(event => event.id !== data.event.id), data.event])
      if (action === 'cancel' && selected.event) setCalendarEvents(items => items.map(event => event.id === selected.event!.id ? { ...event, status: 'cancelled' } : event))
      setNotice(action === 'invite' ? 'Google Calendar was asked to send the invitation.' : action === 'cancel' ? (notifyAttendees && selected.attendees.length ? 'Meeting canceled. Google Calendar was asked to notify the attendees.' : 'Meeting canceled. No notification email was requested.') : (notifyAttendees && selected.attendees.length ? 'Meeting rescheduled. Google Calendar was asked to notify the attendees.' : 'Meeting rescheduled. No notification email was requested.'))
      setDialog(null)
      if (action === 'cancel') { setHistory(true); setSelectedKey(null) }
      await refresh()
    } catch (err) { setDialogError(err instanceof Error ? err.message : 'Could not update the meeting.') }
    finally { setBusy(false) }
  }

  async function saveTracking(
    patch: { candidateConfirmed?: boolean; linkSent?: boolean; notes?: string; decision?: string; completed?: boolean },
    successMessage: string,
  ) {
    if (!selected || !candidateWorkflow) return false
    setBusy(true)
    setError('')
    try {
      const path = selected.local
        ? '/api/admin/meetings/' + selected.local.id
        : '/api/admin/google-calendar/events/' + encodeURIComponent(selected.event!.id)
      const body = selected.local ? patch : { action: 'metadata', ...patch }
      const response = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save the interview details.')
      if (data.meeting) {
        setMeetings(items => items.some(meeting => meeting.id === data.meeting.id)
          ? items.map(meeting => meeting.id === data.meeting.id ? data.meeting : meeting)
          : [...items, data.meeting])
        setSelectedKey('local:' + data.meeting.id)
      }
      if (data.event) setCalendarEvents(items => [...items.filter(event => event.id !== data.event.id), data.event])
      setNotice(successMessage)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the interview details.')
      return false
    } finally { setBusy(false) }
  }

  async function completeMeeting() {
    const saved = await saveTracking({ completed: true }, 'Meeting marked completed in your admin. The Calendar event was not canceled.')
    if (saved) { setHistory(true); setSelectedKey(null) }
  }

  async function disconnectGoogle() {
    setBusy(true)
    setDialogError('')
    try {
      const response = await fetch('/api/admin/google-calendar/disconnect', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not disconnect Google Calendar.')
      setDialog(null)
      setNotice('Google Calendar disconnected. Existing Calendar events remain unchanged.')
      await refresh()
    } catch (err) { setDialogError(err instanceof Error ? err.message : 'Could not disconnect Google Calendar.') }
    finally { setBusy(false) }
  }

  const canManage = !!selected && !selected.cancelled && !selected.local?.completed && (selected.event ? selected.event.editable && !selected.event.recurring && !selected.event.allDay && calendarStatus?.connected : !selected.local?.googleEventId && !selected.local?.zoomMeetingId)
  const canInvite = canManage && !selected?.past && !selected?.pending && !!selected?.event && !!calendarStatus?.connected
  const draft = selected ? meetingDraft(selected, origin) : ''
  const titles = { create: 'Prepare an interview', reschedule: 'Reschedule meeting', cancel: 'Cancel meeting', invite: 'Send Calendar invitation', draft: selected?.pending ? 'Scheduling message draft' : 'Interview message draft', test: 'Live interview test · Easy Call Quote Sheet', disconnect: 'Disconnect Google Calendar?' }

  return <section id="video-meetings" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-5 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-green-300">Interview & Video Meeting Center</p>
          <h3 className="mt-1 text-xl font-black">Your meetings, managed here</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">Prepare, reschedule, or cancel in your admin. Hold an interview first and send the invitation when you are ready.</p>
        </div>
        <button type="button" onClick={() => openDialog('create')} disabled={!calendarStatus?.connected || busy || loading} className="shrink-0 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-green-400 disabled:opacity-40">+ New interview</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className={'rounded-full px-3 py-1.5 font-bold ' + (calendarStatus?.connected ? 'bg-green-500/20 text-green-200' : 'bg-amber-400/15 text-amber-200')}>
          {loading && !calendarStatus ? 'Checking Google connection…' : calendarStatus?.connected ? '● Connected · ' + (calendarStatus.googleEmail || 'Google Calendar') : '○ Google Calendar not connected'}
        </span>
        {calendarStatus?.connectionError && <span className="text-amber-200">Reconnect needed</span>}
        {!calendarStatus?.connected && calendarStatus?.configured && <a href="/api/admin/google-calendar/connect" className="rounded-lg bg-green-500 px-3 py-2 font-bold text-slate-950">Connect Google Calendar</a>}
        {!calendarStatus?.connected && !calendarStatus?.configured && calendarStatus?.canManageConnection && <button type="button" onClick={() => setShowGoogleSetup(value => !value)} className="rounded-lg border border-white/30 px-3 py-2 font-bold">Set up Google Calendar</button>}
        {calendarStatus?.connected && calendarStatus.canManageConnection && <button type="button" onClick={() => openDialog('disconnect')} disabled={busy} className="font-semibold text-slate-300 underline underline-offset-4 hover:text-white">Connection settings</button>}
        <span className="text-slate-400">Times shown for New York and the Philippines</span>
      </div>
    </div>

    {notice && <div role="status" aria-live="polite" className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-800">{notice}</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700"><span>{error}</span><button type="button" className="font-bold underline" onClick={() => void refresh()} disabled={loading || busy}>Retry refresh</button></div>}
    {callFallback && <div className="border-b bg-blue-50 px-5 py-3 text-sm"><a className="font-bold text-blue-700 underline" href={callFallback} target="_blank" rel="noopener noreferrer">Open video call</a><span className="ml-2 text-slate-600">Your meeting management stays here.</span></div>}

    {showGoogleSetup && calendarStatus?.canManageConnection && <div className="grid gap-4 border-b border-amber-200 bg-amber-50 p-5 lg:grid-cols-2">
      <div><h4 className="font-black text-slate-900">One-time Google setup</h4><p className="mt-2 text-sm leading-6 text-slate-700">Use <strong>{calendarStatus.expectedEmail || 'customerservice@friendlypartyrental.com'}</strong>. In Google Cloud, enable Google Calendar API and create an OAuth 2.0 Web application client with this exact redirect URI.</p><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-amber-900 underline">Google Cloud credentials</a></div>
      <div className="space-y-3 rounded-xl border border-amber-200 bg-white p-4">
        <label className="block text-xs font-bold text-slate-600">Authorized redirect URI<div className="mt-1 flex gap-2"><input readOnly value={calendarStatus.callbackUrl || ''} className={input + ' min-w-0'} /><button type="button" onClick={() => copyText(calendarStatus.callbackUrl, 'Redirect URI')} className={button}>Copy</button></div></label>
        <label className="block text-xs font-bold text-slate-600">Google OAuth Client ID<input value={googleClientId} onChange={event => setGoogleClientId(event.target.value)} className={input + ' mt-1'} /></label>
        <label className="block text-xs font-bold text-slate-600">Google OAuth Client Secret<input type="password" value={googleClientSecret} onChange={event => setGoogleClientSecret(event.target.value)} className={input + ' mt-1'} autoComplete="off" /></label>
        <button type="button" onClick={saveGoogleSetup} disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save Google setup'}</button>
      </div>
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Meeting view">
        <button type="button" onClick={() => { setHistory(false); setSelectedKey(null) }} className={'rounded-md px-3 py-2 text-sm font-bold ' + (!history ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>Upcoming ({allMeetings.filter(meeting => !meeting.history).length})</button>
        <button type="button" onClick={() => { setHistory(true); setSelectedKey(null) }} className={'rounded-md px-3 py-2 text-sm font-bold ' + (history ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>History ({allMeetings.filter(meeting => meeting.history).length})</button>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading || busy} className={button}>{loading ? 'Refreshing…' : 'Refresh meetings'}</button>
    </div>

    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="border-b border-gray-200 p-4 lg:max-h-[660px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <p className="mb-3 px-1 text-xs text-slate-500">Saved interviews and your connected Calendar in one list.</p>
        {loading && !allMeetings.length ? <p className="p-5 text-sm text-slate-500">Loading meetings…</p> : !visible.length ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><p className="font-bold text-slate-700">{history ? 'No meeting history yet' : 'No upcoming meetings'}</p><p className="mt-2 text-sm text-slate-500">{calendarStatus?.connected ? history ? 'Past and canceled saved interviews appear here.' : 'Create an interview or refresh your Calendar.' : 'Connect Google Calendar to see and manage its meetings here.'}</p></div> : <div className="space-y-2">
          {visible.map(meeting => <button type="button" key={meeting.key} onClick={() => { setSelectedKey(meeting.key); setCallFallback(null) }} className={'w-full rounded-xl border p-4 text-left transition-colors ' + (selected?.key === meeting.key ? 'border-green-500 bg-green-50/60 ring-1 ring-green-500' : 'border-slate-200 bg-white hover:bg-slate-50')} aria-pressed={selected?.key === meeting.key}>
            <div className="flex items-start justify-between gap-3"><p className="break-words text-sm font-black text-slate-900">{meeting.name}</p><span className="shrink-0 text-xs text-slate-400">{meeting.pending ? 'Link' : meeting.event?.allDay ? 'All day' : meeting.durationMinutes + ' min'}</span></div>
            <div className="my-2 flex flex-wrap gap-1.5">
              <span className={'inline-flex rounded-full px-2 py-1 text-[11px] font-bold ' + ({ green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', gray: 'bg-slate-100 text-slate-600' }[meeting.tone])}>{meeting.status}</span>
              {meeting.decision !== 'undecided' && <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{decisionLabels[meeting.decision] || meeting.decision}</span>}
            </div>
            {!meeting.pending && <TimePair start={meeting.start} allDay={meeting.event?.allDay} />}
            {meeting.pending && <p className="text-xs text-slate-500">Scheduling link ready to share</p>}
          </button>)}
        </div>}
        {calendarStatus?.connected && <p className="mt-4 px-1 text-[11px] leading-5 text-slate-400">Calendar agenda covers the next 45 days. Saved interview history remains available.</p>}
      </div>

      <div className="p-5">
        {!selected ? <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center"><div className="mb-3 rounded-full bg-green-100 px-4 py-3 text-2xl text-green-800" aria-hidden="true">▦</div><h4 className="font-bold text-slate-800">Everything ready for your next interview</h4><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose a meeting to see both time zones, prepare a message, or change its schedule.</p></div> : <div className="space-y-5">
          <div><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Meeting details</p><h4 className="mt-1 break-words text-xl font-black text-slate-900">{selected.name}</h4><p className="mt-1 text-sm text-slate-500">{selected.pending ? 'Awaiting time selection' : selected.event?.allDay ? 'All-day event' : selected.durationMinutes + '-minute meeting'}{selected.event ? ' · Google Calendar' : ' · Saved interview'}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><TimePair start={selected.start} allDay={selected.event?.allDay} /></div>
          <div className="space-y-2 text-sm"><p><span className="font-bold text-slate-700">Status:</span> <span className="text-slate-600">{selected.status}</span></p>{selected.attendees.length > 0 ? <p className="break-words text-slate-600"><span className="font-bold text-slate-700">Calendar attendees:</span> {selected.attendees.join(', ')}</p> : selected.local?.email ? <p className="break-words text-slate-600"><span className="font-bold text-slate-700">Contact:</span> {selected.local.email}<span className="block text-xs text-slate-500">Saved contact details do not send an invitation.</span></p> : !selected.cancelled && !selected.past && <p className="text-xs text-slate-500">No Calendar attendee is required when you already sent the Meet link in the candidate conversation.</p>}</div>
          {candidateWorkflow ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="text-sm font-black text-slate-900">Candidate workflow</p><p className="mt-1 text-xs leading-5 text-slate-500">Internal only. These controls do not email the candidate or change the Calendar event.</p></div>
              {selected.decision !== 'undecided' && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">{decisionLabels[selected.decision] || selected.decision}</span>}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={busy} onClick={() => void saveTracking({ candidateConfirmed: !selected.candidateConfirmed }, selected.candidateConfirmed ? 'Candidate confirmation cleared.' : 'Candidate marked confirmed in the candidate chat.')} className={'rounded-lg border px-3 py-2.5 text-left text-sm font-bold disabled:opacity-40 ' + (selected.candidateConfirmed ? 'border-green-300 bg-green-100 text-green-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>{selected.candidateConfirmed ? '✓ Candidate confirmed' : 'Mark candidate confirmed'}</button>
              <button type="button" disabled={busy || (!selected.videoLink && !selected.linkSent)} onClick={() => void saveTracking({ linkSent: !selected.linkSent }, selected.linkSent ? 'Meet-link sent status cleared.' : 'Meet link marked sent in the candidate chat.')} className={'rounded-lg border px-3 py-2.5 text-left text-sm font-bold disabled:opacity-40 ' + (selected.linkSent ? 'border-green-300 bg-green-100 text-green-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>{selected.linkSent ? '✓ Meet link sent' : 'Mark Meet link sent'}</button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
              <label className="block text-xs font-bold text-slate-600">Decision
                <select value={trackingDecision} onChange={event => setTrackingDecision(event.target.value)} className={input + ' mt-1'} disabled={busy}>
                  <option value="undecided">Undecided</option>
                  <option value="advance">Advance</option>
                  <option value="hold">Hold</option>
                  <option value="not_selected">Not selected</option>
                  <option value="hired">Hired</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">Interview notes
                <textarea rows={3} value={trackingNotes} onChange={event => setTrackingNotes(event.target.value)} placeholder="Role-play, communication, availability, follow-up…" className={input + ' mt-1'} disabled={busy} />
              </label>
            </div>
            <div className="mt-3 flex justify-end"><button type="button" disabled={busy} onClick={() => void saveTracking({ notes: trackingNotes, decision: trackingDecision }, 'Interview notes and decision saved.')} className={button}>{busy ? 'Saving…' : 'Save interview notes'}</button></div>
          </div> : selected.local?.notes && <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">Admin notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selected.local.notes}</p></div>}
          {detailLoading && <p className="text-xs text-slate-500">Loading the latest Calendar details…</p>}
          {!selected.cancelled && <div className="flex flex-wrap gap-2">
            {candidateWorkflow && !selected.pending && <a href="/interview-practice-sheet" target="_blank" rel="noopener noreferrer" className={button}>Open / print practice sheet ↗</a>}
            {candidateWorkflow && !selected.pending && <button type="button" onClick={() => openDialog('test')} disabled={busy || detailLoading} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40">Run live interview test</button>}
            {selected.videoLink && <a href={selected.videoLink} target="_blank" rel="noopener noreferrer" className={primary}>Join Google Meet ↗</a>}
            {(selected.videoLink || selected.pending) && <button type="button" onClick={() => openDialog('draft')} className={button}>Message draft</button>}
            {selected.videoLink && <button type="button" onClick={() => copyText(selected.videoLink!, 'Meeting link')} className={button}>Copy meeting link</button>}
            {selected.pending && selected.local?.token && <button type="button" onClick={() => copyText(origin + '/schedule/' + selected.local!.token, 'Scheduling link')} className={button}>Copy scheduling link</button>}
            {!selected.videoLink && !selected.pending && !selected.event?.allDay && <p className="w-full text-xs text-slate-500">No video link is available yet. Refresh if this meeting was just created.</p>}
          </div>}
          {!selected.cancelled && <div className="border-t pt-4"><div className="flex flex-wrap gap-2">
            {!selected.pending && <button type="button" onClick={() => openDialog('reschedule')} disabled={!canManage || busy || detailLoading} className={button}>Reschedule</button>}
            {canInvite && <button type="button" onClick={() => openDialog('invite')} disabled={busy || detailLoading} className={button}>{selected.attendees.length ? 'Invite another attendee' : 'Send invitation'}</button>}
            <button type="button" onClick={() => openDialog('cancel')} disabled={!canManage || busy || detailLoading} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">Cancel meeting</button>
            {candidateWorkflow && !selected.local?.completed && !selected.pending && !selected.past && <button type="button" onClick={completeMeeting} disabled={busy} className={button}>Mark completed</button>}
          </div>{selected.event?.recurring || selected.event?.allDay ? <p className="mt-3 text-xs text-slate-500">Recurring and all-day events are shown for reference. Manage those event types in Google Calendar.</p> : selected.event && !selected.event.editable ? <p className="mt-3 text-xs text-slate-500">This Google account does not own this event, so its schedule cannot be changed here.</p> : selected.local?.zoomMeetingId && !selected.local?.googleEventId ? <p className="mt-3 text-xs text-slate-500">This legacy Zoom meeting must be rescheduled or canceled in Zoom.</p> : !calendarStatus?.connected && selected.local?.googleEventId ? <p className="mt-3 text-xs text-amber-700">Reconnect Google Calendar to change this meeting.</p> : null}</div>}
          <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">Employee flow: open or print the practice sheet, then click Join Google Meet. The private role-play prompts, scoring, notes, rescheduling and cancellation stay here in admin.</p>
          {(selected.event?.htmlLink || selected.local?.googleCalendarHtmlLink) && <a href={selected.event?.htmlLink || selected.local?.googleCalendarHtmlLink || ''} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-slate-500 underline underline-offset-4">View original Calendar event ↗</a>}
        </div>}
      </div>
    </div>

    {dialog && <Modal title={titles[dialog]} busy={busy} onClose={() => setDialog(null)} wide={dialog === 'test'}>
      {dialogError && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{dialogError}</div>}
      {dialog === 'create' && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void createMeeting() }}>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Candidate / customer name<input required value={newMeeting.customerName} onChange={event => setNewMeeting({ ...newMeeting, customerName: event.target.value })} placeholder="Candidate name" className={input + ' mt-1'} /></label>
          <label className="block text-sm font-semibold text-slate-700">Email {newMeeting.sendInvite ? '(required to invite)' : '(optional)'}<input type="email" required={newMeeting.sendInvite} value={newMeeting.email} onChange={event => setNewMeeting({ ...newMeeting, email: event.target.value })} placeholder="candidate@example.com" className={input + ' mt-1'} /></label>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={newMeeting.sendSchedulingLink} onChange={event => setNewMeeting({ ...newMeeting, sendSchedulingLink: event.target.checked, sendInvite: false })} className="mt-1" /><span><strong>Let them choose a time.</strong><span className="mt-1 block text-xs text-slate-500">Create a scheduling link and a message to copy. Nothing is sent now.</span></span></label>
          {!newMeeting.sendSchedulingLink && <TimeFields value={newMeeting.scheduledAt} duration={newMeeting.durationMinutes} onTime={scheduledAt => setNewMeeting({ ...newMeeting, scheduledAt })} onDuration={durationMinutes => setNewMeeting({ ...newMeeting, durationMinutes })} />}
          <label className="block text-sm font-semibold text-slate-700">Admin notes (optional)<textarea rows={2} value={newMeeting.notes} onChange={event => setNewMeeting({ ...newMeeting, notes: event.target.value })} className={input + ' mt-1'} /></label>
          {!newMeeting.sendSchedulingLink && <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={newMeeting.sendInvite} onChange={event => setNewMeeting({ ...newMeeting, sendInvite: event.target.checked })} className="mt-1" /><span><strong>Send the Calendar invitation now</strong><span className="mt-1 block text-xs">{newMeeting.sendInvite ? 'Google Calendar will email the candidate when you create this meeting.' : 'Leave unchecked to hold the time and create the Meet link without inviting the candidate.'}</span></span></label>}
          <button type="submit" className={primary + ' w-full'}>{busy ? 'Creating…' : newMeeting.sendSchedulingLink ? 'Create scheduling link only' : newMeeting.sendInvite ? 'Create meeting & send invitation' : 'Create hold · do not send'}</button>
        </fieldset>
      </form>}
      {selected && (dialog === 'reschedule' || dialog === 'cancel' || dialog === 'invite') && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void updateMeeting(dialog) }}>
        <div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-sm font-bold text-slate-800">{selected.name}</p><TimePair start={selected.start} /></div>
        <fieldset disabled={busy} className="space-y-4">
          {dialog === 'reschedule' && <TimeFields value={editTime} duration={editDuration} onTime={setEditTime} onDuration={setEditDuration} />}
          {dialog === 'invite' && <><label className="block text-sm font-semibold text-slate-700">Candidate email<input required type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} className={input + ' mt-1'} /></label><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This sends a real Calendar invitation with the meeting time and video link. Existing attendees remain invited and may also receive an update.</p></>}
          {dialog === 'cancel' && <p className="text-sm leading-6 text-slate-600">{selected.pending ? 'This disables the scheduling link. The candidate will no longer be able to book using it.' : 'This removes the meeting from the connected Calendar. You cannot undo this cancellation here.'} Your saved interview will remain in History.</p>}
          {dialog !== 'invite' && (selected.attendees.length ? <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={notifyAttendees} onChange={event => setNotifyAttendees(event.target.checked)} className="mt-1" /><span><strong>Notify {selected.attendees.length} attendee{selected.attendees.length === 1 ? '' : 's'} by email</strong><span className="mt-1 block text-xs">{notifyAttendees ? 'Google Calendar will be asked to email this change.' : 'No email notification will be requested. The change can still appear on attendees’ calendars.'}</span></span></label> : <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">No candidate has been added as an attendee. This change will not send a candidate invitation or notification.</p>)}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setDialog(null)} className={button}>Keep unchanged</button><button type="submit" className={dialog === 'cancel' ? 'rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40' : primary}>{busy ? 'Saving…' : dialog === 'cancel' ? 'Yes, cancel meeting' : dialog === 'invite' ? 'Send Calendar invitation' : 'Save new time'}</button></div>
        </fieldset>
      </form>}
      {dialog === 'draft' && selected && <div className="space-y-4"><p className="text-sm text-slate-600">Review and copy this message into your existing candidate conversation. Opening this draft does not send anything.</p><textarea aria-label="Message draft" readOnly rows={12} value={draft} className={input + ' leading-6'} /><div className="flex justify-end"><button type="button" onClick={() => copyText(draft, 'Message draft')} className={primary}>Copy message</button></div>{notice && <p role="status" className="text-sm text-green-700">{notice}</p>}</div>}
      {dialog === 'test' && selected && <InterviewTestSheet
        meeting={selected}
        existingNotes={selected.local?.notes || ''}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(notes, decision) => saveTracking({ notes, decision }, 'Live interview sheet saved to this candidate.')}
      />}
      {dialog === 'disconnect' && <div className="space-y-4"><p className="text-sm leading-6 text-slate-600">Connected account: <strong>{calendarStatus?.googleEmail}</strong>. Disconnecting stops Calendar management in this admin. Existing meetings stay on Google Calendar and attendees are not notified.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} disabled={busy} className={button}>Keep connected</button><button type="button" onClick={disconnectGoogle} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Disconnecting…' : 'Disconnect'}</button></div></div>}
    </Modal>}
  </section>
}
