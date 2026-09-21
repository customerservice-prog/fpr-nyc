import Link from 'next/link'
import Image from 'next/image'
import YouTubeFacade from './YouTubeFacade'
import ComicBookBackground from './ComicBookBackground'
export default function HomeYouTube() {
 return <><section data-home-section="youtube" aria-label="Friendly Party Rental on YouTube"><ComicBookBackground className="px-5 py-10 md:py-14">
 <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-white drop-shadow">As Seen In Action</p><h2 className="mb-7 mt-2 text-2xl font-bold text-white drop-shadow-md md:text-4xl">Watch Us on YouTube</h2>
 <div className="rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-600 p-1.5 shadow-2xl"><div className="rounded-2xl bg-white p-1.5"><div className="aspect-video overflow-hidden rounded-xl bg-black"><YouTubeFacade videoId="LWQvMclQea4" title="Friendly Party Rental YouTube"/></div></div></div>
 <p className="mt-5 text-sm font-medium text-white drop-shadow">See the Friendly Party Rental brand in action.</p><Link href="/order-by-date" prefetch={false} className="btn-gold mt-5 inline-block">Book Your Rentals Online</Link></div>
 </ComicBookBackground></section>
 <section data-home-section="wedding-banner" aria-label="Wedding and large event rentals" className="px-4 pb-3 pt-7 md:hidden">
  <div className="overflow-hidden rounded-2xl border border-amber-200 bg-[#FFF9EE]">
   <div className="relative aspect-[16/9]"><Image src="/images/storefront/pkg-premium.jpg" alt="Shared brand wedding reception inspiration" fill sizes="(max-width:767px) 92vw,600px" className="object-cover"/></div>
   <div className="p-5"><h2 className="text-2xl font-bold text-[#0B1F3A]">Planning a Wedding or Large Event?</h2><p className="mt-2 text-sm leading-6 text-gray-700">Compare Greenville packages and review the listed tent, seating and setup services with our team.</p><Link href="/weddings" prefetch={false} className="mt-4 block rounded-lg bg-[#0B1F3A] px-4 py-3 text-center font-bold text-white">Explore Wedding Packages</Link><p className="mt-3 text-xs leading-5 text-gray-500">Shared brand inspiration. Refer to the package listing for included equipment.</p></div>
  </div>
 </section></>
}
