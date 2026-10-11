import Link from 'next/link'

export default function TableChairPaidSearchHero() {
  return (
    <section className="bg-[#F8F6F3] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
          Riverdale, the Bronx & Lower Westchester
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-dark leading-tight mb-4">
          Table & Chair Rentals in Riverdale, NY
        </h1>
        <p className="text-base md:text-lg text-gray-700 max-w-3xl leading-relaxed">
          Rent tables and chairs for weddings, banquets, holiday parties, corporate events,
          school events, and family gatherings. Compare current rental options, check your
          event date, and build your order online with Friendly Party Rental.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link href="/order-by-date" prefetch={false} className="btn-primary inline-flex items-center justify-center px-5 py-3">Check My Date</Link>
          <a
            href="#table-chair-rental-inventory"
            className="inline-flex items-center justify-center rounded border border-primary px-5 py-3 font-semibold text-primary bg-white hover:bg-gray-50"
          >
            Browse Tables & Chairs
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
            <strong className="block text-dark">Tables for every setup</strong>
            Browse banquet, round, cocktail, and serving-table options.
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <strong className="block text-dark">Chair rental options</strong>
            Compare folding, resin, and specialty seating for your event.
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <strong className="block text-dark">Plan indoor or outdoor events</strong>
            Check your date and pair seating with linens, tents, or other rentals.
          </div>
        </div>
      </div>
    </section>
  )
}

