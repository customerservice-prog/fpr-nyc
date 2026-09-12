'use client'

import Link from 'next/link'
import { BUSINESS } from '@/lib/utils'

// Shown when the server determines an online booking cannot be completed
// (see the requiresAssistance response from /api/orders). Deliberately
// neutral - this page must NEVER say why, and must never mention
// restrictions, blocking, bans, or which field caused it. The customer's
// cart is intentionally left in place in sessionStorage (nothing here
// clears it) so staff can help them finish the booking over the phone
// without asking them to rebuild their cart from memory.
export default function CheckoutAssistancePage() {
    const telHref = 'tel:' + BUSINESS.phone.replace(/[^0-9+]/g, '')

  return (
        <div className="max-w-lg mx-auto px-4 py-16">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                      <h1 className="text-2xl font-bold text-dark mb-3">We need to assist you with this reservation</h1>
                      <p className="text-body mb-6">
                                We're unable to complete this booking online. Please call {BUSINESS.name} so our team can assist with your reservation.
                      </p>
                      <a href={telHref} className="btn-primary inline-block px-6 py-3 text-lg mb-3">
                                Call {BUSINESS.phone}
                      </a>
                      <p className="text-sm text-body mt-4">{BUSINESS.hours}</p>
                      <Link href="/" className="text-secondary text-sm hover:underline mt-6 inline-block">
                                Return to homepage
                      </Link>
              </div>
        </div>
      )
}
