import Link from 'next/link'
import Image from 'next/image'
import ComicBookBackground from '@/components/public/ComicBookBackground'

const HERO_BADGES = {
  clean: '/images/badge-all-day-8-hour-rental.png',
  book: '/images/badge-syracuse-number1-party-rental.png',
  safety: '/images/badge-all-day-best-price-guarantee.png',
}

export default function HeroSection() {
  return (
    <ComicBookBackground className="py-8 md:py-12">
    <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 px-4">
    <Image
      src={HERO_BADGES.clean}
      alt="All Day 8 Hour Rental"
      width={220}
      height={220}
      className="w-[160px] md:w-[220px] h-[160px] md:h-[220px] rounded-full border-[5px] border-white object-cover"
      />
    <Link href="/order-by-date">
    <Image
      src={HERO_BADGES.book}
      alt="Greenville's #1 Party Rental"
      width={220}
      height={220}
      className="w-[160px] md:w-[220px] h-[160px] md:h-[220px] rounded-full border-[5px] border-white object-cover hover:scale-105 transition-transform"
      />
    </Link>
    <Image
      src={HERO_BADGES.safety}
      alt="All Day Best Price Guarantee"
      width={220}
      height={220}
      className="w-[160px] md:w-[220px] h-[160px] md:h-[220px] rounded-full border-[5px] border-white object-cover"
      />
    </div>
    </ComicBookBackground>
    )
}
