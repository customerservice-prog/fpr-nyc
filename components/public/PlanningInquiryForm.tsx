'use client'

import { useEffect, useRef, useState } from 'react'
import { PLANNING_HELP, planningServices } from '@/lib/eventPlanning'
import { ESTIMATE_EVENT, sanitizeEstimate, type InquiryEstimate } from '@/lib/planningEstimator'
import { trackEvent } from '@/lib/gtag'

export default function PlanningInquiryForm({ initialType = '' }: { initialType?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const [estimateSummary, setEstimateSummary] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const requestId = useRef('')
  const lastPayload = useRef('')
  const inFlight = useRef(false)
  useEffect(() => {
    function receive(event: Event) {
      if (inFlight.current) return
      const value = (event as CustomEvent<InquiryEstimate>).detail
      if (!value || typeof value.summary !== 'string' || !value.summary.startsWith('VISUAL EVENT ESTIMATE')) return
      const details = sanitizeEstimate({ ...value, guests: value.guestCount }, initialType)
      setEstimateSummary(value.summary.slice(0, 3600)); setReference(''); setError('')
      requestId.current = ''; lastPayload.current = ''
      requestAnimationFrame(() => {
        const form = formRef.current
        if (!form) return
        const fields = { eventType: details.eventType, eventDate: details.eventDate, guestCount: String(details.guests), location: details.location, venueStatus: details.venueStatus }
        for (const [name, text] of Object.entries(fields)) {
          const field = form.elements.namedItem(name)
          if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = text
        }
        // Name, email, phone and the customer's notes are deliberately untouched.
      })
    }
    window.addEventListener(ESTIMATE_EVENT, receive)
    return () => window.removeEventListener(ESTIMATE_EVENT, receive)
  }, [initialType])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const data = new FormData(event.currentTarget)
    const message = [String(data.get('message') || '').trim(), estimateSummary].filter(Boolean).join('\n\n')
    if (message.length > 4000) { setError('Please shorten your additional notes so your complete estimate can be included. Your selections and contact details have been kept.'); return }
    inFlight.current = true; setBusy(true); setError('')
    try {
      const payload = { ...Object.fromEntries(data), message, help: data.getAll('help') }
      const fingerprint = JSON.stringify(payload)
      if (!requestId.current || fingerprint !== lastPayload.current) requestId.current = crypto.randomUUID()
      lastPayload.current = fingerprint
      const response = await fetch('/api/event-planning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: requestId.current }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your inquiry could not be saved. Please call 315-884-1498.')
      setReference(result.reference)
      trackEvent('generate_lead', { lead_type: 'event_planning', source: estimateSummary ? 'visual_estimator' : 'planning_form' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again or call 315-884-1498.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  const input = 'mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200'
  if (reference) return <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"><h3 className="text-xl font-bold">Your planning inquiry is saved.</h3><p className="mt-3">Our office will review your event details. This is an inquiry, not a reservation. For time-sensitive questions, call <a className="font-semibold underline" href="tel:+13158841498">315-884-1498</a>.</p><p className="mt-3 break-all text-sm">Reference: {reference}</p></div>
  return <form ref={formRef} onSubmit={submit} className="space-y-5" aria-label="Event planning inquiry">
    <p className="text-sm text-slate-600">Tell us what you know so far. Fields marked * are required. No payment is collected here.</p>
    {estimateSummary && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4" data-attached-estimate><p className="text-sm font-bold text-blue-950">Your visual estimate is attached.</p><p className="mt-2 text-xs leading-6 text-blue-900">Your event choices and itemized estimate will be sent with this form. It is not a confirmed quote or a reservation.</p><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-blue-900">Review the attached estimate</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700">{estimateSummary}</pre></details><button type="button" disabled={busy} onClick={() => setEstimateSummary('')} className="mt-2 min-h-11 text-xs font-semibold text-blue-800 underline">Remove attached estimate</button></div>}
    <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Event type *<select name="eventType" required defaultValue={initialType} className={input}><option value="">Choose your event</option>{planningServices.map(s => <option key={s.slug} value={s.type}>{s.label}</option>)}<option>Other / not sure yet</option></select></label>
      <label className="text-sm font-semibold">Event date <span className="font-normal">(optional)</span><input className={input} type="date" name="eventDate"/><span className="mt-1 block text-xs font-normal text-slate-500">Leave blank if your date is undecided.</span></label>
      <label className="text-sm font-semibold">Estimated guest count<input className={input} type="number" min="1" max="100000" step="1" name="guestCount" inputMode="numeric" placeholder="Approximate is fine"/></label>
      <label className="text-sm font-semibold">Venue or city *<input className={input} name="location" maxLength={200} required placeholder="Venue, city or neighborhood" autoComplete="address-level2"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Do you have a venue?<select name="venueStatus" className={input} defaultValue="Still deciding"><option>Still deciding</option><option>Yes, booked</option><option>Have a venue in mind</option><option>Hosting at home</option></select></label>
      <fieldset className="min-w-0 sm:col-span-2"><legend className="text-sm font-semibold">What help do you need?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{PLANNING_HELP.map(help => <label key={help} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><input name="help" value={help} type="checkbox" className="h-4 w-4"/>{help}</label>)}</div></fieldset>
      <label className="text-sm font-semibold">Your name *<input className={input} name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
      <label className="text-sm font-semibold">Phone *<input className={input} name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={25}/></label>
      <label className="text-sm font-semibold sm:col-span-2">Email *<input className={input} name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label className="text-sm font-semibold sm:col-span-2">Anything else we should know?<textarea className={input} name="message" rows={4} maxLength={Math.max(0, 4000 - estimateSummary.length - (estimateSummary ? 2 : 0))} placeholder="Your ideas, vendors already booked, or an existing rental order number."/>{estimateSummary && <span className="mt-1 block text-xs font-normal text-slate-500">Your itemized estimate is already attached above.</span>}</label>
      <label className="hidden" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off"/></label>
    </fieldset>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} Your details have been kept in the form.</p>}
    <button disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white transition hover:bg-blue-900 disabled:opacity-60">{busy ? 'Saving your inquiry…' : 'Get My Free Planning Consultation'}</button>
    <p className="text-xs leading-relaxed text-slate-500">We will use these details to respond to your inquiry. This form does not subscribe you to marketing emails. Your event date and services are only confirmed through the booking process.</p>
  </form>
}
