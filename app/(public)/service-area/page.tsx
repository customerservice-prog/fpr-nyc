import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rental Delivery Area',
  description: 'Friendly Party Rental delivers tents, bounce houses, tables, chairs, and linens throughout Greenville, Taylors, Greer, Simpsonville, Mauldin, Fountain Inn, and surrounding Upstate South Carolina communities.',
  alternates: { canonical: 'https://friendlypartyrentalsc.com/service-area' },
}

const serviceAreas = [
  {
    region: 'Greenville Metro',
    cities: [
      'Greenville (29601, 29602, 29603, 29604, 29605, 29606, 29607, 29608, 29609, 29611, 29612, 29613, 29614, 29615, 29617)',
      'Taylors (29687)',
      'Piedmont (29673)',
      'Berea (29617)',
      'Simpsonville (29680)',
      'Anderson (29621)',
      'Spartanburg (29301)',
      'Travelers Rest (29690)',
      'Fountain Inn (29644)',
      'Mauldin (29662)',
      'Duncan (29334)',
      'Powdersville (29642)',
    ],
  },
  {
    region: 'Eastern Suburbs',
    cities: [
      'Williamston (29697)',
      'Pelzer (29669)',
      'Pickens (29671)',
      'Liberty (29657)',
      'Seneca (29678)',
      'Laurens (29360)',
      'Greer (29650)',
      'Easley (29640)',
    ],
  },
  {
    region: 'Southern & Western',
    cities: [
      'Clemson (29631)',
      'Woodruff (29388)',
      'Boiling Springs (29316)',
      'Inman (29349)',
      'Landrum (29356)',
      'Gray Court (29645)',
      'Central (29630)',
      'Six Mile (29682)',
      'Belton (29627)',
    ],
  },
  {
    region: 'Northern',
    cities: [
      'Honea Path (29654)',
      'Marietta (29661)',
      'Wade Hampton (29609)',
      'Judson (29611)',
      'Parker (29609)',
      'Gantt (29605)',
    ],
  },
]

export default function ServiceAreaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-8 text-center">
        Party Rental Delivery Area — Greenville, SC & Surrounding Cities
      </h1>

      <p className="text-body text-center mb-8 max-w-2xl mx-auto">
        Friendly Party Rental proudly delivers bounce houses, tents, tables, chairs, linens, and more throughout Upstate South Carolina. We serve the greater Greenville area and all nearby communities. Don't see your city? Call us — we may still deliver to you!
      </p>

      <div className="mb-8"><h2 className="text-lg font-bold text-dark mb-2">Local Rental Guides</h2><ul className="flex flex-wrap gap-4 text-sm"><li><Link href="/party-rentals-taylors-sc" className="text-primary hover:underline">Taylors, SC</Link></li><li><Link href="/party-rentals-piedmont-sc" className="text-primary hover:underline">Piedmont, SC</Link></li><li><Link href="/party-rentals-berea-sc" className="text-primary hover:underline">Berea, SC</Link></li><li><Link href="/party-rentals-simpsonville-sc" className="text-primary hover:underline">Simpsonville, SC</Link></li><li><Link href="/party-rentals-anderson-sc" className="text-primary hover:underline">Anderson, SC</Link></li><li><Link href="/party-rentals-spartanburg-sc" className="text-primary hover:underline">Spartanburg, SC</Link></li><li><Link href="/party-rentals-travelers-rest-sc" className="text-primary hover:underline">Travelers Rest, SC</Link></li><li><Link href="/party-rentals-fountain-inn-sc" className="text-primary hover:underline">Fountain Inn, SC</Link></li><li><Link href="/party-rentals-mauldin-sc" className="text-primary hover:underline">Mauldin, SC</Link></li><li><Link href="/party-rentals-duncan-sc" className="text-primary hover:underline">Duncan, SC</Link></li><li><Link href="/party-rentals-powdersville-sc" className="text-primary hover:underline">Powdersville, SC</Link></li><li><Link href="/party-rentals-williamston-sc" className="text-primary hover:underline">Williamston, SC</Link></li><li><Link href="/party-rentals-pelzer-sc" className="text-primary hover:underline">Pelzer, SC</Link></li><li><Link href="/party-rentals-pickens-sc" className="text-primary hover:underline">Pickens, SC</Link></li><li><Link href="/party-rentals-liberty-sc" className="text-primary hover:underline">Liberty, SC</Link></li></ul></div><div className="space-y-8 mb-12">
        {serviceAreas.map((area) => (
          <div key={area.region}>
            <h2 className="text-xl font-bold text-dark mb-3 border-b border-primary pb-2">
              {area.region}
            </h2>
            <ul className="grid md:grid-cols-2 gap-2">
              {area.cities.map((city) => (
                <li key={city} className="text-body text-sm">{city}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center mb-8">
        <p className="text-body mb-6">Not sure if we deliver to your area? Give us a call at 315-884-1498 or text us and we'll let you know right away. Delivery fees may vary by distance.</p>
        <h2 className="text-2xl font-bold text-dark mb-2">Ready to Book Your Party?</h2>
        <p className="text-body mb-4">Browse our full inventory of bounce houses, tents, tables, chairs, linens &amp; more — delivered right to your door across Upstate South Carolina.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/category/bounce-house-rentals" className="btn-primary">Browse Bounce Houses</Link>
        <Link href="/category/tent-rentals" className="btn-primary">Browse Tents</Link>
        <Link href="/order-by-date" className="btn-accent">Book Now</Link>
      </div>
    </div>
  )
}
