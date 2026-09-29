import Link from 'next/link'
import { Phone, MessageCircle, ArrowLeft } from 'lucide-react'
import { BUSINESS } from '@/lib/utils'

/** An empty published category is valid, but must never imply stock or a price. */
export default function CategoryEmptyState({ name }: { name: string }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:py-14" data-nyc-catalog-state="awaiting-inventory">
      <Link href="/category" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> All rental categories
      </Link>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-7 sm:px-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Friendly Party Rental NYC</p>
          <h1 className="break-words text-3xl font-bold text-dark sm:text-4xl">{name}</h1>
          <p className="mt-3 text-gray-600">Riverdale, selected Bronx neighborhoods and Lower Westchester</p>
        </div>
        <div className="px-5 py-8 sm:px-8">
          <h2 className="text-xl font-bold text-dark">Contact us for current rental options</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-gray-700">
            No items are currently listed online in this category. Call or text our NYC team to confirm equipment, pricing and availability for your event.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            Please have your event date, delivery ZIP code and the rentals you need ready. An empty online listing does not confirm availability or mean that a date is sold out.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={`tel:${BUSINESS.phone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
              <Phone size={18} aria-hidden="true" /> Call {BUSINESS.phone}
            </a>
            <a href={`sms:${BUSINESS.text}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50">
              <MessageCircle size={18} aria-hidden="true" /> Text the NYC team
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
