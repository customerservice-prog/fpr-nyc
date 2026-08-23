'use client'

import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BUSINESS } from '@/lib/utils'

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
    const { register, handleSubmit, reset, formState: { errors } } = useForm<EmploymentForm>()

  const onSubmit = async (data: EmploymentForm) => {
        try {
                const res = await fetch('/api/employment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data),
                })
                if (!res.ok) throw new Error('Failed')
                toast.success('Application submitted! We will contact you soon.')
                reset()
        } catch {
                toast.error('Failed to submit. Please email us directly.')
        }
  }

  return (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-dark mb-4 text-center">Join Our Team at Friendly Party Rental</h1>
        <p className="text-body text-center mb-6">
          Ready to join a dynamic team that creates memorable events? Friendly Party Rental is hiring! If you&apos;re passionate about
          providing exceptional customer service and making celebrations unforgettable, we want to hear from you.
                  </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-dark mb-3">Why Work at Friendly Party Rental?</h2>
                        <ul className="list-disc list-inside text-body space-y-1">
              <li>Exciting Work Environment</li>
              <li>Growth Opportunities</li>
              <li>Positive Team Culture</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-dark mb-3">Current Job Openings</h2>
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
        <a href={`mailto:${BUSINESS.email}`} className="text-secondary">{BUSINESS.email}</a>
      </p>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-dark mb-2">Apply Now</h2>
        <p className="text-body text-sm mb-6">Fill out the form below and we&apos;ll be in touch shortly!</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Full Name *</label>
            <input {...register('name', { required: true })} className="w-full border rounded px-3 py-2" />
{errors.name && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Phone Number *</label>
            <input type="tel" {...register('phone', { required: true })} className="w-full border rounded px-3 py-2" />
{errors.phone && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Email Address *</label>
            <input type="email" {...register('email', { required: true })} className="w-full border rounded px-3 py-2" />
{errors.email && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Position Applying For *</label>
            <select {...register('position', { required: true })} className="w-full border rounded px-3 py-2">
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
            <label className="block text-sm font-medium text-dark mb-1">Availability *</label>
            <select {...register('availability', { required: true })} className="w-full border rounded px-3 py-2">
              <option value="">-- Select --</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Weekends Only">Weekends Only</option>
              <option value="Flexible">Flexible</option>
            </select>
{errors.availability && <span className="text-red-500 text-xs">Required</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Relevant Experience</label>
            <textarea {...register('experience')} rows={3} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1">Why do you want to work with us?</label>
                          <textarea {...register('whyWorkWithUs')} rows={3} className="w-full border rounded px-3 py-2" />
          </div>
          <button type="submit" className="w-full bg-secondary text-dark font-bold py-3 rounded hover:opacity-90">
            Submit Application
          </button>
        </form>
        <p className="text-body text-xs text-center mt-4">We typically respond within 1-2 business days.</p>
      </div>
    </div>
  )
}
