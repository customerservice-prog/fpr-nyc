'use client'

import Image from 'next/image'
import Link from 'next/link'
import { nycItemPath } from '@/lib/nycItemPath'
import { CalendarCheck, LayoutGrid, MousePointerClick, Truck } from 'lucide-react'
import HeroSection from './HeroSection'
import HomeYouTube from './HomeYouTube'
import HomeCategoryGrid from './HomeCategoryGrid'
import StorefrontDesigner from './StorefrontDesigner'
import ReviewCarousel from './ReviewCarousel'
import WeddingPackageCard from './WeddingPackageCard'
import { formatCurrency } from '@/lib/utils'
import type { MobileHomeProps } from './MobileHome'

const shortcuts = [
  { slug: 'tent-rentals', name: 'Tents' },
  { slug: 'table-chair-rentals', name: 'Tables & Chairs' },
  { slug: 'bounce-house-rentals', name: 'Bounce Houses' },
  { slug: 'linen-rentals', name: 'Linens' },
  { slug: 'photobooth-rentals', name: 'Photo Booths' },
  { slug: 'weddings', name: 'Weddings', href: '/weddings' },
  { slug: 'event-planning', name: 'Event Planning', href: '/event-planning' },
  { slug: 'all', name: 'And More', href: '/category' },
]

function safeHref(value: unknown, fallback: string) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

