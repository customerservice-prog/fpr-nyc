'use client'

import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BUSINESS } from '@/lib/utils'
import { trackEvent } from '@/lib/gtag'

interface ContactForm {
  name: string
  email: string
  phone: string
  eventDate: string
  message: string
}

export default function ContactPage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>()

  const onSubmit = async (data: ContactForm) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Message sent! We will get back to you soon.')
      trackEvent('contact')
      trackEvent('ads_conversion_Contact_Us_1')
      reset()
    } catch {
      toast.error('Failed to send message. Please call us directly.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-8 text-center">Contact Us</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-dark mb-4">Get in Touch</h2>
            <p className="text-body mb-2">
              Phone: <a href={`tel:${BUSINESS.phone}`} className="text-secondary">{BUSINESS.phone}</a>
            </p>
            <p className="text-body mb-2">
              Email: <a href={`mailto:${BUSINESS.email}`} className="text-secondary">{BUSINESS.email}</a>
            </p>
            <p className="text-body mb-2">Hours: {BUSINESS.hours}</p>
            <p className="text-body">
              Address: {BUSINESS.address} (showroom by appointment)
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark mb-3">Our Location</h2>
            <div className="rounded-lg overflow-hidden border">
              <iframe
                title="Friendly Party Rental location map"
                src="https://www.google.com/maps?q=Greenville,+SC&output=embed"
                width="100%"
                height="250"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark mb-3">How to Book</h2>
            <p className="text-body text-sm">
              The fastest way to book is through our Order by Date calendar. Select your event date, browse available items, and complete checkout online in minutes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark mb-3">What to Include</h2>
            <p className="text-body text-sm">
              When contacting us, please include your event date, location, items you need, and any special requirements so we can assist you quickly.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-dark mb-3">Why Customers Choose Us</h2>
            <p className="text-body text-sm">
              Friendly Party Rental is a family-owned business with over 10 years of experience serving Greenville and Upstate South Carolina. We provide clean, event-ready equipment, dependable delivery, and friendly local service that makes event planning simple and stress-free.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-dark mb-6">Send Us a Message</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Name *</label>
              <input {...register('name', { required: true })} className="w-full border rounded px-3 py-2" />
              {errors.name && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Email *</label>
              <input type="email" {...register('email', { required: true })} className="w-full border rounded px-3 py-2" />
              {errors.email && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Phone</label>
              <input type="tel" {...register('phone')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Event Date</label>
              <input type="date" {...register('eventDate')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Message *</label>
              <textarea {...register('message', { required: true })} rows={5} className="w-full border rounded px-3 py-2" />
              {errors.message && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <button type="submit" className="btn-primary w-full">Submit</button>
          </form>
        </div>
      </div>
    </div>
  )
}
