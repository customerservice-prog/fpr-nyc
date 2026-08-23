'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import ReviewCarousel from './ReviewCarousel'
import { formatCurrency } from '@/lib/utils'

interface MobileCategory {
  slug: string
  name: string
  href: string
  image?: string
}

interface MobilePopularItem {
  id: string
  name: string
  slug: string | null
  cost: number
  picture: string | null
  status?: string | null
  category?: { name: string | null } | null
}

interface MobileHomeProps {
  categories: MobileCategory[]
  popularItems: MobilePopularItem[]
  weddingImage?: string | null; packages: { id: string; name: string; price: number; guests: number; image?: string | null; popular?: boolean; signature?: boolean }[]
  seoSection: ReactNode
}

const HERO_IMAGE = '/images/mobile-hero-event-scene.png'

export default function MobileHome({ categories, popularItems, weddingImage, seoSection, packages }: MobileHomeProps) {
  return (
    <div>
      <section className="relative w-full">
        <div className="relative w-full h-80 overflow-hidden"><Image src={HERO_IMAGE} alt="Friendly Party Rental - tents, tables and chairs, inflatables, weddings and more" fill priority sizes="100vw" className="object-cover object-top" /></div>
        <div className="px-4 pt-4 pb-3 text-center"><h2 className="text-xl font-bold text-dark">Everything for Your Event</h2><p className="text-sm text-body mt-1">Tents • Tables & Chairs • Inflatables • Weddings & More</p></div><Link href="/category" aria-label="Browse all rental categories" className="block w-full text-center bg-red-600 text-white font-bold text-base py-4 shadow-lg">BROWSE RENTALS →</Link>
        </section>

      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-dark mb-4">Shop by Category</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link key={cat.slug} href={cat.href} className="relative block rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '1 / 1' }}>
              {cat.image ? (
                <Image src={cat.image} alt={cat.name} fill sizes="50vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gray-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-2 right-2 text-white font-semibold text-sm drop-shadow">{cat.name}</span>
            </Link>
          ))}
        </div>
        <Link href="/category" className="block w-full text-center border-2 border-secondary text-secondary font-bold text-base py-3 rounded-lg mt-4">
          VIEW ALL RENTALS
        </Link>
      </section>

      <section className="bg-secondary/10 border-y border-secondary/20 px-4 py-6 text-center">
        <h2 className="text-lg font-bold text-dark mb-1">Planning an Event?</h2>
        <p className="text-body text-sm mb-4">Choose your event date to see what's available.</p>
        <Link href="/order-by-date" className="inline-block w-full max-w-sm text-center bg-secondary text-white font-bold text-base py-4 rounded-lg shadow">
          SELECT EVENT DATE
        </Link>
      </section>

      {popularItems.length > 0 && (
        <section className="py-6">
          <h2 className="text-xl font-bold text-dark mb-4 px-4">Popular Rentals</h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {popularItems.map((item) => (
              <Link
                key={item.id}
                href={item.slug ? `/items/${item.slug}` : '#'}
                className="flex-shrink-0 w-[72%] snap-start bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
                  {item.picture ? (
                    <Image src={item.picture} alt={item.name} fill sizes="72vw" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-dark text-sm mb-1 truncate">{item.name}</p>
                  <p className="text-sm font-bold text-dark">From {formatCurrency(item.cost)}</p>
                  {item.status && <p className="text-xs text-green-700 mt-0.5">{item.status}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {packages.length > 0 && (<section className="py-6"><h2 className="text-xl font-bold text-dark mb-4 px-4">Popular Packages</h2><div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">{packages.map((pkg) => (<Link key={pkg.id} href={`/wedding-packages?package=${pkg.id}`} className="flex-shrink-0 w-[72%] snap-start bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"><div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>{pkg.image ? (<Image src={pkg.image} alt={pkg.name} fill sizes="72vw" className="object-cover" />) : (<div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-3xl">🎉</div>)}{(pkg.popular || pkg.signature) && (<span className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold uppercase px-2 py-1 rounded">{pkg.signature ? 'Signature' : 'Most Popular'}</span>)}</div><div className="p-3"><p className="font-medium text-dark text-sm mb-1 truncate">{pkg.name}</p><p className="text-sm font-bold text-dark">{formatCurrency(pkg.price)}</p><p className="text-xs text-body mt-0.5">Up to {pkg.guests} guests</p></div></Link>))}</div></section>)}<section className="bg-primary/20 py-8 px-4">
        <h2 className="text-xl font-bold text-dark mb-6 text-center">Renting Is Easy</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-3xl mb-2">📅</div>
            <p className="text-xs font-medium text-dark">Pick Your Date</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-xs font-medium text-dark">Choose Your Rentals</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🚚</div>
            <p className="text-xs font-medium text-dark">We Deliver</p>
          </div>
        </div>
      </section>
<ReviewCarousel />

      <section className="relative w-full" style={{ height: '45vh' }}>
        {weddingImage ? (
          <Image src={weddingImage} alt="Wedding and large event rentals" fill sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gray-200" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-white text-xl font-bold mb-2 drop-shadow">Planning a Wedding or Large Event?</h2>
          <p className="text-white/90 text-sm mb-4 drop-shadow">Explore our premium wedding rental packages.</p>
          <Link href="/weddings" className="inline-block bg-white text-dark font-bold text-sm px-6 py-3 rounded-lg shadow">
            VIEW WEDDING RENTALS
          </Link>
        </div>
      </section>
<section className="bg-gray-50 py-6 px-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl mb-1">🏠</div>
            <p className="text-xs font-medium text-dark">Local & Family Owned</p>
          </div>
          <div>
            <div className="text-2xl mb-1">✨</div>
            <p className="text-xs font-medium text-dark">Clean, Quality Equipment</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🚚</div>
            <p className="text-xs font-medium text-dark">Delivery & Setup Available</p>
          </div>
        </div>
      </section>
      
      
      
      <section className="py-8 px-4 text-center bg-white"><p className="text-[#E07B00] tracking-[0.2em] text-xs font-bold uppercase mb-1">A Complete Solution</p><h2 className="text-lg font-bold text-dark mb-3">Full-Service Event Planning</h2><p className="text-body text-sm mb-4 max-w-sm mx-auto">We plan it and provide it, so there is no need to hire a separate event planner.</p><Link href="/event-planning" className="btn-primary inline-block px-6 py-3 text-sm uppercase tracking-wide">Learn More</Link></section><section className="py-8 px-4 text-center"><p className="text-[#E07B00] tracking-[0.2em] text-xs font-bold uppercase mb-1">As Seen In Action</p><h2 className="text-lg font-bold text-dark mb-4">Watch Us on YouTube</h2><div className="relative w-full rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: '16 / 9' }}><iframe src="https://www.youtube.com/embed/LWQvMclQea4" title="Friendly Party Rental YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" /></div></section>{seoSection}
    </div>
  )
}
