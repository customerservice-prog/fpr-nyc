import Link from 'next/link'
import { getHomepagePopularItems } from '@/lib/homepageMerchandising'

export default async function PopularRentalsShared() {
  let items: Awaited<ReturnType<typeof getHomepagePopularItems>> = []
  try {
    items = await getHomepagePopularItems(12)
  } catch (error) {
    console.error('Greenville Popular Rentals page failed:', error)
  }

  return <section className="mx-auto max-w-6xl px-4 py-10" data-sc-popular-rentals="booking-history-v1">
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C85F00]">Recent Greenville booking history</p>
        <h1 className="mt-2 text-3xl font-bold text-dark md:text-4xl">Popular Party Rentals in Greenville, SC</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-body">These rentals are ranked from distinct qualifying Greenville bookings during the previous 12 months, with category limits so one product type does not dominate the list. Popularity does not guarantee availability for your date.</p>
      </div>
      <Link href="/order-by-date" prefetch={false} className="btn-primary inline-flex min-h-12 items-center justify-center px-5 py-3 text-sm font-bold">Check My Event Date</Link>
    </div>
    {items.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map(item => <Link key={item.id} href={'/items/'+item.slug} prefetch={false} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="aspect-square overflow-hidden bg-gray-50">
          <img src={item.picture || '/images/order-by-date.png'} alt={item.specialDisplayName || item.name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy"/>
        </div>
        <div className="p-3">
          <div className="text-sm font-semibold leading-snug text-dark">{item.specialDisplayName || item.name}</div>
          <div className="mt-1 text-sm text-body">${Number(item.cost || 0).toFixed(2)} / day</div>
        </div>
      </Link>)}
    </div> : <div className="rounded-xl border bg-gray-50 p-6 text-sm text-body">
      Popular-rental rankings are not available right now. <Link href="/category" className="font-semibold underline">Browse the full Greenville catalog</Link>.
    </div>}
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href="/category" prefetch={false} className="rounded-xl border px-5 py-3 text-sm font-bold text-dark">Browse All Rentals</Link>
      <Link href="/service-area" prefetch={false} className="rounded-xl border px-5 py-3 text-sm font-bold text-dark">Delivery Areas &amp; Fee Checker</Link>
    </div>
  </section>
}
