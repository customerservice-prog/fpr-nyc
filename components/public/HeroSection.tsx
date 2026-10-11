import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, ArrowRight } from 'lucide-react'
import styles from './DesktopHome.module.css'

interface HeroSectionProps {
  mobile?: boolean
  primaryHref?: string | null
  secondaryHref?: string | null
  image?: string
  focalX?: number
  focalY?: number
  content?: Record<string, string> | null
}

function safeHref(value: string | null | undefined, fallback: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

export default function HeroSection({ mobile = false, primaryHref, secondaryHref, image, focalX, focalY, content }: HeroSectionProps) {
  const text = (key: string, fallback: string) => content?.[key] || fallback
  // These older portrait variants contain another location's embedded copy.
  const safeImage = image && !/mobile-hero-event-scene-v[34]/.test(image) ? image : undefined
  const source = safeImage || (mobile ? '/images/mobile-hero-event-scene.png' : '/images/sc-event-reception.jpg')
  const objectPosition = `${(focalX ?? .5) * 100}% ${(focalY ?? (mobile ? .5 : .44)) * 100}%`
  const cropFallbackArtwork = mobile && source === '/images/mobile-hero-event-scene.png'

  return <section className={mobile ? 'home-hero' : styles.hero} aria-label="Riverdale, Bronx and Lower Westchester party rental hero" data-sc-hero="20260921" data-sc-hero-resolution="cover">
    <Image src={source} alt={mobile ? 'Event tent, tables, chairs, inflatables and concession equipment' : 'Outdoor tent reception with tables, chairs and warm event lighting'} fill priority sizes="100vw" quality={mobile ? 65 : 75} className="object-cover" style={cropFallbackArtwork ? { height: 'calc(100% + 220px)', top: 0, bottom: 'auto', objectPosition: '50% 0%' } : { objectPosition }} />
    <div className={mobile ? 'home-hero-shade pointer-events-none' : 'pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10'} aria-hidden="true" />
    <div className={mobile ? 'home-hero-copy' : styles.heroInner}>
      <div className={mobile ? undefined : 'max-w-xl text-white'}>
        <h1 className={mobile ? 'mb-5 text-center font-serif leading-tight drop-shadow-md' : 'font-serif leading-tight drop-shadow-md'}>
          <span className={mobile ? 'block text-[30px] font-bold' : styles.heroEyebrow}>{text('heroEyebrow', 'Party Rentals Made Easy')}</span>{mobile ? ' ' : null}
          <span className={mobile ? 'block text-[40px] font-bold text-[#F4C542]' : styles.heroHeading}>{text('heroHeading', 'in Riverdale')}</span>
        </h1>
        {!mobile && <p className="mt-4 max-w-md text-lg text-white/90">{text('heroBody', 'Tents, tables, chairs, inflatables, wedding rentals and event equipment delivered across Riverdale, selected Bronx neighborhoods and Lower Westchester.')}</p>}
        <div id={mobile ? 'mobile-hero-cta' : undefined} className={mobile ? 'home-hero-cta-grid' : 'mt-6 flex flex-wrap gap-4'}>
          <Link href={safeHref(primaryHref, '/order-by-date')} prefetch={false} className={mobile ? 'home-button' : 'inline-flex items-center gap-2 rounded-md bg-[#EEC400] px-6 py-3 font-bold text-dark transition-colors hover:bg-[#d9b400]'}>
            {!mobile && <CalendarCheck className="h-5 w-5" aria-hidden="true" />}{text('heroPrimaryLabel', 'CHECK MY DATE')}
          </Link>
          <Link href={safeHref(secondaryHref, '/category')} prefetch={false} className={mobile ? 'home-button home-button-light' : 'inline-flex items-center gap-2 rounded-md border-2 border-white px-6 py-3 font-bold text-white transition-colors hover:bg-white/10'}>
            {text('heroSecondaryLabel', 'BROWSE RENTALS')}{!mobile && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </Link>
        </div>
        {!mobile && <p className="mt-5 text-sm font-medium text-white/85">{text('heroTagline', 'Local & Family-Owned • Delivery & setup available')}</p>}
      </div>
    </div>
  </section>
}
