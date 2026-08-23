import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Local Wedding Vendors We Recommend',
  description: 'A short list of local Central New York wedding vendors that Friendly Party Rental is happy to recommend.',
  alternates: {
    canonical: 'https://www.friendlypartyrental.com/wedding-vendors',
  },
  robots: { index: true, follow: true },
}

export default function WeddingVendorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Local Vendors We Recommend</h1>
      <p className="text-body mb-6">
        Planning a wedding takes more than tents and tables. While Friendly Party Rental
        handles your rentals, decor, and event equipment, we are often asked for
        recommendations on other parts of the day. Here are a few local Central New York
        vendors we are happy to point our couples toward. We do not have formal
        partnerships with these businesses, they are simply local vendors whose work
        we respect. We would recommend contacting a couple of options in each category to
        compare pricing and availability for your date.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Catering</h2>
      <p className="text-body mb-6">
        <a href="https://www.scratchfarmhousecatering.com" target="_blank" rel="noopener noreferrer" className="underline">Scratch Farmhouse Catering</a> (Skaneateles Junction) - farm-to-table catering for
        weddings and events. 315-730-5708
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Bar Service</h2>
      <p className="text-body mb-6">
        <a href="https://www.msmixermb.com" target="_blank" rel="noopener noreferrer" className="underline">Ms Mixer Mobile Bar</a> (Liverpool) - dry-hire mobile bartending; you supply the
        alcohol, they supply the bar service. 315-706-7725
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">DJ / MC</h2>
      <p className="text-body mb-6">
        <a href="https://www.scsoundmachine.com" target="_blank" rel="noopener noreferrer" className="underline">Salt City Sound Machine</a> (Syracuse) - wedding DJ, MC, and event coordination.
        315-558-0272
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Photography</h2>
      <p className="text-body mb-6">
        <a href="https://www.aliciapiercephotography.com" target="_blank" rel="noopener noreferrer" className="underline">Alicia Pierce Photography</a> (Baldwinsville) - wedding and engagement photography.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Videography</h2>
      <p className="text-body mb-6">
        <a href="https://www.jmayervideo.com" target="_blank" rel="noopener noreferrer" className="underline">Mayer Video</a> (Skaneateles) - cinematic wedding films.
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Florist</h2>
      <p className="text-body mb-6">
        <a href="https://www.whistlestopflorist.com" target="_blank" rel="noopener noreferrer" className="underline">Whistlestop Florist</a> (East Syracuse) - fresh floral arrangements and bouquets.
        315-656-2236
      </p>

      <h2 className="text-xl font-bold text-dark mb-3">Cake / Dessert</h2>
      <p className="text-body mb-6">
        <a href="https://www.sugarblossomcakeshop.com" target="_blank" rel="noopener noreferrer" className="underline">Sugar Blossom Cake Shop</a> (Liverpool) - custom wedding cakes and dessert displays.
        315-214-5637
      </p>

      <div className="text-center">
        <p className="text-body mb-4">
          Prefer to have our team plan and coordinate everything for you instead? Ask us
          about full-service event planning when you call or text 315-884-1498.
        </p>
        <Link href="/event-planning" className="btn-accent">Learn About Event Planning</Link>
      </div>
    </div>
  )
}
