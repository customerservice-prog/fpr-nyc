import Link from 'next/link'
import Image from 'next/image'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'

export default function HeroSection() {
  return (
    <section className="relative min-h-[590px] overflow-hidden bg-[#07182d] text-white">
      <Image src="/images/mobile-hero-event-scene-v4.png" alt="Outdoor party rental setup with tent, tables and chairs" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07182d]/95 via-[#07182d]/72 to-[#07182d]/25" />
      <div className="relative mx-auto flex min-h-[590px] max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[.2em] text-[#F4C542]">Greenville • Greer • Simpsonville • Upstate SC</p>
          <h1 className="text-5xl font-black leading-[1.05] lg:text-6xl">Tents, Tables, Chairs & Event Rentals Delivered.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">Plan your event with clean, event-ready rentals, straightforward online booking, and Friendly Party Rental service throughout Greenville and the Upstate.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/order-by-date" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E07B00] px-7 py-3 font-extrabold text-white shadow-lg transition hover:bg-[#c96d00]">CHECK AVAILABILITY</Link>
            <DesignYourEventCTA source="desktop_home_hero" label="DESIGN MY EVENT" variant="outline" />
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/85"><span>✓ Local service</span><span>✓ Online booking</span><span>✓ Event layout designer</span></div>
        </div>
      </div>
    </section>
  )
}
