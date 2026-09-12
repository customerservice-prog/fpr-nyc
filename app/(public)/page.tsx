import Link from 'next/link'
import CategoryCard from '@/components/public/CategoryCard'
import HeroSection from '@/components/public/HeroSection'
import ComicBookBackground from '@/components/public/ComicBookBackground'
import YouTubeFacade from '@/components/public/YouTubeFacade'
import ReviewCarousel from '@/components/public/ReviewCarousel'
import WeddingPackageCard from '@/components/public/WeddingPackageCard'; import MobileHome from '@/components/public/MobileHome'
import { PUBLIC_CATEGORIES, BUSINESS } from '@/lib/utils'
import { getSyncedWeddingPackages } from '@/lib/wedding-packages'
import { DEFAULT_HOME_CONTENT } from '@/lib/homeContent'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'
import { prisma } from '@/lib/prisma'
import { Playfair_Display } from 'next/font/google'
import { CalendarCheck, MousePointerClick, Truck } from 'lucide-react'
export const revalidate = 60
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600','700'], style: ['italic','normal'], display: 'swap' })
export default async function HomePage() {
  let theme: { storeBackgroundImage: string | null; storeBackgroundTint: string; categoryDisplayStyle: string; categoryCarouselCount: number } | null = null
  try {
    theme = await prisma.themeSettings.findFirst()
  } catch {
    theme = null
  }
    let categoryPictures: Record<string, string> = {}
  let extraCategories: (typeof PUBLIC_CATEGORIES)[number][] = []
    try {
    const dbCategories = await prisma.category.findMany({ select: { slug: true, name: true, picture: true, updatedAt: true, displayToCustomer: true, sortOrder: true } })
          categoryPictures = Object.fromEntries(
                          dbCategories.filter((c) => c.picture).map((c) => [c.slug, `/api/category-image/${c.slug}?v=${c.updatedAt ? new Date(c.updatedAt).toISOString() : IMAGE_CACHE_BUST}`])
                )
      const knownSlugs = new Set(PUBLIC_CATEGORIES.map((c) => c.slug))
      extraCategories = dbCategories.filter((c) => c.displayToCustomer && !knownSlugs.has(c.slug)).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.slug, name: c.name, slug: c.slug, href: `/category/${c.slug}`, image: categoryPictures[c.slug] || '/images/order-by-date.png', count: 0 }))
    } catch {
          categoryPictures = {}
    }const displayCategories = [...PUBLIC_CATEGORIES, ...extraCategories]
  let heroForMobile: any = null
