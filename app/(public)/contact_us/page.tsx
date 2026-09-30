'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { BUSINESS } from '@/lib/utils'
import { trackEvent } from '@/lib/gtag'
import { nycEmailHref } from '@/lib/nycEmail'
import { NYC_SERVICE_MAP_EMBED_URL, nycCalendarDay, nycContactOutcome, nycGoogleProfileHref } from '@/lib/nycCustomerHelp'

interface ContactForm { name: string; email: string; phone: string; eventDate: string; message: string; website?: string }
interface Receipt { emailHref: string; notificationSent: boolean }

export default function ContactPage() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isValid } } = useForm<ContactForm>({ mode: 'onChange' })
  const startTimeRef = useRef(Date.now())
  const requestInFlight = useRef(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [today, setToday] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const profileHref = nycGoogleProfileHref(BUSINESS.googleProfile)

  useEffect(() => {
    const refreshDay = () => setToday(nycCalendarDay())
    refreshDay()
    const timer = window.setInterval(refreshDay, 60000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { if (receipt) receiptRef.current?.focus() }, [receipt])

  const onSubmit = async (data: ContactForm) => {
    if (requestInFlight.current || receipt) return
    requestInFlight.current = true
    setSubmitError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, elapsedMs: Date.now() - startTimeRef.current }),
      })
      const payload: unknown = await response.json()
      const outcome = nycContactOutcome(response.status, payload)
      if (outcome === 'unconfirmed') {
        setSubmitError(response.status === 429
          ? 'Please wait before trying again, or contact the NYC team by phone or email. Your details are still in the form.'
          : 'We could not confirm that your inquiry was saved. Your details are still in the form. Please call or email the NYC team for help.')
        return
      }
      // Build the optional mail link from known NYC identity, never an arbitrary response URL.
      setReceipt({
        notificationSent: outcome === 'received',
        emailHref: nycEmailHref(`Rental inquiry from ${data.name.trim()}`, `Name: ${data.name.trim()}\nEmail: ${data.email.trim()}\nPhone: ${data.phone || ''}\nEvent date: ${data.eventDate || ''}\n\n${data.message}`),
      })
      trackEvent('contact')
    } catch {
      setSubmitError('We could not confirm receipt of your inquiry. Your details are still in the form. Please call or email the NYC team rather than sending the same request repeatedly.')
    } finally { requestInFlight.current = false }
  }

  const startAnotherInquiry = () => {
    reset()
    setReceipt(null)
    setSubmitError(null)
    startTimeRef.current = Date.now()
  }

  return <div data-nyc-customer-help="contact" className="mx-auto max-w-7xl px-4 py-12">
    <h1 className="mb-3 text-center text-3xl font-bold text-dark">Contact the NYC Team</h1>
    <p className="mx-auto mb-8 max-w-2xl text-center leading-7 text-body">Tell us about your event in Riverdale, the Bronx or Lower Westchester. We can review your date, site and rental needs with you.</p>
    <div className="grid gap-10 md:grid-cols-2 md:gap-12">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="contact-options">
          <h2 id="contact-options" className="mb-4 text-xl font-bold text-dark">Get in Touch</h2>
          <div className="mb-4 flex flex-wrap gap-3">
            <a href={`tel:${BUSINESS.phone}`} className="btn-primary inline-flex min-h-12 items-center justify-center px-5">Call {BUSINESS.phone}</a>
            <a href={`sms:${BUSINESS.text}`} className="inline-flex min-h-12 items-center justify-center rounded border px-5 font-semibold text-dark">Text the NYC team</a>
          </div>
          <p className="mb-2 break-words text-body">Email: <a href={BUSINESS.emailHref} className="break-all text-secondary underline">{BUSINESS.email}</a></p>
          <p className="mb-2 text-body">Hours: {BUSINESS.hours}</p>
          {profileHref && <p className="mb-2 text-body"><a href={profileHref} target="_blank" rel="noopener noreferrer" className="text-secondary underline">View Friendly Party Rental NYC on Google</a></p>}
          <p data-testid="nyc-service-area" className="text-body">Serving {BUSINESS.serviceArea}. Delivery only—customer warehouse pickup is not available.</p>
          <Link href="/service-area" className="mt-2 inline-block py-2 font-semibold text-secondary underline">Check our NYC delivery areas</Link>
        </section>
        <section aria-labelledby="contact-map">
          <h2 id="contact-map" className="mb-3 text-xl font-bold text-dark">Riverdale, Bronx Service Area</h2>
          <p className="mb-3 text-sm leading-6 text-body">This map highlights Riverdale in the Bronx, New York. It is not a customer pickup or showroom address. Send your exact event address and ZIP code for review.</p>
          <div className="overflow-hidden rounded-xl border"><iframe title="Riverdale, Bronx, New York service-area map" src={NYC_SERVICE_MAP_EMBED_URL} width="100%" height="250" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        </section>
        <section aria-labelledby="contact-plan">
          <h2 id="contact-plan" className="mb-3 text-xl font-bold text-dark">Plan Before You Book</h2>
          <p className="text-sm leading-6 text-body">Browse the NYC catalog or check your event date, then confirm the selected equipment, delivery arrangements and final total. When an item, price or online payment option is unavailable, contact us before making a payment. Sending an inquiry does not reserve equipment.</p>
          <div className="mt-2 flex flex-wrap gap-x-5"><Link href="/category" className="py-2 font-semibold text-secondary underline">Browse rentals</Link><Link href="/frequently_asked_questions" className="py-2 font-semibold text-secondary underline">Rental questions</Link></div>
        </section>
      </div>
      <section aria-labelledby="contact-form-title" className="min-w-0 rounded-xl border bg-gray-50 p-5 sm:p-6">
        <h2 id="contact-form-title" className="mb-3 text-xl font-bold text-dark">Send an Event Inquiry</h2>
        <p className="mb-3 text-sm leading-6 text-body">Include your exact event address and ZIP code, requested items and quantities, setup surface, measurements and any access restrictions. For an existing NYC order, include your order number.</p>
        <p className="mb-6 text-sm leading-6 text-body">Our customer-service inbox is shared; NYC email links are labeled [NYC / Downstate]. Do not include card details or passwords. For time-sensitive requests, please call.</p>
        {receipt ? <div ref={receiptRef} tabIndex={-1} data-testid="contact-receipt" className="rounded-xl border bg-white p-5 focus:outline-none" role="status">
          <h3 className="text-lg font-bold text-dark">Your NYC inquiry is saved</h3>
          <p className="mt-2 text-sm leading-6 text-body">This is an inquiry, not a confirmed reservation or payment. You do not need to submit the same form again.</p>
          {!receipt.notificationSent && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-6">The inquiry was saved, but its email notification was not delivered. Please call or email the NYC team directly for help.</p>}
          <div className="mt-4 flex flex-wrap gap-3"><a href={`tel:${BUSINESS.phone}`} className="inline-flex min-h-12 items-center font-bold text-secondary underline">Call {BUSINESS.phone}</a><a href={receipt.emailHref} className="inline-flex min-h-12 items-center font-bold text-secondary underline">Email your inquiry directly</a></div>
          <button type="button" onClick={startAnotherInquiry} className="mt-4 min-h-12 rounded border px-4 text-sm font-semibold text-dark">Start a different inquiry</button>
        </div> : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && <div role="alert" data-testid="contact-submit-error" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm leading-6">{submitError}<a href={BUSINESS.emailHref} className="mt-2 block font-semibold underline">Email the NYC team directly</a></div>}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true"><label htmlFor="website">Website</label><input type="text" id="website" tabIndex={-1} autoComplete="off" {...register('website')} /></div>
          <div><label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-dark">Name *</label><input id="contact-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'contact-name-error' : undefined} {...register('name', { required: true, validate: value => value.trim().length >= 2 })} className="w-full rounded border px-3 py-3" />{errors.name && <p id="contact-name-error" className="mt-1 text-sm text-red-700">Please enter your name.</p>}</div>
          <div><label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-dark">Email *</label><input id="contact-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'contact-email-error' : undefined} {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} className="w-full rounded border px-3 py-3" />{errors.email && <p id="contact-email-error" className="mt-1 text-sm text-red-700">Please enter a valid email address.</p>}</div>
          <div><label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-dark">Phone</label><input id="contact-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'contact-phone-error' : undefined} {...register('phone', { pattern: /^[0-9+()\-.\s]{7,20}$/ })} className="w-full rounded border px-3 py-3" />{errors.phone && <p id="contact-phone-error" className="mt-1 text-sm text-red-700">Please enter a valid phone number.</p>}</div>
          <div><label htmlFor="contact-date" className="mb-1 block text-sm font-medium text-dark">Event Date</label><input id="contact-date" type="date" min={today || undefined} aria-invalid={!!errors.eventDate} aria-describedby="contact-date-help" {...register('eventDate', { validate: value => !value || value >= nycCalendarDay() || 'Choose today or a future date in New York.' })} className="min-w-0 max-w-full w-full rounded border px-3 py-3" /><p id="contact-date-help" className={`mt-1 text-sm ${errors.eventDate ? 'text-red-700' : 'text-body'}`}>{errors.eventDate?.message || 'Event dates use New York local time.'}</p></div>
          <div><label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-dark">Event Details *</label><textarea id="contact-message" aria-invalid={!!errors.message} aria-describedby={errors.message ? 'contact-message-error' : undefined} {...register('message', { required: true, validate: value => value.trim().length >= 10 })} rows={6} className="w-full rounded border px-3 py-3" />{errors.message && <p id="contact-message-error" className="mt-1 text-sm text-red-700">Please include at least 10 characters of event details.</p>}</div>
          <button type="submit" disabled={isSubmitting || !isValid} className="btn-primary min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Saving inquiry...' : 'Send inquiry'}</button>
        </form>}
      </section>
    </div>
  </div>
}
