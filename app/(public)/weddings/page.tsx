import Link from 'next/link'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'
import WeddingPackageCard from '@/components/public/WeddingPackageCard'
import Accordion from '@/components/public/Accordion'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
import { formatCurrency } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Wedding Rental Packages in Greenville, SC',
  description: 'Wedding rentals and packages in Greenville, SC for backyard ceremonies through 200-guest receptions. Tents, chairs, linens, arches, lighting and dance floors with professional setup available. Call 864-610-5324.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/weddings' },
}
export const dynamic = 'force-dynamic'

const faqItems = [
  {
    question: 'What is included in wedding rental packages?',
    answer: 'Our packages combine the core rentals needed for the guest count shown. Exact inclusions vary by package and can include tents, tables, chairs, linens, lighting, dance floor pieces, cocktail tables and other event equipment. Standard delivery, setup and breakdown are included; a travel fee may apply based on distance.',
  },
  {
    question: 'Can I customize a wedding package?',
    answer: 'Yes. We can adjust quantities and add or remove rental items to better fit your guest count, venue and style. Call 864-610-5324 or request a quote online and our team will help build the setup you need.',
  },
  {
    question: 'Can I see my reception layout before I book?',
    answer: 'Yes. Use our RentSketch Event Designer to arrange tents, tables, chairs, dance floors and other equipment in 2D and 3D, then send your design to our team for final availability and pricing.',
  },
  {
    question: 'How far in advance should I book wedding rentals?',
    answer: 'Popular spring, summer and fall weekends can fill quickly. Booking early gives you the best selection of tents, chairs, linens and other wedding equipment, especially for larger receptions.',
  },
  {
    question: 'Do you deliver wedding rentals outside Greenville?',
    answer: 'Yes. We serve Greenville, Taylors, Greer, Simpsonville, Mauldin, Travelers Rest, Fountain Inn and surrounding Upstate South Carolina communities. Travel fees depend on distance.',
  },
]

const whatWeOffer = [
  { label: 'Seating', icon: '🪑', href: '/category/table-chair-rentals' },
  { label: 'Linens', icon: '🤍', href: '/category/linen-rentals' },
  { label: 'Ceremony Decor', icon: '💐', href: '/category/weddings' },
  { label: 'Lighting', icon: '✨', href: '/category/event-lighting-rentals' },
  { label: 'Backdrops', icon: '🖼️', href: '/category/weddings' },
  { label: 'Tents & Dance Floors', icon: '⛺', href: '/category/tent-rentals' },
]

const whyChooseUs = [
  { label: 'Family-owned with 10+ years of event-rental experience', icon: '🏡' },
  { label: 'Fully insured and professional setup crews', icon: '🛡️' },
  { label: 'Clean, professionally maintained equipment', icon: '✨' },
  { label: 'Flexible packages for different guest counts and budgets', icon: '💝' },
]

function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-10" aria-hidden="true">
      <span className="h-px w-16 bg-primary/40" />
      <span className="text-primary text-sm">✦</span>
      <span className="h-px w-16 bg-primary/40" />
    </div>
  )
}

