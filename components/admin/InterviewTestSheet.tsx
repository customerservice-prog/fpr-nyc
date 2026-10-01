'use client'

import { useMemo, useState } from 'react'
import type { MeetingView } from './meeting-view'

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100'

const scenarios = [
  {
    title: '1 · New quote call',
    prompt: 'Customer has a Saturday backyard event for about 60 guests and says: “I need a tent, tables, and chairs. Can you tell me what I should get and if you have it?”',
    listenFor: 'Gets the date, full event address/city/ZIP, guest count, surface, requested items/quantities/details, delivery/setup needs, and does not promise availability before checking.',
  },
  {
    title: '2 · Driver running late',
    prompt: 'A customer calls because their delivery window is almost over and the truck has not arrived. They are upset and their event is later today.',
    listenFor: 'Acknowledges the problem, verifies the order/ETA, checks with dispatch/driver, gives only a verified update, documents the call, and escalates when needed.',
  },
  {
    title: '3 · Requested item unavailable',
    prompt: 'The exact tent or inflatable the customer wants is not available for their date.',
    listenFor: 'Does not invent inventory. Checks alternatives, explains the option clearly, and gets approval before changing the customer’s order.',
  },
  {
    title: '4 · Damage / refund complaint',
    prompt: 'A customer says something arrived damaged and demands an immediate full refund.',
    listenFor: 'Stays calm, documents what happened, asks for the needed details/photos, does not promise an unauthorized refund, and escalates to the manager/owner.',
  },
  {
    title: '5 · Unknown policy',
    prompt: 'A customer asks why the website will not let them check out because the event is within 24 hours and asks whether you can bypass it.',
    listenFor: 'Does not guess the reason or promise a bypass. Gets the requested items, event location, time and contact details, checks availability, and escalates the exception.',
  },
] as const

const scoreLabels = [
  ['intake', 'Quote-call intake completeness'],
  ['accuracy', 'Accuracy · verifies instead of guessing'],
  ['communication', 'Clear, friendly customer communication'],
  ['judgment', 'Operational judgment / escalation'],
  ['notes', 'Repeat-back and useful job notes'],
] as const

type Props = {
  meeting: MeetingView
  existingNotes: string
  busy: boolean
  onSave: (notes: string, decision: string) => Promise<boolean>
  onClose: () => void
}

