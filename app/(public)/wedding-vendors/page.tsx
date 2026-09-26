import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/wedding-vendors","Upstate South Carolina Wedding Vendor Guide","Explore wedding vendor resources for Greenville and Upstate South Carolina while planning your rental equipment, celebration and event services.")

export default function WeddingVendorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Local Vendors We Recommend</h1>
      <p className="text-body mb-6">
        Planning a wedding takes more than tents and tables. While Friendly Party Rental
        handles your rentals, decor, and event equipment, we are often asked for
        recommendations on other parts of the day. Here are a few local Upstate South Carolina
        vendors we are happy to point our couples toward. We do not have formal
        partnerships with these businesses, they are simply local vendors whose work
        we respect. We would recommend contacting a couple of options in each category to
        compare pricing and availability for your date.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Catering</h2>
      <p className="text-body mb-6">
        <a href="https://www.reevescatering.com" target="_blank" rel="noopener noreferrer" className="underline">Reeves Catering</a> (Greenville) - full-service catering for
        weddings and events. 864-275-0021
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Bar Service</h2>
      <p className="text-body mb-6">
        <a href="https://southernlibationsevents.com" target="_blank" rel="noopener noreferrer" className="underline">Southern Libations</a> (Greenville) - dry-hire mobile bartending; you supply the
        alcohol, they supply the bar service. 864-906-8400
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">DJ / MC</h2>
      <p className="text-body mb-6">
        <a href="https://uptownentertainmentdj.com" target="_blank" rel="noopener noreferrer" className="underline">Uptown Entertainment</a> (Greenville) - wedding DJ, MC, and event production.
        864-275-4779
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Photography</h2>
      <p className="text-body mb-6">
        <a href="https://kendramartinphotography.com" target="_blank" rel="noopener noreferrer" className="underline">Kendra Martin Photography</a> (Greenville) - wedding and engagement photography.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Videography</h2>
      <p className="text-body mb-6">
        <a href="https://mpmweddings.com" target="_blank" rel="noopener noreferrer" className="underline">MPM Weddings</a> (Greenville) - cinematic wedding films.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Florist</h2>
      <p className="text-body mb-6">
        <a href="https://bellabloomsdesigns.com" target="_blank" rel="noopener noreferrer" className="underline">Bella Blooms</a> (Greenville) - fresh floral arrangements and bouquets.
        864-483-1453
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Cake / Dessert</h2>
      <p className="text-body mb-6">
        <a href="https://couturecakesofgreenville.com" target="_blank" rel="noopener noreferrer" className="underline">Couture Cakes of Greenville</a> (Greenville) - custom wedding cakes and dessert displays.
        864-288-6610
      </p>

      <div className="text-center">
        <p className="text-body mb-4">
          Prefer to have our team plan and coordinate everything for you instead? Ask us
          about full-service event planning when you call or text 864-610-5324.
        </p>
        <Link href="/event-planning" className="btn-accent">Learn About Event Planning</Link>
      </div>
    </div>
  )
}
