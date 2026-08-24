import Link from 'next/link'
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
  description: 'Wedding rental packages in Greenville, SC starting at $345, from backyard elopements to 200-guest estate receptions. Tents, chairs, linens, arches, lighting, and dance floors -- delivery, setup, and pickup included. Call 315-884-1498.',
  alternates: { canonical: 'https://www.friendlypartyrentalsc.com/weddings' },
}
export const dynamic = 'force-dynamic'
const faqItems = [
  {
    question: 'What is included in wedding rental packages?',
    answer: 'All packages include professional delivery, setup, and breakdown. Specific items vary by package — tents, tables, chairs, linens, lighting, and dance floors are included based on your chosen package level.',
  },
  {
    question: 'Can I customize a wedding package?',
    answer: 'Yes! We can customize any package to fit your specific needs. Call us at 315-884-1498 to discuss your vision and we will create a custom quote.',
  },
  {
    question: 'How far in advance should I book wedding rentals?',
    answer: 'We recommend booking 4-8 weeks in advance for summer weekends. Popular dates in peak season book quickly, so early booking ensures availability.',
  },
  {
    question: 'Do you deliver wedding rentals outside Greenville?',
    answer: 'Yes, we serve Greenville, Taylors, Greer, Simpsonville, Mauldin, Travelers Rest, Fountain Inn, and surrounding Upstate South Carolina communities.',
  },
  {
    question: 'What if it rains on my wedding day?',
    answer: 'Our tents provide excellent weather protection. In case of severe weather, we work with you on contingency plans. Deposits are non-refundable but rainchecks are valid for one year.',
  },
]
const whatWeOffer = [
  { label: 'Seating', icon: '🪑' },
  { label: 'Linens', icon: '🤍' },
  { label: 'Ceremony Decor', icon: '💐' },
  { label: 'Lighting', icon: '✨' },
  { label: 'Backdrops', icon: '🖼️' },
  { label: 'Tents & Dance Floors', icon: '⛺' },
]

const whyChooseUs = [
  { label: 'Family-owned with 10+ years of wedding experience', icon: '🏡' },
  { label: 'Fully insured and background-checked crews', icon: '🛡️' },
  { label: 'Clean, professionally maintained equipment', icon: '✨' },
  { label: 'Flexible packages that fit any budget', icon: '💝' },
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

  let decorItems: { id: string; name: string; slug: string; cost: number }[] = []
  try {
    const rawItems = await prisma.item.findMany({
      where: { category: { slug: 'weddings' }, displayToCustomer: true, picture: { not: null } },
      select: { id: true, name: true, slug: true, cost: true },
      orderBy: { name: 'asc' },
    })
    decorItems = rawItems.filter((i) => !i.name.startsWith('Wedding Package')).slice(0, 8)
  } catch {
    decorItems = []
  }

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #1a6fd4 100%)',
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: 'linear-gradient(90deg, #EEC400, #E07B00, #EEC400)' }}
        />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-primary uppercase tracking-[0.3em] text-xs font-bold mb-4">Weddings</p>
          <h1 className={`${playfair.className} text-4xl md:text-6xl font-bold text-white mb-5 drop-shadow-md`}>
            Wedding Rentals for Every Kind of &ldquo;I Do&rdquo;
          </h1>
          <p className={`${playfair.className} italic text-primary text-lg mb-5`}>Where Elegance Meets Ease</p>
          <p className="text-white/90 max-w-2xl mx-auto mb-8 text-base md:text-lg">
            From backyard elopements to 200-guest estate receptions, we deliver, set up, and break down everything so you can focus on your day. No hidden fees.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="#packages" className="btn-primary inline-block px-8 uppercase text-sm tracking-wide">View Wedding Packages</Link>
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
        <div id="packages" className="text-center mb-4">
          <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Curated Collections</p>
          <h2 className={`${playfair.className} text-3xl md:text-4xl font-bold text-dark mb-3`}>Our Wedding Rental Packages</h2>
          <p className="text-body">All packages include professional delivery, setup & breakdown. No hidden fees.</p>
        </div>
        <SectionDivider />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, idx) => (
            <WeddingPackageCard
              key={pkg.id}
              id={pkg.id}
              name={pkg.name}
              price={pkg.price}
              guests={pkg.guests}
              items={pkg.items}
              popular={pkg.popular}
              signature={'signature' in pkg && pkg.signature}
              packageNumber={idx + 1}
              image={pkg.image}
            />
          ))}
        </div>

        {decorItems.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">Details That Delight</p>
              <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-dark mb-2`}>Featured Wedding Décor & Rentals</h2>
              <p className="text-body italic">A closer look at the pieces that bring your package to life.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {decorItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.slug}`}
                  className="group block bg-white rounded-xl border border-primary/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative w-full aspect-square bg-gray-50">
                    <img
                      src={`/api/item-image/${item.slug}?v=${IMAGE_CACHE_BUST}`}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-dark truncate">{item.name}</p>
                    <p className="text-secondary font-bold text-sm">
                      {formatCurrency(item.cost)}
                      <span className="text-body font-normal">/day</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center">
              <Link href="/category/weddings" className="btn-accent inline-block px-8 uppercase text-sm tracking-wide">
                Browse All Wedding Rentals
              </Link>
            </div>
          </div>
        )}

        <SectionDivider />

        <div className="max-w-4xl mx-auto space-y-14 mb-16">
          <div>
            <h2 className={`${playfair.className} text-2xl font-bold text-dark mb-4 text-center`}>Full Wedding Rental Services</h2>
            <p className="text-body mb-4">
              Friendly Party Rental is your one-stop shop for wedding rentals in Greenville and Upstate South Carolina. From intimate backyard ceremonies to grand estate receptions, we provide everything you need to create the perfect wedding day. Prefer to have our team plan and coordinate everything for you? We also offer <Link href="/event-planning" className="text-secondary underline font-semibold">full-service event planning</Link>, so you do not need to hire a separate planner.
            </p>
          </div>

          <div>
            <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {whatWeOffer.map((item) => (
                <div key={item.label} className="bg-white border border-primary/20 p-6 rounded-xl text-center font-medium text-dark shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>Why Greenville Couples Choose Us</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {whyChooseUs.map((item) => (
                <div key={item.label} className="flex items-center gap-4 bg-white border border-primary/20 p-5 rounded-xl shadow-sm">
                  <div className="w-11 h-11 flex-shrink-0 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <p className="text-body font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className={`${playfair.className} text-xl font-bold text-dark mb-6 text-center`}>Wedding Rental FAQ</h2>
            <Accordion items={faqItems} />
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl text-center py-14 px-6"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #14335c 55%, #1a6fd4 100%)' }}
        >
          <p className={`${playfair.className} italic text-primary text-lg mb-2`}>Your Story, Beautifully Styled</p>
          <h2 className={`${playfair.className} text-2xl md:text-3xl font-bold text-white mb-6`}>Ready to Say &ldquo;I Do&rdquo; in Style?</h2>
          <Link href="/contact_us" className="btn-gold inline-block px-10 uppercase text-sm tracking-wide">
            Request a Custom Quote
          </Link>
        </div>
      </div>
    </div>
  )
}
