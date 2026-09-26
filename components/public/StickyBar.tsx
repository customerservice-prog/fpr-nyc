'use client'

import Link from 'next/link'
import { useState } from 'react'
import { X } from 'lucide-react'
import { BUSINESS } from '@/lib/utils'

export default function StickyBar() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1a] py-3 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 relative">
        <Link
          href="/order-by-date"
          prefetch={false}
          className="bg-secondary text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors flex-1 max-w-xs text-center"
        >
          Book Now
        </Link>
        <a
          href={`tel:${BUSINESS.phone}`}
          className="bg-accent text-white px-6 py-2 rounded font-medium hover:bg-orange-600 transition-colors flex-1 max-w-xs text-center"
        >
          Call Us
        </a>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close"
          className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-1"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
