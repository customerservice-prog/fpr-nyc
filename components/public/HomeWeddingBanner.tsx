import Link from 'next/link'
import Image from 'next/image'
import { NYC_WEDDING_IMAGES } from '@/lib/nycWeddingImages'

export default function HomeWeddingBanner(){return ( <section data-home-section="wedding-banner" aria-label="Wedding and large event rentals" className="px-4 pb-3 pt-7 md:hidden">
  <div className="overflow-hidden rounded-2xl border border-amber-200 bg-[#FFF9EE]">
   <div className="relative aspect-[16/9] bg-gray-50"><Image src={NYC_WEDDING_IMAGES['pkg-premium']} alt="Garden Reception" fill sizes="(max-width:767px) 92vw,600px" className="object-contain"/></div>
   <div className="p-5"><h2 className="text-2xl font-bold text-[#0B1F3A]">Planning a Wedding or Large Event?</h2><p className="mt-2 text-sm leading-6 text-gray-700">Compare our wedding packages and review the listed tent, seating and setup services with our team.</p><Link href="/weddings" prefetch={false} className="mt-4 block rounded-lg bg-[#0B1F3A] px-4 py-3 text-center font-bold text-white">Explore Wedding Packages</Link><p className="mt-3 text-xs leading-5 text-gray-500">Shared Friendly Party Rental artwork. Package inclusions and pricing are listed separately.</p></div>
  </div>
 </section>)}
