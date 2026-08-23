import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Party Rental Delivery Area',
  description: 'Friendly Party Rental delivers tents, bounce houses, tables, chairs, and linens throughout Syracuse, Minoa, Cicero, Manlius, Camillus, Liverpool, and surrounding Central New York communities.',
  alternates: { canonical: 'https://www.friendlypartyrental.com/service-area' },
}

const serviceAreas = [
  {
    region: 'Syracuse Metro',
    cities: [
      'Syracuse (13201, 13202, 13203, 13204, 13205, 13206, 13207, 13208, 13209, 13210, 13211, 13212, 13214, 13215, 13219, 13224)',
      'Minoa (13116)',
      'East Syracuse (13057)',
      'DeWitt (13214)',
      'Manlius (13104)',
      'Fayetteville (13066)',
      'Chittenango (13037)',
      'Baldwinsville (13027)',
      'Liverpool (13088, 13090)',
      'Camillus (13031)',
      'Salina (13088)',
      'North Syracuse (13212)',
    ],
  },
  {
    region: 'Eastern Suburbs',
    cities: [
      'Cazenovia (13035)',
      'Canastota (13032)',
      'Oneida (13421)',
      'Bridgeport (13030)',
      'Kirkville (13082)',
      'Lyncourt (13212)',
      'Cicero (13039)',
      'Clay (13041)',
    ],
  },
  {
    region: 'Southern & Western',
    cities: [
      'Skaneateles (13152)',
      'Auburn (13021)',
      'Marcellus (13108)',
      'LaFayette (13084)',
      'Tully (13159)',
      'Jamesville (13078)',
      'Nedrow (13120)',
      'Onondaga Hill (13215)',
      'Westvale (13219)',
    ],
  },
  {
    region: 'Northern',
    cities: [
      'Oswego (13126)',
      'Fulton (13069)',
      'Phoenix (13135)',
      'Brewerton (13029)',
      'Central Square (13036)',
      'Lacona (13083)',
    ],
  },
]

export default function ServiceAreaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-8 text-center">
        Party Rental Delivery Area — Syracuse, NY & Surrounding Cities
      </h1>

      <p className="text-body text-center mb-8 max-w-2xl mx-auto">
        Friendly Party Rental proudly delivers bounce houses, tents, tables, chairs, linens, and more throughout Central New York. We serve the greater Syracuse area and all nearby communities. Don't see your city? Call us — we may still deliver to you!
      </p>

      <div className="mb-8"><h2 className="text-lg font-bold text-dark mb-2">Local Rental Guides</h2><ul className="flex flex-wrap gap-4 text-sm"><li><Link href="/party-rentals-cicero-ny" className="text-primary hover:underline">Cicero, NY</Link></li><li><Link href="/party-rentals-manlius-ny" className="text-primary hover:underline">Manlius, NY</Link></li><li><Link href="/party-rentals-camillus-ny" className="text-primary hover:underline">Camillus, NY</Link></li><li><Link href="/party-rentals-clay-ny" className="text-primary hover:underline">Clay, NY</Link></li><li><Link href="/party-rentals-baldwinsville-ny" className="text-primary hover:underline">Baldwinsville, NY</Link></li><li><Link href="/party-rentals-liverpool-ny" className="text-primary hover:underline">Liverpool, NY</Link></li><li><Link href="/party-rentals-minoa-ny" className="text-primary hover:underline">Minoa, NY</Link></li><li><Link href="/party-rentals-east-syracuse-ny" className="text-primary hover:underline">East Syracuse, NY</Link></li><li><Link href="/party-rentals-dewitt-ny" className="text-primary hover:underline">DeWitt, NY</Link></li><li><Link href="/party-rentals-fayetteville-ny" className="text-primary hover:underline">Fayetteville, NY</Link></li><li><Link href="/party-rentals-chittenango-ny" className="text-primary hover:underline">Chittenango, NY</Link></li><li><Link href="/party-rentals-salina-ny" className="text-primary hover:underline">Salina, NY</Link></li><li><Link href="/party-rentals-north-syracuse-ny" className="text-primary hover:underline">North Syracuse, NY</Link></li><li><Link href="/party-rentals-cazenovia-ny" className="text-primary hover:underline">Cazenovia, NY</Link></li><li><Link href="/party-rentals-canastota-ny" className="text-primary hover:underline">Canastota, NY</Link></li><li><Link href="/party-rentals-oneida-ny" className="text-primary hover:underline">Oneida, NY</Link></li><li><Link href="/party-rentals-bridgeport-ny" className="text-primary hover:underline">Bridgeport, NY</Link></li></ul></div><div className="space-y-8 mb-12">
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
        <p className="text-body mb-4">Browse our full inventory of bounce houses, tents, tables, chairs, linens &amp; more — delivered right to your door across Central New York.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/category/bounce-house-rentals" className="btn-primary">Browse Bounce Houses</Link>
        <Link href="/category/tent-rentals" className="btn-primary">Browse Tents</Link>
        <Link href="/order-by-date" className="btn-accent">Book Now</Link>
      </div>
    </div>
  )
}