export default function DesktopHome(props: MobileHomeProps) {
  const { packages, popularItems, seoSection, hero, content } = props
  const categories = props.desktopCategories || props.categories
  const text = (key: string, fallback: string) => content?.[key] || fallback
  const heroImage = typeof hero?.desktopImageUrl === 'string' ? hero.desktopImageUrl : undefined
  const primaryHref = safeHref(hero?.primaryActionValue, '/order-by-date')
  const secondaryHref = safeHref(hero?.secondaryActionValue, '/category')

  return <div data-home-layout="desktop" data-sc-home-parity="responsive-v2" className="bg-white text-[#0B1F3A]">
    <HeroSection image={heroImage} primaryHref={primaryHref} secondaryHref={secondaryHref} />

    <section className="border-b border-gray-100 bg-white py-10" aria-label="What are you planning">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-dark">{text('desktopPlanningHeading','What are you planning?')}</h2>
        <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
          {shortcuts.map(shortcut => {
            const category = categories.find(item => item.slug === shortcut.slug)
            const href = shortcut.href || category?.href || `/category/${shortcut.slug}`
            const sourceImage = category?.image
            return <Link key={shortcut.slug} href={href} prefetch={false} className="group flex w-28 flex-col items-center">
              <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#F6F4F2] ring-2 ring-transparent transition-all group-hover:ring-primary/40">
                {sourceImage ? <Image src={sourceImage} alt={shortcut.name} fill sizes="64px" className="object-cover" /> : <LayoutGrid className="h-7 w-7 text-primary" aria-hidden="true" />}
              </span>
              <span className="mt-3 text-center text-sm font-medium leading-snug text-dark">{shortcut.name}</span>
            </Link>
          })}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-14 text-center">
      <h1 className="mb-6 text-3xl font-bold text-dark">{text('desktopIntroHeading','Party Rentals in Riverdale, NY & Surrounding Areas')}</h1>
      <div className="whitespace-pre-line leading-8 text-body">{text('desktopIntroBody','Friendly Party Rental provides tents, tables, chairs, inflatables, wedding rentals, event essentials, delivery, setup, and pickup throughout Riverdale and nearby Downstate New York communities.\n\nBrowse by category or start with your event date to see the rentals that fit your celebration.')}</div>
      <Link href="/order-by-date" prefetch={false} className="btn-gold mt-8 inline-block">{text('desktopIntroButton','Book Your Party Rentals Online')}</Link>
    </section>

    <section className="bg-gray-50 py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-8 px-4">
        {[
          [text('desktopBenefit1Heading','Local & Family-Owned'),text('desktopBenefit1Body','Friendly local service for Riverdale and Downstate New York events.')],
          [text('desktopBenefit2Heading','Clean, Event-Ready Equipment'),text('desktopBenefit2Body','Rental equipment is cleaned, inspected, and prepared before delivery.')],
          [text('desktopBenefit3Heading','Delivery, Setup & Pickup'),text('desktopBenefit3Body','Our team coordinates delivery and collection so you can focus on the event.')],
        ].map(([heading,body]) => <div key={heading} className="rounded-xl bg-[#F6F4F2] p-7">
          <h2 className="mb-2 font-bold text-dark">{heading}</h2><p className="text-sm leading-6 text-body">{body}</p>
        </div>)}
      </div>
    </section>

    <HomeYouTube desktop />
    <HomeCategoryGrid categories={categories} />

    {popularItems.length > 0 && <section className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#C85F00]">Booked by Riverdale customers</p><h2 className="mt-2 text-3xl font-bold text-dark">{text('popularHeading','Popular Rentals')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-body">Real booking history helps surface equipment customers choose most often. Date availability is still checked for your event.</p></div>
          <Link href="/popular-rentals" className="font-bold text-secondary underline">View popular rentals</Link>
        </div>
        <div className="grid grid-cols-4 gap-5">{popularItems.slice(0,8).map(item => <Link key={item.id} href={item.slug ? nycItemPath(item.slug) : '/category'} prefetch={false} className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="relative aspect-[4/3] bg-white">{item.picture ? <Image src={item.picture} alt={item.name} fill sizes="25vw" className="object-contain p-3" /> : <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">Photo coming soon</div>}</div>
          <div className="p-4"><h3 className="line-clamp-2 font-bold text-dark">{item.name}</h3><p className="mt-2 font-bold text-secondary">{formatCurrency(item.cost)}</p></div>
        </Link>)}</div>
      </div>
    </section>}

    <StorefrontDesigner />

    <section className="bg-[#FFF8E8] py-14">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold text-dark">{text('rentingEasyHeading','Renting Is Easy')}</h2>
        <div className="mt-8 grid grid-cols-3 gap-5">
          {[
            [CalendarCheck,text('step1Label','Pick Your Date'),'Check your event date and delivery schedule.'],
            [MousePointerClick,text('step2Label','Choose Your Rentals'),'Build the order that fits your event and review the details.'],
            [Truck,text('step3Label','We Deliver'),'Our crew coordinates delivery and collection for your rentals.'],
          ].map(([Icon,label,body],index) => {
            const StepIcon = Icon as typeof CalendarCheck
            return <div key={index} className="rounded-2xl border border-amber-100 bg-white p-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#0B1F3A] text-[#F4C542]"><StepIcon size={27}/></span>
              <h3 className="mt-4 font-bold text-dark">{label as string}</h3><p className="mt-2 text-sm leading-6 text-body">{body as string}</p>
            </div>
          })}
        </div>
      </div>
    </section>

    <ReviewCarousel />

    {packages.length > 0 && <section id="packages" className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold text-dark">{text('desktopPackagesHeading','Wedding Rental Packages')}</h2>
        <p className="mx-auto mb-9 mt-3 max-w-2xl text-center text-body">Compare each package’s listed equipment and services. Delivery fees and tax are separate.</p>
        <div className="grid grid-cols-3 gap-6">{packages.map((pkg,index) => <WeddingPackageCard key={pkg.id} {...pkg} items={pkg.items || []} image={pkg.image || undefined} packageNumber={index+1} />)}</div>
        <div className="mt-8 text-center"><Link href="/weddings" className="btn-primary inline-block">View All Wedding Packages</Link></div>
      </div>
    </section>}

    <section className="bg-[#0B1F3A] py-14 text-white">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-[#F4C542]">A Complete Solution</p>
        <h2 className="mt-3 text-3xl font-bold">Full-Service Event Planning</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/80">Talk with the Riverdale team about rentals, layout, delivery, setup, and the details that need to come together for your event.</p>
        <Link href="/event-planning" prefetch={false} className="mt-7 inline-block rounded-lg bg-[#EEC400] px-7 py-3 font-bold text-[#0B1F3A]">Learn About Event Planning</Link>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="text-2xl font-bold text-dark">Party Rentals in Riverdale &amp; Downstate New York</h2>
      {seoSection}
    </section>
  </div>
}
