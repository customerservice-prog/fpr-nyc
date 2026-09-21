import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, ArrowRight } from 'lucide-react'
export default function HeroSection({ mobile = false, primaryHref = '/order-by-date', secondaryHref = '/category', image }: { mobile?: boolean; primaryHref?: string; secondaryHref?: string; image?: string }) {
 const safe=(url:string,fallback:string)=>url.startsWith('/')&&!url.startsWith('//')?url:fallback
 // The source is a wide panorama. A portrait cover crop needs more source pixels
 // than the viewport width, otherwise a 510px-tall hero upscales a tiny image.
 const imageSizes=image?'100vw':'(max-width: 1706px) 1800px, 100vw'
 return <section className={`relative w-full overflow-hidden bg-[#0B1F3A] ${mobile?'min-h-[510px]':'h-[68vh] min-h-[460px] max-h-[640px]'}`} aria-label="Greenville party rental hero" data-sc-hero="20260921" data-sc-hero-resolution="cover">
  <Image src={image||'/images/sc-event-reception.jpg'} alt="Outdoor tent reception with tables, chairs and warm event lighting" fill priority sizes={imageSizes} quality={75} className="object-cover" style={{objectPosition:mobile?'62% center':'center 44%'}}/>
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/15" aria-hidden="true"/>
  <div className={`relative z-10 mx-auto flex h-full max-w-6xl items-center px-6 lg:px-10 ${mobile?'min-h-[510px] py-12':''}`}><div className="max-w-xl text-white">
   <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-[#F4C542]">Greenville &amp; Upstate South Carolina</p>
   <h1 className="font-serif leading-tight"><span className="block text-2xl italic font-normal md:text-3xl">Party Rentals Made Easy</span><span className="block text-4xl font-bold md:text-5xl lg:text-6xl">in Greenville</span></h1>
   <p className="mt-4 max-w-lg text-base leading-7 text-white/90 md:text-lg">Tents, tables, chairs, inflatables, weddings &amp; complete event setups delivered throughout Greenville and Upstate South Carolina.</p>
   <div id={mobile?'mobile-hero-cta':undefined} className="mt-6 grid gap-3 sm:flex sm:flex-wrap"><Link href={safe(primaryHref,'/order-by-date')} prefetch={false} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#EEC400] px-6 py-3 font-bold text-[#0B1F3A]"><CalendarCheck size={20}/>CHECK MY DATE</Link><Link href={safe(secondaryHref,'/category')} prefetch={false} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-white px-6 py-3 font-bold text-white">BROWSE RENTALS<ArrowRight size={18}/></Link></div>
   <p className="mt-5 text-sm text-white/85">Local &amp; Family-Owned • Delivery &amp; setup available</p>
  </div></div>
 </section>
}
