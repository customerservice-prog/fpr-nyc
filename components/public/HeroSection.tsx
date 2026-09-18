import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, ArrowRight } from 'lucide-react'

export default function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden h-[68vh] min-h-[460px] max-h-[640px]"
      aria-label="Friendly Party Rental Greenville hero"
    >
      <Image
        src="/images/wedding-backyard-elopement.jpg"
        alt="Elegant outdoor wedding and event rental setup by Friendly Party Rental in Greenville, South Carolina"
        fill
        sizes="100vw"
        quality={82}
        priority
        className="object-cover"
        style={{ objectPosition: 'center 44%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/48 to-black/12" aria-hidden="true" />
      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 lg:px-10 flex items-center">
        <div className="max-w-xl text-white">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#F4C542]">Greenville &amp; Upstate South Carolina</p>
          <h1 className="font-serif leading-tight drop-shadow-md">
            <span className="block text-2xl md:text-3xl italic font-normal text-white/90">Party Rentals Made Easy</span>
            <span className="block text-4xl md:text-5xl lg:text-6xl font-bold">in Greenville</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/90 max-w-lg">
            Tents, tables, chairs, inflatables, weddings &amp; complete event setups delivered throughout Greenville and Upstate South Carolina.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/order-by-date" prefetch={false} className="inline-flex items-center gap-2 bg-[#EEC400] text-dark font-bold px-6 py-3 rounded-md hover:bg-[#d9b400] transition-colors">
              <CalendarCheck className="w-5 h-5" aria-hidden="true" />
              CHECK MY DATE
            </Link>
            <Link href="/category" prefetch={false} className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-6 py-3 rounded-md hover:bg-white/10 transition-colors">
              BROWSE RENTALS
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/85 font-medium">
            Local &amp; Family-Owned <span className="mx-1">•</span> Professional Setup Available
          </p>
        </div>
      </div>
    </section>
  )
}