export default function InterviewTestSheet({ meeting, existingNotes, busy, onSave, onClose }: Props) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [address, setAddress] = useState('')
  const [cityZip, setCityZip] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [surface, setSurface] = useState('')
  const [items, setItems] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [quoteTotal, setQuoteTotal] = useState('')
  const [employeeNotes, setEmployeeNotes] = useState('')
  const [decision, setDecision] = useState(meeting.decision || 'undecided')
  const [scores, setScores] = useState<Record<string, number>>({
    intake: 0,
    accuracy: 0,
    communication: 0,
    judgment: 0,
    notes: 0,
  })

  const total = useMemo(() => Object.values(scores).reduce((sum, value) => sum + Number(value || 0), 0), [scores])

  function buildNotes() {
    const previous = existingNotes.trim()
    const quoteLines = [
      'LIVE INTERVIEW TEST — EASY CALL QUOTE SHEET',
      `Candidate: ${meeting.name}`,
      `Customer: ${customerName || '—'} | Phone: ${phone || '—'} | Email: ${email || '—'}`,
      `Event: ${eventDate || '—'} ${eventStart || ''} | Address: ${address || '—'} | ${cityZip || '—'}`,
      `Guests: ${guestCount || '—'} | Surface: ${surface || '—'}`,
      `Requested rentals: ${items || '—'}`,
      `Delivery/setup notes: ${deliveryNotes || '—'}`,
      `Next action: ${nextAction || '—'} | Quote total: ${quoteTotal ? '$' + quoteTotal : '—'}`,
      '',
      'SCORECARD (0–5 each)',
      `Intake completeness: ${scores.intake}/5`,
      `Accuracy / no guessing: ${scores.accuracy}/5`,
      `Customer communication: ${scores.communication}/5`,
      `Operational judgment: ${scores.judgment}/5`,
      `Repeat-back / notes: ${scores.notes}/5`,
      `TOTAL: ${total}/25`,
      '',
      `Interviewer notes: ${employeeNotes.trim() || '—'}`,
    ]
    const block = quoteLines.join('\n')
    return previous ? `${previous}\n\n---\n${block}` : block
  }

  async function save() {
    const ok = await onSave(buildNotes(), decision)
    if (ok) onClose()
  }

  return <div className="space-y-5">
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-black text-green-950">Use this exact same live test for every candidate.</p>
      <p className="mt-1 text-xs leading-5 text-green-800">This is the in-system version of the Friendly Party Rental <strong>NEW CUSTOMER / QUOTE CALL SHEET</strong>. It is the right worksheet for this interview because it tests call intake and judgment without requiring a new hire to know pricing from memory.</p>
    </div>

    <div className="rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Friendly Party Rental</p>
        <h5 className="text-base font-black text-slate-900">New Customer / Quote Call Sheet</h5>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">Customer name<input value={customerName} onChange={e => setCustomerName(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Phone<input value={phone} onChange={e => setPhone(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Email<input value={email} onChange={e => setEmail(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Event date<input value={eventDate} onChange={e => setEventDate(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Start time<input value={eventStart} onChange={e => setEventStart(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Guest count<input value={guestCount} onChange={e => setGuestCount(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Event address<input value={address} onChange={e => setAddress(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">City / ZIP<input value={cityZip} onChange={e => setCityZip(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Surface
          <select value={surface} onChange={e => setSurface(e.target.value)} className={input + ' mt-1'}>
            <option value="">Select</option><option>Grass</option><option>Asphalt</option><option>Concrete</option><option>Other</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Rental items / quantity / size / color / details<textarea rows={3} value={items} onChange={e => setItems(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Delivery / setup / special requests<textarea rows={2} value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="text-xs font-bold text-slate-600">Next action
          <select value={nextAction} onChange={e => setNextAction(e.target.value)} className={input + ' mt-1'}>
            <option value="">Select</option>
            <option>Check availability</option>
            <option>Make / send quote</option>
            <option>Customer ready to book</option>
            <option>Call customer back</option>
            <option>Ask manager / owner</option>
            <option>Waiting on customer</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Quote total (if reached)<input inputMode="decimal" value={quoteTotal} onChange={e => setQuoteTotal(e.target.value)} className={input + ' mt-1'} /></label>
      </div>
    </div>

    <div>
      <h5 className="text-sm font-black text-slate-900">Standard live role-play · same prompts for Darlene and Grace</h5>
      <p className="mt-1 text-xs text-slate-500">Start with the quote call. Then use the quick scenarios below. Do not coach the candidate toward the answer while the scenario is running.</p>
      <div className="mt-3 space-y-2">
        {scenarios.map(item => <details key={item.title} className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-slate-800">{item.title}</summary>
          <div className="border-t border-slate-100 px-3 py-3 text-xs leading-5 text-slate-600">
            <p><strong>Say:</strong> {item.prompt}</p>
            <p className="mt-2 rounded-md bg-slate-50 p-2"><strong>Listen for:</strong> {item.listenFor}</p>
          </div>
        </details>)}
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3"><h5 className="text-sm font-black text-slate-900">Live scorecard</h5><span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-black text-white">{total}/25</span></div>
      <div className="mt-3 space-y-3">
        {scoreLabels.map(([key, label]) => <label key={key} className="grid items-center gap-2 text-xs font-bold text-slate-700 sm:grid-cols-[1fr_90px]">
          <span>{label}</span>
          <select value={scores[key]} onChange={e => setScores(current => ({ ...current, [key]: Number(e.target.value) }))} className={input}>
            {[0,1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}
          </select>
        </label>)}
      </div>
      <label className="mt-4 block text-xs font-bold text-slate-600">Interviewer notes<textarea rows={4} value={employeeNotes} onChange={e => setEmployeeNotes(e.target.value)} placeholder="What did they do well? What did they miss? Any follow-up to verify?" className={input + ' mt-1'} /></label>
      <label className="mt-4 block text-xs font-bold text-slate-600">Decision
        <select value={decision} onChange={e => setDecision(e.target.value)} className={input + ' mt-1'}>
          <option value="undecided">Undecided</option>
          <option value="advance">Advance</option>
          <option value="hold">Hold</option>
          <option value="not_selected">Not selected</option>
          <option value="hired">Hired</option>
        </select>
      </label>
    </div>

    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">Close without saving</button>
      <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg bg-admin-green px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save interview sheet'}</button>
    </div>
  </div>
}