export default async function WeddingsPage() {
  const packagesRaw = await getSyncedWeddingPackages()
  const packages = packagesRaw.map((p) => ({
    ...p,
    items: Array.isArray(p.items) ? (p.items as string[]) : [],
    image: p.image || undefined,
  }))

  const STATEMENT_KEYWORDS = ['arch', 'arbor', 'backdrop', 'runner', 'wall']
  let decorItems: { id: string; name: string; slug: string; cost: number }[] = []
  try {
    const rawItems = await prisma.item.findMany({
      where: { category: { slug: 'weddings' }, displayToCustomer: true, picture: { not: null } },
      select: { id: true, name: true, slug: true, cost: true },
      orderBy: { name: 'asc' },
    })
    const filtered = rawItems.filter((i) => !i.name.startsWith('Wedding Package'))
    const statement = filtered.filter((i) => STATEMENT_KEYWORDS.some((k) => i.name.toLowerCase().includes(k)))
    const rest = filtered.filter((i) => !STATEMENT_KEYWORDS.some((k) => i.name.toLowerCase().includes(k)))
    decorItems = [...statement, ...rest].slice(0, 12)
  } catch {
    decorItems = []
  }

  return (
    <div>
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #1a6fd4 100%)' }}>
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #EEC400, #E07B00, #EEC400)' }} />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-primary uppercase tracking-[0.3em] text-xs font-bold mb-4">Greenville Wedding Rentals</p>
          <h1 className={`${playfair.className} text-4xl md:text-6xl font-bold text-white mb-5 drop-shadow-md`}>
            Wedding Rentals for Every Kind of &ldquo;I Do&rdquo;
          </h1>
          <p className={`${playfair.className} italic text-primary text-lg mb-5`}>Where Elegance Meets Ease</p>
          <p className="text-white/90 max-w-2xl mx-auto mb-8 text-base md:text-lg">
            From intimate backyard ceremonies to large Upstate receptions, choose individual rentals, a complete package, or build your layout visually before you book.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/category/weddings" className="btn-accent inline-block px-8 uppercase text-sm tracking-wide">Shop Wedding Rentals</Link>
            <Link href="#packages" className="btn-primary inline-block px-8 uppercase text-sm tracking-wide">View Wedding Packages</Link>
            <DesignYourEventCTA source="weddings_hero" label="Design My Reception" variant="outline" className="uppercase text-sm tracking-wide px-8" />
            <Link href="/contact_us" className="btn-gold inline-block px-8 uppercase text-sm tracking-wide">Request a Custom Quote</Link>
          </div>
        </div>
        <div className="border-t border-white/10 bg-black/20">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-white/80 text-xs md:text-sm uppercase tracking-wider">
            <span>Family-Owned &middot; 10+ Years</span>
            <span className="hidden md:inline text-primary">•</span>
            <span>Fully Insured</span>
            <span className="hidden md:inline text-primary">•</span>
            <span>Serving Upstate South Carolina</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {decorItems.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Details That Delight</p>
              <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-dark mb-2`}>Shop Wedding Rentals</h2>
              <p className="text-body italic">Browse individual pieces to build your own wedding look, or choose a package below.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {decorItems.map((item) => (
                <Link key={item.id} href={`/items/${item.slug}`} className="group block bg-white rounded-xl border border-primary/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="relative w-full aspect-square bg-gray-50">
                    <img src={`/api/item-image/${item.slug}?v=${IMAGE_CACHE_BUST}`} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-dark line-clamp-2">{item.name}</p>
                    <p className="text-secondary font-bold text-sm">{formatCurrency(item.cost)}<span className="text-body font-normal">/day</span></p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center"><Link href="/category/weddings" className="btn-accent inline-block px-8 uppercase text-sm tracking-wide">Browse All Wedding Rentals</Link></div>
          </div>
        )}

        <SectionDivider />

        <div id="packages" className="text-center mb-4">
          <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Curated Collections</p>
          <h2 className={`${playfair.className} text-3xl md:text-4xl font-bold text-dark mb-3`}>Our Wedding Rental Packages</h2>
          <p className="text-body">Package prices include standard delivery, setup and breakdown. A travel fee may apply based on distance.</p>
        </div>
        <SectionDivider />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, idx) => (
            <WeddingPackageCard key={pkg.id} id={pkg.id} name={pkg.name} price={pkg.price} guests={pkg.guests} items={pkg.items} popular={pkg.popular} signature={'signature' in pkg && pkg.signature} packageNumber={idx + 1} image={pkg.image} />
          ))}
        </div>

        <div className="max-w-4xl mx-auto space-y-14 mb-16">
          <div>
            <h2 className={`${playfair.className} text-2xl font-bold text-dark mb-4 text-center`}>Full Wedding Rental Services</h2>
            <p className="text-body mb-4">Friendly Party Rental provides wedding rentals throughout Greenville and Upstate South Carolina. Mix individual pieces or start with one of our packages, then customize the tent, seating, linens, lighting, ceremony décor and reception equipment around your venue and guest count. We also offer <Link href="/event-planning" className="text-secondary underline font-semibold">full-service event planning</Link> when you want help coordinating the full setup.</p>
          </div>

          <div>
            <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {whatWeOffer.map((item) => (
                <Link key={item.label} href={item.href} className="bg-white border border-primary/20 p-6 rounded-xl text-center font-medium text-dark shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 block">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-2xl">{item.icon}</div>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>Why Greenville Couples Choose Us</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {whyChooseUs.map((item) => (
                <div key={item.label} className="flex items-center gap-4 bg-white border border-primary/20 p-5 rounded-xl shadow-sm">
                  <div className="w-11 h-11 flex-shrink-0 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-xl">{item.icon}</div>
                  <p className="text-body font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div><h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>Wedding Rental FAQ</h2><Accordion items={faqItems} /></div>
        </div>

        <div className="relative overflow-hidden rounded-2xl text-center py-14 px-6" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #1a6fd4 100%)' }}>
          <p className={`${playfair.className} italic text-primary text-lg mb-2`}>Your Story, Beautifully Styled</p>
          <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-white mb-6`}>Ready to Plan Your Greenville Wedding?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <DesignYourEventCTA source="weddings_footer" label="Design My Reception" variant="outline" />
            <Link href="/contact_us" className="btn-gold inline-block px-10 uppercase text-sm tracking-wide">Request a Custom Quote</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
