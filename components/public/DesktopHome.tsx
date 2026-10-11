'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CalendarCheck, LayoutGrid, MousePointerClick, Truck } from 'lucide-react'
import HeroSection from './HeroSection'
import HomeYouTube from './HomeYouTube'
import HomeCategoryGrid from './HomeCategoryGrid'
import StorefrontDesigner from './StorefrontDesigner'
import ReviewCarousel from './ReviewCarousel'
import WeddingPackageCard from './WeddingPackageCard'
import type { MobileHomeProps } from './MobileHome'
import { NY_PLANNING_SHORTCUTS } from '@/lib/nyHomeMedia'
import styles from './DesktopHome.module.css'

const shortcuts = [
  { slug: 'tent-rentals', name: 'Tents' },
  { slug: 'table-chair-rentals', name: 'Tables & Chairs' },
  { slug: 'bounce-house-rentals', name: 'Bounce Houses & Inflatables' },
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
  const { packages, weddingImage, seoSection, hero, content, contentEditMode, heroEditMode, categoryEditMode } = props
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

  return <div data-home-layout="desktop" data-sc-home-parity="responsive-v2" className={`fpr-home ${styles.home}`}>
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
      <HeroSection image={heroImage} primaryHref={primaryHref} secondaryHref={secondaryHref} content={content} focalX={hero?.desktopFocalX} focalY={hero?.desktopFocalY} />
      {heroEditMode && <span className="pointer-events-none absolute left-3 top-3 z-[80] rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-xl">Hero · click image or button to edit</span>}
    </div>

    <section data-home-section="planning" className="border-b border-gray-100 bg-white py-10" aria-label="What are you planning">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-dark">{editable('desktopPlanningHeading','What are you planning?')}</h2>
        <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
          {shortcuts.map((shortcut, index) => {
            const category = categories.find(item => item.slug === shortcut.slug)
            const href = safeHref(content?.[`category_${shortcut.slug}_href`], shortcut.href || category?.href || `/category/${shortcut.slug}`)
            const sourceImage = content?.[`category_${shortcut.slug}_image`] || category?.image || NY_PLANNING_SHORTCUTS[index]?.image || (shortcut.slug === 'weddings' ? weddingImage : undefined)
            const name = content?.[`category_${shortcut.slug}_name`] || shortcut.name
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
                {sourceImage ? <Image src={sourceImage} alt={name} fill sizes="64px" className="object-cover" /> : <LayoutGrid className="h-7 w-7 text-primary" aria-hidden="true" />}
              </span>
              <span className="mt-3 text-center text-sm font-medium leading-snug text-dark">{name}</span>
            </Link>
          })}
        </div>
      </div>
    </section>

    <section data-home-section="intro" className="mx-auto max-w-4xl px-4 py-12 text-center">
      <h2 className="mb-6 text-3xl font-bold text-dark">{editable('desktopIntroHeading','Party Rentals in Riverdale, NY & Surrounding Areas')}</h2>
      <div className="whitespace-pre-line leading-relaxed text-body">{editable('desktopIntroBody','Friendly Party Rental provides tents, tables, chairs, inflatables, wedding rentals, event essentials, delivery, setup, and pickup throughout Riverdale and nearby Downstate New York communities.\n\nBrowse by category or start with your event date to see the rentals that fit your celebration.')}</div>
      <Link href={primaryHref} prefetch={false} className="btn-gold mt-8 inline-block" onClick={contentEditMode ? event => { event.preventDefault(); event.stopPropagation(); contentEditMode.onSelect('desktopIntroButton') } : undefined}>{editable('desktopIntroButton','Book Your Party Rentals Online')}</Link>
    </section>

    <section className="bg-gray-50 py-12">
      <div className={`${styles.threeColumns} mx-auto max-w-7xl gap-8 px-4`}>
        {[
          ['desktopBenefit1Heading','Local & Family-Owned','desktopBenefit1Body','Friendly local service for Riverdale and Downstate New York events.'],
          ['desktopBenefit2Heading','Clean, Event-Ready Equipment','desktopBenefit2Body','Rental equipment is cleaned, inspected, and prepared before delivery.'],
          ['desktopBenefit3Heading','Delivery, Setup & Pickup','desktopBenefit3Body','Our team coordinates delivery and collection so you can focus on the event.'],
        ].map(([headingKey,heading,bodyKey,body]) => <div key={headingKey} className="rounded-lg bg-[#F6F4F2] p-6">
          <h3 className="mb-2 font-bold text-dark">{editable(headingKey, heading)}</h3><p className="text-sm text-body">{editable(bodyKey, body)}</p>
        </div>)}
      </div>
    </section>

    <HomeYouTube desktop />
    <HomeCategoryGrid categories={categories} categoryEditMode={categoryEditMode} content={content} />

    <StorefrontDesigner />

    <section data-home-section="steps" className="bg-primary/20 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-dark">{editable('desktopStepsHeading','Renting Is Easy')}</h2>
        <div className={`${styles.threeColumns} gap-8 text-center`}>
          {[CalendarCheck,MousePointerClick,Truck].map((Icon,index) => <div key={index}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white"><Icon className="h-7 w-7 text-primary" aria-hidden="true" /></div>
            <h3 className="mb-2 font-bold text-dark">{editable(`desktopStep${index+1}Label`,['Pick Your Date','Choose Your Rentals','We Deliver'][index])}</h3>
          </div>)}
        </div>
      </div>
    </section>

    <section data-home-section="reviews" className="pt-10"><h2 className="px-4 text-center text-2xl font-bold text-dark">{editable('reviewsHeading','Friendly Service in Downstate New York')}</h2><ReviewCarousel showHeading={false} /></section>

    <section data-home-section="seo" className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-sm text-body">
      <div><h2 className="mb-3 text-xl font-bold text-dark">{editable('seoHeading','Party Rentals in Riverdale & Downstate New York')}</h2><p>{editable('seoBody','Explore tents, tables, chairs, inflatables and event rentals for Riverdale, selected Bronx neighborhoods and Lower Westchester. Choose your event date to check availability and review the delivery estimate for your address.')}</p></div>
      {seoSection}
    </section>

    {packages.length > 0 && <section id="packages" data-home-section="packages" className="bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-2 text-center text-2xl font-bold text-dark">{editable('desktopPackagesHeading','Wedding Rental Packages')}</h2>
        <p className="mb-8 text-center text-body">{editable('packagesBody','Compare each package’s listed equipment and services. Delivery fees and tax are separate.')}</p>
        <div className={`${styles.packageGrid} gap-6`}>{packages.map((pkg,index) => <WeddingPackageCard key={pkg.id} {...pkg} items={pkg.items || []} image={pkg.image || undefined} packageNumber={index+1} />)}</div>
        <div className="mt-8 text-center"><Link href={safeHref(content?.packagesUrl,'/weddings')} prefetch={false} className="btn-primary inline-block">{editable('packagesButton','View All Wedding Packages')}</Link></div>
      </div>
    </section>}

    <section data-home-section="why" className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-dark">{editable('desktopWhyHeading','Why Choose Friendly Party Rental NYC?')}</h2>
      <div className="whitespace-pre-line leading-relaxed text-body">{editable('desktopWhyBody','Plan your celebration with live date availability, clear rental information and local support. Our Riverdale team coordinates delivery and pickup for the equipment you select.\n\nThis is a delivery-only location. Review your event address, available space, setup surface and access with our team before your event.')}</div>
    </section>

    <section data-home-section="event" className="mx-auto max-w-4xl px-4 py-12 text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-secondary">{editable('eventPlanningEyebrow','A Complete Solution')}</p>
      <h2 className="mb-4 text-2xl font-bold text-dark">{editable('eventPlanningHeading','Full-Service Event Planning')}</h2>
      <p className="mx-auto mb-6 max-w-2xl text-body">{editable('eventPlanningBody','Talk with the Riverdale team about rentals, layout, delivery, setup, and the details that need to come together for your event.')}</p>
      <Link href={safeHref(content?.eventPlanningUrl,'/event-planning')} prefetch={false} className="btn-primary inline-block px-8 text-sm uppercase tracking-wide" onClick={contentEditMode ? event => { event.preventDefault(); event.stopPropagation(); contentEditMode.onSelect('eventPlanningButton') } : undefined}>{editable('eventPlanningButton','Learn About Event Planning')}</Link>
    </section>
  </div>
}