let homeContent: Record<string, string> = DEFAULT_HOME_CONTENT
try {
const homeRevision = await prisma.homeRevision.findFirst({ where: { isCurrent: true } })
if (homeRevision) {
const h = homeRevision.hero as any
heroForMobile = {
mobileImageUrl: h.mobileImageUrl,
primaryActionValue: h.primaryActionValue,
primaryPosLeft: h.primaryPosLeft,
primaryPosTop: h.primaryPosTop,
primaryPosWidth: h.primaryPosWidth,
primaryPosHeight: h.primaryPosHeight,
secondaryActionValue: h.secondaryActionValue,
secondaryPosLeft: h.secondaryPosLeft,
secondaryPosTop: h.secondaryPosTop,
secondaryPosWidth: h.secondaryPosWidth,
secondaryPosHeight: h.secondaryPosHeight,
focalX: h.focalX,
focalY: h.focalY,
}
homeContent = { ...DEFAULT_HOME_CONTENT, ...(homeRevision.content as Record<string, string>) }
}
} catch {
heroForMobile = null
homeContent = DEFAULT_HOME_CONTENT
}
const packagesRaw = await getSyncedWeddingPackages()
        const packages = packagesRaw.map((p) => ({ ...p, items: Array.isArray(p.items) ? (p.items as string[]) : [], image: p.image || undefined })); let popularItems: any[] = []; try { popularItems = await prisma.item.findMany({ where: { displayToCustomer: true, status: 'Available', category: { slug: { in: ['bounce-house-rentals','tent-rentals','weddings','photobooth-rentals','dance-floor-stage-rentals','foam-party-machine-rentals','inflatable-movie-screen-rentals','yard-game-rentals'] } } }, orderBy: { sortOrder: 'asc' }, take: 10, select: { id: true, name: true, specialDisplayName: true, slug: true, cost: true, picture: true, category: { select: { name: true } } } }) } catch { popularItems = [] }; let bounceItems: any[] = []; try { bounceItems = await prisma.item.findMany({ where: { displayToCustomer: true, status: 'Available', category: { slug: 'bounce-house-rentals' } }, orderBy: { sortOrder: 'asc' }, take: 12, select: { id: true, name: true, specialDisplayName: true, slug: true, cost: true, picture: true, category: { select: { name: true } } } }) } catch { bounceItems = [] }; const mobileCategorySlugs = ['order-by-date', 'tent-rentals','bounce-house-rentals','table-chair-rentals','weddings','linen-rentals','dance-floor-stage-rentals','photobooth-rentals','concession-machine-rentals','yard-game-rentals','event-lighting-rentals','generator-rentals','heater-fan-rentals','party-rental-packages','beverage-food-service','foam-party-machine-rentals','inflatable-movie-screen-rentals','party-rental-accessories','restroom-rentals']; const mobileCategories = mobileCategorySlugs.map((slug) => displayCategories.find((c) => c.slug === slug)).filter((c): c is (typeof PUBLIC_CATEGORIES)[number] => Boolean(c)).map((c) => ({ slug: c.slug, name: c.slug === 'bounce-house-rentals' ? 'Bounce Houses & Water Slides' : c.name.replace(' — Greenville, SC', ''), href: c.href, image: categoryPictures[c.slug] || c.image }))
  return (
    <div>
      <div className="md:hidden"><MobileHome categories={mobileCategories} popularItems={popularItems.map((it: any) => ({ id: it.id, name: it.specialDisplayName || it.name, slug: it.slug, cost: it.cost, picture: it.slug ? `/api/item-image/${it.slug}?v=${IMAGE_CACHE_BUST}` : (it.picture || null), status: null, category: it.category }))} bounceItems={bounceItems.map((it: any) => ({ id: it.id, name: it.specialDisplayName || it.name, slug: it.slug, cost: it.cost, picture: it.slug ? `/api/item-image/${it.slug}?v=${IMAGE_CACHE_BUST}` : (it.picture || null), status: null, category: it.category }))} packages={packages.map((p: any) => ({ id: p.id, name: p.name, price: p.price, guests: p.guests, image: p.image, popular: p.popular, signature: p.signature }))} weddingImage={packages[0]?.image || null} seoSection={<section className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-sm text-body"><p>Friendly Party Rental provides reliable and affordable party rentals in Greenville, SC and surrounding Upstate South Carolina communities.</p><p>Serving Greenville, Greer, Simpsonville, Mauldin, Easley, Travelers Rest, Spartanburg, Anderson, Piedmont, and surrounding Upstate South Carolina areas.</p></section>}  content={homeContent} hero={heroForMobile}/></div><div className="hidden md:block"><HeroSection /></div>

      {/* Intro Section */}<div className="hidden md:block">
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-dark mb-6">Party Rentals in Greenville, SC &amp; Surrounding Areas</h1>
        <div className="space-y-4 text-body">
          <p>Friendly Party Rental provides reliable and affordable party rentals in Greenville, SC and surrounding Upstate South Carolina communities. We offer tent rentals, table and chair rentals, and event essentials for weddings, birthdays, graduations, and outdoor events.</p>
          <p>Based in Greenville, SC, we proudly serve the Upstate with clean equipment, on-time delivery, and friendly local service. We make event planning simple and stress-free.</p>
          <p>Browse our rental categories below to find everything you need for your event.</p>
          <p>Serving Greenville, Greer, Simpsonville, Mauldin, Easley, Travelers Rest, Spartanburg, Anderson, Piedmont, and surrounding Upstate South Carolina areas.</p>
        </div>
        <Link href="/order-by-date" prefetch={false} className="btn-gold mt-8 inline-block">Book Your Party Rentals Online</Link>
      </section>

      {/* Value Props */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          {[
            { title: 'Local & Family-Owned', text: 'Based in Greenville, SC, we proudly serve the Upstate South Carolina community with friendly, reliable local service you can trust.' },
            { title: 'Clean, Event-Ready Equipment', text: 'All of our party rental equipment is professionally cleaned, inspected, and ready to use so your event looks great and runs smoothly.' },
            { title: 'On-Time Delivery & Pickup', text: 'We show up when we say we will. Our team provides dependable delivery and pickup so you can focus on enjoying your event.' },
          ].map((item) => (
            <div key={item.title} className="bg-[#F6F4F2] p-6 rounded-lg">
              <div className="font-bold text-dark mb-2">{item.title}</div>
              <p className="text-body text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
      {/* YouTube Section */}
<ComicBookBackground className="py-14">
<div className="max-w-4xl mx-auto px-4 text-center">
<p className="text-[#EEC400] tracking-[0.3em] text-xs font-bold uppercase mb-2">As Seen In Action</p>
<h2 className={playfair.className + " text-3xl md:text-4xl font-bold text-white mb-8 drop-shadow-md"}>Watch Us on YouTube</h2>
<div className="relative max-w-3xl mx-auto mb-8">
<div
className="absolute -inset-6 rounded-[2rem] opacity-70 blur-2xl animate-pulse"
style={{ background: 'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)' }}
aria-hidden="true"
/>
<div
className="absolute -inset-1.5 rounded-[1.75rem]"
style={{ background: 'linear-gradient(135deg, #EEC400, #FFF7DC, #E07B00, #FFF7DC, #EEC400)' }}
aria-hidden="true"
/>
<div
className="relative p-[6px] rounded-3xl shadow-2xl"
style={{ background: 'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)' }}
>
<div className="bg-[#FFFDF7] p-2 rounded-[22px]">
<div className="aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-black/10">
<YouTubeFacade videoId="LWQvMclQea4" title="Friendly Party Rental YouTube" />
</div>
</div>
<span className="absolute -top-3 -left-3 w-6 h-6 rotate-45 bg-white border-2 border-[#EEC400] shadow-lg flex items-center justify-center" aria-hidden="true">
<span className="w-2 h-2 bg-[#E07B00]" />
</span>
<span className="absolute -top-3 -right-3 w-6 h-6 rotate-45 bg-white border-2 border-[#EEC400] shadow-lg flex items-center justify-center" aria-hidden="true">
<span className="w-2 h-2 bg-[#E07B00]" />
</span>
<span className="absolute -bottom-3 -left-3 w-6 h-6 rotate-45 bg-white border-2 border-[#EEC400] shadow-lg flex items-center justify-center" aria-hidden="true">
<span className="w-2 h-2 bg-[#E07B00]" />
</span>
<span className="absolute -bottom-3 -right-3 w-6 h-6 rotate-45 bg-white border-2 border-[#EEC400] shadow-lg flex items-center justify-center" aria-hidden="true">
<span className="w-2 h-2 bg-[#E07B00]" />
</span>
</div>
</div>
<p className={playfair.className + " italic text-white/90 text-lg mb-6"}>See the Friendly Party Rental difference for yourself</p>
<Link href="/order-by-date" prefetch={false} className="btn-gold inline-block">Book Your Rentals Online</Link>
</div>
</ComicBookBackground>

      {/* Category Grid */}
      <section
        className="max-w-6xl mx-auto px-4 py-12"
        style={
          theme?.storeBackgroundImage
            ? {
                backgroundImage:
                  (theme.storeBackgroundTint === 'dark' ? 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), ' : '') +
                  `url(${theme.storeBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <h2 className="text-2xl font-bold text-dark mb-8 text-center">Browse Our Rentals</h2>
        <div className={"grid grid-cols-2 md:grid-cols-3 " + (theme?.categoryDisplayStyle === 'minimal-no-gutter' ? 'gap-0' : 'gap-4')}>
          {          [...PUBLIC_CATEGORIES.slice(0, theme?.categoryCarouselCount || PUBLIC_CATEGORIES.length), ...extraCategories].map((cat) => (
            <CategoryCard key={cat.slug} name={cat.name} href={cat.href} image={categoryPictures[cat.slug] || cat.image} displayStyle={theme?.categoryDisplayStyle} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-primary/20 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-dark mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white shadow-sm flex items-center justify-center"><CalendarCheck className="w-7 h-7 text-primary" /></div>
              <h3 className="font-bold text-dark mb-2">Choose your rentals and event date</h3>
            </div>
            <div>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white shadow-sm flex items-center justify-center"><MousePointerClick className="w-7 h-7 text-primary" /></div>
              <h3 className="font-bold text-dark mb-2">Book online in minutes</h3>
            </div>
            <div>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white shadow-sm flex items-center justify-center"><Truck className="w-7 h-7 text-primary" /></div>
              <h3 className="font-bold text-dark mb-2">We deliver, set up, and pick up</h3>
            </div>
          </div>
        </div>
      </section>

<div className="hidden md:block"><ReviewCarousel /></div>

      {/* SEO Sections */}
      <section className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Party Rentals Serving Greenville, SC and Upstate South Carolina</h2>
          <p className="text-body text-sm">Friendly Party Rental is bringing over a decade of party rental experience to the Greenville, SC area as a family-owned and operated business. If you're searching for party rentals near me, we deliver quality event equipment throughout the Upstate, including Greer, Simpsonville, Mauldin, and Easley. Whether you are planning a backyard birthday party, a corporate picnic, or a full wedding reception, our team has the inventory and experience to help your event come together smoothly.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Tent Rentals in Greenville, SC</h2>
          <p className="text-body text-sm">We stock pole tents, frame tents, and high-peak tents in sizes ranging from compact 10x10 canopies for graduation parties up to expansive 40x80 tents that can seat 300 or more guests, a popular search for <Link href="/category/tent-rentals" prefetch={false} className="underline">tent rentals near me</Link> across Greenville and the surrounding towns. Every tent is cleaned, inspected, and installed by our experienced crew, and we can add sidewalls, lighting, or flooring based on your event's needs. Our team pulls permits when required and coordinates directly with your venue to keep setup simple.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Table and Chair Rentals</h2>
          <p className="text-body text-sm">Our inventory includes 6ft and 8ft banquet tables, 60-inch and 48-inch round tables, and cocktail tables for mingling, along with white plastic folding chairs, padded resin chairs, and gold or white Chiavari chairs. If you're looking for <Link href="/category/table-chair-rentals" prefetch={false} className="underline">table and chair rentals near me</Link>, these pieces are a great fit for weddings, graduations, corporate gatherings, and backyard celebrations throughout Greenville and the Upstate. A delivery fee applies based on your location and is shown at checkout.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Bounce House Rentals</h2>
          <p className="text-body text-sm">Choose from classic <Link href="/category/bounce-house-rentals" prefetch={false} className="underline">bounce houses</Link>, combo bounce-and-slide units, dry and wet waterslides, obstacle courses, and interactive inflatable games, most starting around $199. Every inflatable is cleaned, sanitized, and safety-checked before it leaves our warehouse. We also offer generator rentals starting at $125 for park setups and other locations without easy access to power.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Linens &amp; Concession Rentals</h2>
          <p className="text-body text-sm">Round out your event with <Link href="/category/linen-rentals" prefetch={false} className="underline">table linens</Link>, napkins, and sashes available in a range of colors, plus <Link href="/category/concession-machine-rentals" prefetch={false} className="underline">concession favorites</Link> like popcorn machines, cotton candy makers, snow cone machines, and hot dog rollers. We also carry dance floors, staging, event lighting, heaters, fans, and yard games to help complete your setup.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark mb-3">Wedding Rentals in Greenville</h2>
          <p className="text-body text-sm">Planning a wedding in Greenville or elsewhere in Upstate South Carolina? Friendly Party Rental offers everything from intimate backyard ceremonies to large, all-inclusive receptions, including Chiavari chairs, farmhouse cross-back chairs, floor-length linens, arches and arbors, candelabras, charger plates, sweetheart tables, backdrops, greenery walls, uplighting, and welcome signs.</p>
          <p className="text-body text-sm">Our wedding tents range from 20x40 for smaller ceremonies up to 40x80 for receptions of 300 or more guests, with sidewall, climate control, and lighting options available. Call 315-884-1498 or browse our wedding packages below to start planning delivery and setup for your big day.</p>
        </div>
      </section>

      {/* Wedding Packages Preview */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-dark mb-2 text-center">Wedding Rental Packages</h2>
          <p className="text-body text-center mb-8">All packages include professional delivery, setup &amp; breakdown. No hidden fees.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => (
              <WeddingPackageCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                price={pkg.price}
                guests={pkg.guests}
                items={pkg.items}
                popular={pkg.popular}
                signature={pkg.signature}
                packageNumber={idx + 1}
                image={pkg.image}
              />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/weddings" prefetch={false} className="btn-primary inline-block">View All Wedding Packages</Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-dark mb-6 text-center">Why Choose Friendly Party Rental</h2>
        <div className="space-y-4 text-body">
          <p>
            Family-owned and serving Upstate South Carolina for over 10 years, we have built our reputation on dependable delivery, clean equipment, fair pricing, and professional setup. We are fully insured and our delivery and setup crews are background-checked, so you can book with confidence.
          </p>
          <p className="font-bold text-dark">
            Serving Greenville, Greer, Simpsonville, Mauldin, Easley, Travelers Rest, Spartanburg, Anderson, Piedmont, and surrounding Upstate South Carolina areas.
          </p>
        </div>
      </section><section className="max-w-4xl mx-auto px-4 py-12 text-center"><p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-3">A Complete Solution</p><h2 className="text-2xl font-bold text-dark mb-4">Full-Service Event Planning — All In-House</h2><p className="text-body max-w-2xl mx-auto mb-6">From tents and tables to timelines and setup, we plan and provide it all, so there is no need to hire a separate event planner. One team, one contract, one point of contact from booking to breakdown.</p><Link href="/event-planning" prefetch={false} className="btn-primary inline-block px-8 uppercase text-sm tracking-wide">Learn About Event Planning</Link></section>
    </div>
          </div>
  )
}
