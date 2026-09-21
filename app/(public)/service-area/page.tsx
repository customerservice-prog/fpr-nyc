import Link from 'next/link'
import DeliveryFeeChecker from '@/components/public/DeliveryFeeChecker'
import ServiceAreaDirectory from '@/components/public/ServiceAreaDirectory'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rental Delivery Area',
  description: 'Friendly Party Rental delivers tents, bounce houses, tables, chairs, and linens throughout Greenville, Taylors, Greer, Simpsonville, Mauldin, Fountain Inn, and surrounding Upstate South Carolina communities.',
  alternates: { canonical: 'https://friendlypartyrentalsc.com/service-area' },
}


export default function ServiceAreaPage() {
  return (
    <><DeliveryFeeChecker/><div className="max-w-4xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-dark mb-8 text-center">
        Party Rental Delivery Area — Greenville, SC & Surrounding Cities
      </h2>

      <p className="text-body text-center mb-8 max-w-2xl mx-auto">
        Friendly Party Rental proudly delivers bounce houses, tents, tables, chairs, linens, and more throughout Upstate South Carolina. We serve the greater Greenville area and all nearby communities. Don't see your city? Call us — we may still deliver to you!
      </p>

      <div className="mb-8"><h2 className="text-lg font-bold text-dark mb-2">Local Rental Guides</h2><ul className="flex flex-wrap gap-4 text-sm"><li><Link href="/party-rentals-taylors-sc" className="text-primary hover:underline">Taylors, SC</Link></li><li><Link href="/party-rentals-piedmont-sc" className="text-primary hover:underline">Piedmont, SC</Link></li><li><Link href="/party-rentals-berea-sc" className="text-primary hover:underline">Berea, SC</Link></li><li><Link href="/party-rentals-simpsonville-sc" className="text-primary hover:underline">Simpsonville, SC</Link></li><li><Link href="/party-rentals-anderson-sc" className="text-primary hover:underline">Anderson, SC</Link></li><li><Link href="/party-rentals-spartanburg-sc" className="text-primary hover:underline">Spartanburg, SC</Link></li><li><Link href="/party-rentals-travelers-rest-sc" className="text-primary hover:underline">Travelers Rest, SC</Link></li><li><Link href="/party-rentals-fountain-inn-sc" className="text-primary hover:underline">Fountain Inn, SC</Link></li><li><Link href="/party-rentals-mauldin-sc" className="text-primary hover:underline">Mauldin, SC</Link></li><li><Link href="/party-rentals-duncan-sc" className="text-primary hover:underline">Duncan, SC</Link></li><li><Link href="/party-rentals-powdersville-sc" className="text-primary hover:underline">Powdersville, SC</Link></li><li><Link href="/party-rentals-williamston-sc" className="text-primary hover:underline">Williamston, SC</Link></li><li><Link href="/party-rentals-pelzer-sc" className="text-primary hover:underline">Pelzer, SC</Link></li><li><Link href="/party-rentals-pickens-sc" className="text-primary hover:underline">Pickens, SC</Link></li><li><Link href="/party-rentals-liberty-sc" className="text-primary hover:underline">Liberty, SC</Link></li></ul></div><ServiceAreaDirectory/>

      <div className="text-center mb-8">
        <p className="text-body mb-6">Not sure if we deliver to your area? Give us a call at 864-610-5324 or text us and we'll let you know right away. Delivery fees may vary by distance.</p>
        <h2 className="text-2xl font-bold text-dark mb-2">Ready to Book Your Party?</h2>
        <p className="text-body mb-4">Browse our full inventory of bounce houses, tents, tables, chairs, linens &amp; more — delivered right to your door across Upstate South Carolina.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/category/bounce-house-rentals" className="btn-primary">Browse Bounce Houses</Link>
        <Link href="/category/tent-rentals" className="btn-primary">Browse Tents</Link>
        <Link href="/order-by-date" className="btn-accent">Book Now</Link>
      </div>
    </div></>
  )
}
