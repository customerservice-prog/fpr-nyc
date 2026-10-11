import Link from 'next/link'

export default function BounceHousePaidSearchHero() {
  return (
    <section className="bg-[#F8F6F3] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
          Riverdale, the Bronx & Lower Westchester
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-dark leading-tight mb-4">
          Bounce House & Inflatable Rentals in Riverdale, NY
        </h1>
        <p className="text-base md:text-lg text-gray-700 max-w-3xl leading-relaxed">
          Rent bounce houses and inflatables for birthdays, school events, family parties,
          and community events. Compare current options, check your event date, and build
          your order online. Water-slide options remain available for warm-weather events.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link href="/order-by-date" prefetch={false} className="btn-primary inline-flex items-center justify-center px-5 py-3">Check My Date</Link>
          <a
            href="#bounce-house-rental-inventory"
            className="inline-flex items-center justify-center rounded border border-primary px-5 py-3 font-semibold text-primary bg-white hover:bg-gray-50"
          >
            Browse Bounce Houses
          </a>
          <a
            href="tel:+17182834593"
            className="inline-flex items-center justify-center rounded border border-gray-300 px-5 py-3 font-semibold text-dark bg-white hover:bg-gray-50"
          >
            Call 718-283-4593
          </a>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-6 text-sm text-gray-700">
          <div className="bg-white border rounded-lg px-4 py-3">
            <strong className="block text-dark">Bounce-house choices</strong>
            Compare current inflatable options for your event date and space.
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <strong className="block text-dark">Plan the setup first</strong>
            Confirm usable space, access, surface, power, and event timing before booking.
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <strong className="block text-dark">Season-aware inventory</strong>
            Water slides are available for appropriate warm-weather dates; bounce houses remain a separate rental option.
          </div>
        </div>
      </div>
    </section>
  )
}

