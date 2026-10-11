'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BUSINESS } from '@/lib/utils'
import { nycEmailHref } from '@/lib/nycEmail'

interface EmploymentForm {
    name: string
    phone: string
    email: string
    position: string
    availability: string
    experience: string
    whyWorkWithUs: string
    message: string
}

const OPENINGS = ['Event Coordinator', 'Delivery Driver', 'Customer Service Representative', 'Event Setup Crew']

export default function EmploymentPage() {
    const [directEmail,setDirectEmail] = useState<string|null>(null)
    const [applicationSaved, setApplicationSaved] = useState(false)
    const [submitError, setSubmitError] = useState<string|null>(null)
    const requestInFlight = useRef(false)
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmploymentForm>()

  const onSubmit = async (data: EmploymentForm) => {
        if (requestInFlight.current || applicationSaved) return
        requestInFlight.current = true
        setSubmitError(null)
        try {
                const res = await fetch('/api/employment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data),
                })
                const result = await res.json()
                if (!res.ok || result.success !== true || result.saved !== true) throw new Error('Failed')
                setApplicationSaved(true)
                if (result.notificationSent === false) { setDirectEmail(nycEmailHref('Employment application - ' + data.name)); toast('Application saved. Email us directly to notify the Riverdale team.'); return }
                setDirectEmail(null)
                toast.success('Application submitted! We will contact you soon.')
                reset()
        } catch {
                setSubmitError('We could not confirm receipt of your application. Your details are still in the form. Please call or email the Riverdale team for help.')
        } finally { requestInFlight.current = false }
  }

  return (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-dark mb-4 text-center">Join Our Team at Friendly Party Rental NYC</h1>
        <p className="text-body text-center mb-6">
          Ready to join the team serving Riverdale, the Bronx and Lower Westchester? If you&apos;re passionate about
          providing exceptional customer service and making celebrations unforgettable, we want to hear from you.
                  </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-dark mb-3">Why Work at Friendly Party Rental NYC?</h2>
                        <ul className="list-disc list-inside text-body space-y-1">
              <li>Exciting Work Environment</li>
              <li>Growth Opportunities</li>
              <li>Positive Team Culture</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-dark mb-3">Roles You Can Apply For</h2>
            <ul className="list-disc list-inside text-body space-y-1">
  {OPENINGS.map((job) => (
                  <li key={job}>{job}</li>
                ))}
            </ul>
          </div>
        </div>

      <p className="text-body text-center mb-8">
          Questions? Contact us at{' '}
          <a href={`tel:${BUSINESS.phone}`} className="text-secondary">{BUSINESS.phone}</a>
{' or '}
        <a href={BUSINESS.emailHref} className="text-secondary">{BUSINESS.email}</a>
      </p>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-dark mb-2">Apply Now</h2>
        <p className="text-body text-sm mb-6">Tell us about your experience and availability. Our Riverdale team can confirm current openings.</p>
        {applicationSaved && !directEmail && <p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm">Your Riverdale application is saved. You do not need to submit it again.</p>}
        {submitError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm">{submitError} <a href={BUSINESS.emailHref} className="font-bold underline">Email the NYC team</a>.</p>}
        <div>{directEmail && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm">Your application is saved, but its email notification was not delivered. <a href={directEmail} className="font-bold underline">Email the NYC / Downstate team</a>.</p>}</div><form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="employment-name" className="block text-sm font-medium text-dark mb-1">Full Name *</label>
            <input id="employment-name" autoComplete="name" aria-invalid={!!errors.name} {...register('name', { required: true, validate: value => value.trim().length >= 2 })} className="w-full border rounded px-3 py-2" />
{errors.name && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label htmlFor="employment-phone" className="block text-sm font-medium text-dark mb-1">Phone Number *</label>
            <input id="employment-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone', { required: true, pattern: /^[0-9+()\-.\s]{7,20}$/ })} className="w-full border rounded px-3 py-2" />
{errors.phone && <span className="text-red-500 text-xs">Please enter a valid phone number.</span>}
          </div>
          <div>
            <label htmlFor="employment-email" className="block text-sm font-medium text-dark mb-1">Email Address *</label>
            <input id="employment-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} className="w-full border rounded px-3 py-2" />
{errors.email && <span className="text-red-500 text-xs">Please enter a valid email address.</span>}
          </div>
          <div>
            <label htmlFor="employment-position" className="block text-sm font-medium text-dark mb-1">Position Applying For *</label>
            <select id="employment-position" aria-invalid={!!errors.position} {...register('position', { required: true })} className="w-full border rounded px-3 py-2">
              <option value="">-- Select a Position --</option>
              <option value="Delivery Driver">Delivery Driver</option>
              <option value="Event Setup Crew">Event Setup Crew</option>
              <option value="Event Coordinator">Event Coordinator</option>
              <option value="Customer Service Rep">Customer Service Rep</option>
              <option value="Bounce House Attendant">Bounce House Attendant</option>
              <option value="General / Any Position">General / Any Position</option>
            </select>
{errors.position && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label htmlFor="employment-availability" className="block text-sm font-medium text-dark mb-1">Availability *</label>
            <select id="employment-availability" aria-invalid={!!errors.availability} {...register('availability', { required: true })} className="w-full border rounded px-3 py-2">
              <option value="">-- Select --</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Weekends Only">Weekends Only</option>
              <option value="Flexible">Flexible</option>
            </select>
{errors.availability && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label htmlFor="employment-experience" className="block text-sm font-medium text-dark mb-1">Relevant Experience</label>
            <textarea id="employment-experience" {...register('experience')} rows={3} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label htmlFor="employment-why" className="block text-sm font-medium text-dark mb-1">Why do you want to work with us?</label>
                          <textarea id="employment-why" {...register('whyWorkWithUs')} rows={3} className="w-full border rounded px-3 py-2" />
          </div>
          <button type="submit" disabled={isSubmitting || applicationSaved} className="w-full bg-secondary text-dark font-bold py-3 rounded hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {applicationSaved ? 'Application Saved' : isSubmitting ? 'Saving Application…' : 'Submit Application'}
          </button>
        </form>
        <p className="text-body text-xs text-center mt-4">Questions about your application? Call or email our Riverdale team.</p>
      </div>
    </div>
  )
}
