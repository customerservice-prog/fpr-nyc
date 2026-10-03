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
  const { packages, popularItems, seoSection, hero, content, contentEditMode, heroEditMode, categoryEditMode } = props
  const categories = props.desktopCategories || props.categories
  const text = (key: string, fallback: string) => content?.[key] || fallback
  const edit = !!(contentEditMode || heroEditMode || categoryEditMode)
  const editable = (key: string, fallback: string) => (
    <span
      data-home-field={key}
      tabIndex={edit ? 0 : undefined}
      role={edit ? 'button' : undefined}
      aria-label={edit ? `Edit ${key}` : undefined}
      onClick={edit ? event => {
        event.preventDefault()
        event.stopPropagation()
        contentEditMode?.onSelect(key)
      } : undefined}
      onFocus={edit ? () => contentEditMode?.onSelect(key) : undefined}
      className={edit
        ? `cursor-text rounded-sm outline-offset-4 transition hover:outline hover:outline-2 hover:outline-emerald-400 ${contentEditMode?.selectedKey === key ? 'outline outline-2 outline-emerald-500' : ''}`
        : undefined}
    >
      {text(key, fallback)}
    </span>
  )
  const heroImage = typeof hero?.desktopImageUrl === 'string' ? hero.desktopImageUrl : undefined
  const primaryHref = safeHref(hero?.primaryActionValue, '/order-by-date')
  const secondaryHref = safeHref(hero?.secondaryActionValue, '/category')

  return <div data-home-layout="desktop" data-sc-home-parity="responsive-v2" className="bg-white text-[#0B1F3A]">
    <div
      data-home-section="hero"
      className={heroEditMode ? `relative ${heroEditMode.selected ? 'outline outline-[3px] outline-emerald-500 outline-offset-[-3px]' : 'hover:outline hover:outline-2 hover:outline-emerald-400 hover:outline-offset-[-2px]'}` : undefined}
      onClickCapture={heroEditMode ? event => {
        event.preventDefault()
        event.stopPropagation()
        const anchor = (event.target as HTMLElement).closest('a')
        const href = anchor?.getAttribute('href')
        heroEditMode.onSelect(anchor ? (href === primaryHref ? 'primary' : 'secondary') : 'image')
      } : undefined}
    >
      <HeroSection image={heroImage} primaryHref={primaryHref} secondaryHref={secondaryHref} />
      {heroEditMode && <span className="pointer-events-none absolute left-3 top-3 z-[80] rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-xl">Hero · click image or button to edit</span>}
    </div>

    <section className="border-b border-gray-100 bg-white py-10" aria-label="What are you planning">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-dark">{editable('desktopPlanningHeading','What are you planning?')}</h2>
        <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
          {shortcuts.map(shortcut => {
            const category = categories.find(item => item.slug === shortcut.slug)
            const href = shortcut.href || category?.href || `/category/${shortcut.slug}`
            const sourceImage = category?.image
            return <Link
              key={shortcut.slug}
              href={href}
              prefetch={false}
              data-home-category={shortcut.slug}
              className={`group flex w-28 flex-col items-center rounded-lg ${categoryEditMode?.selectedSlug === shortcut.slug ? 'outline outline-2 outline-emerald-500 outline-offset-4' : edit ? 'hover:outline hover:outline-2 hover:outline-emerald-400 hover:outline-offset-4' : ''}`}
              onClick={categoryEditMode ? event => {
                event.preventDefault()
                event.stopPropagation()
                categoryEditMode.onSelect(shortcut.slug)
              } : undefined}
            >
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
      <h2 className="mb-6 text-3xl font-bold text-dark">{editable('desktopIntroHeading','Party Rentals in Riverdale, NY & Surrounding Areas')}</h2>
      <div className="whitespace-pre-line leading-8 text-body">{editable('desktopIntroBody','Friendly Party Rental provides tents, tables, chairs, inflatables, wedding rentals, event essentials, delivery, setup, and pickup throughout Riverdale and nearby Downstate New York communities.\n\nBrowse by category or start with your event date to see the rentals that fit your celebration.')}</div>
      <Link href="/order-by-date" prefetch={false} className="btn-gold mt-8 inline-block" onClick={contentEditMode ? event => { event.preventDefault(); event.stopPropagation(); contentEditMode.onSelect('desktopIntroButton') } : undefined}>{editable('desktopIntroButton','Book Your Party Rentals Online')}</Link>
    </section>

    <section className="bg-gray-50 py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-8 px-4">
        {[
          ['desktopBenefit1Heading','Local & Family-Owned','desktopBenefit1Body','Friendly local service for Riverdale and Downstate New York events.'],
          ['desktopBenefit2Heading','Clean, Event-Ready Equipment','desktopBenefit2Body','Rental equipment is cleaned, inspected, and prepared before delivery.'],
          ['desktopBenefit3Heading','Delivery, Setup & Pickup','desktopBenefit3Body','Our team coordinates delivery and collection so you can focus on the event.'],
        ].map(([headingKey,heading,bodyKey,body]) => <div key={headingKey} className="rounded-xl bg-[#F6F4F2] p-7">
          <h2 className="mb-2 font-bold text-dark">{editable(headingKey as string, heading as string)}</h2><p className="text-sm leading-6 text-body">{editable(bodyKey as string, body as string)}</p>
        </div>)}
      </div>
    </section>

    <HomeYouTube desktop />
    <HomeCategoryGrid categories={categories} categoryEditMode={categoryEditMode} />

    {popularItems.length > 0 && <section className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#C85F00]">Booked by Riverdale customers</p><h2 className="mt-2 text-3xl font-bold text-dark">{editable('popularHeading','Popular Rentals')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-body">Real booking history helps surface equipment customers choose most often. Date availability is still checked for your event.</p></div>
          <Link href="/popular-rentals" className="font-bold text-secondary underline">View popular rentals</Link>
        </div>
        <div className="grid grid-cols-4 gap-5">{popularItems.slice(0,8).map(item => <Link key={item.id} href={item.slug ? nycItemPath(item.slug) : '/category'} prefetch={false} className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="relative aspect-[4/3] bg-white">{item.picture ? <Image src={item.picture} alt={item.name} fill sizes="25vw" quality={62} className="object-contain p-3" /> : <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">Photo coming soon</div>}</div>
          <div className="p-4"><h3 className="line-clamp-2 font-bold text-dark">{item.name}</h3><p className="mt-2 font-bold text-secondary">{formatCurrency(item.cost)}</p></div>
        </Link>)}</div>
      </div>
    </section>}

    <StorefrontDesigner />

    <section className="bg-[#FFF8E8] py-14">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold text-dark">{editable('rentingEasyHeading','Renting Is Easy')}</h2>
        <div className="mt-8 grid grid-cols-3 gap-5">
          {[
            [CalendarCheck,'step1Label','Pick Your Date','Check your event date and delivery schedule.'],
            [MousePointerClick,'step2Label','Choose Your Rentals','Build the order that fits your event and review the details.'],
            [Truck,'step3Label','We Deliver','Our crew coordinates delivery and collection for your rentals.'],
          ].map(([Icon,labelKey,label,body],index) => {
            const StepIcon = Icon as typeof CalendarCheck
            return <div key={index} className="rounded-2xl border border-amber-100 bg-white p-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#0B1F3A] text-[#F4C542]"><StepIcon size={27}/></span>
              <h3 className="mt-4 font-bold text-dark">{editable(labelKey as string,label as string)}</h3><p className="mt-2 text-sm leading-6 text-body">{body as string}</p>
            </div>
          })}
        </div>
      </div>
    </section>

    <ReviewCarousel />

    {packages.length > 0 && <section id="packages" className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold text-dark">{editable('desktopPackagesHeading','Wedding Rental Packages')}</h2>
        <p className="mx-auto mb-9 mt-3 max-w-2xl text-center text-body">Compare each package’s listed equipment and services. Delivery fees and tax are separate.</p>
        <div className="grid grid-cols-3 gap-6">{packages.map((pkg,index) => <WeddingPackageCard key={pkg.id} {...pkg} items={pkg.items || []} image={pkg.image || undefined} packageNumber={index+1} />)}</div>
        <div className="mt-8 text-center"><Link href="/weddings" className="btn-primary inline-block">View All Wedding Packages</Link></div>
      </div>
    </section>}

    <section className="bg-[#0B1F3A] py-14 text-white">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-[#F4C542]">{editable('eventPlanningEyebrow','A Complete Solution')}</p>
        <h2 className="mt-3 text-3xl font-bold">{editable('eventPlanningHeading','Full-Service Event Planning')}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/80">{editable('eventPlanningBody','Talk with the Riverdale team about rentals, layout, delivery, setup, and the details that need to come together for your event.')}</p>
        <Link href="/event-planning" prefetch={false} className="mt-7 inline-block rounded-lg bg-[#EEC400] px-7 py-3 font-bold text-[#0B1F3A]" onClick={contentEditMode ? event => { event.preventDefault(); event.stopPropagation(); contentEditMode.onSelect('eventPlanningButton') } : undefined}>{editable('eventPlanningButton','Learn About Event Planning')}</Link>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="text-2xl font-bold text-dark">Party Rentals in Riverdale &amp; Downstate New York</h2>
      {seoSection}
    </section>
  </div>
}
