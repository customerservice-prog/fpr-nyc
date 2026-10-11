'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Home, Sparkles, Truck, CalendarCheck, MousePointerClick } from 'lucide-react'
import { nycItemPath } from '@/lib/nycItemPath'
import { formatCurrency } from '@/lib/utils'
import { NYC_WEDDING_IMAGES } from '@/lib/nycWeddingImages'
import HeroSection from './HeroSection'
import StorefrontDesigner from './StorefrontDesigner'
import ReviewCarousel from './ReviewCarousel'
import HomeCategoryGrid from './HomeCategoryGrid'
import HomeYouTube from './HomeYouTube'
import styles from './MobileHome.module.css'

interface MobileCategory { slug: string; name: string; href: string; image?: string }
interface MobilePopularItem { id: string; name: string; slug: string | null; cost: number; picture: string | null; status?: string | null; category?: { name: string | null } | null }
interface HomeHero {
  mobileImageUrl?: string | null
  desktopImageUrl?: string | null
  focalX?: number
  focalY?: number
  desktopFocalX?: number
  desktopFocalY?: number
  primaryActionValue?: string | null
  secondaryActionValue?: string | null
  [key: string]: unknown
}
export interface MobileHomeProps {
  categories: MobileCategory[]
  desktopCategories?: MobileCategory[]
  popularItems: MobilePopularItem[]
  bounceItems: MobilePopularItem[]
  weddingImage?: string | null
  device?: 'mobile' | 'tablet' | 'desktop'
  packages: { id: string; name: string; price: number | null; guests: number; image?: string | null; items?: string[]; popular?: boolean; signature?: boolean }[]
  seoSection: ReactNode
  hero?: HomeHero | null
  heroEditMode?: { selected: 'image' | 'primary' | 'secondary' | null; onSelect: (target: 'image' | 'primary' | 'secondary', coords?: { x: number; y: number }) => void }
  content?: Record<string, string> | null
  contentEditMode?: { selectedKey: string | null; onSelect: (key: string) => void }
  categoryEditMode?: { selectedSlug: string | null; onSelect: (slug: string) => void }
}

function safeHref(value: string | null | undefined, fallback: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

export default function MobileHome({ categories, desktopCategories, bounceItems, packages, weddingImage, seoSection, hero, heroEditMode, content, contentEditMode, categoryEditMode }: MobileHomeProps) {
  const text = (key: string, fallback: string) => content?.[key] || fallback
  const editable = (key: string, fallback: string) => <span
    data-home-field={key}
    tabIndex={contentEditMode ? 0 : undefined}
    role={contentEditMode ? 'button' : undefined}
    aria-label={contentEditMode ? `Edit ${key}` : undefined}
    onClick={contentEditMode ? event => { event.preventDefault(); event.stopPropagation(); contentEditMode.onSelect(key) } : undefined}
    onFocus={contentEditMode ? () => contentEditMode.onSelect(key) : undefined}
    className={contentEditMode ? `cursor-text rounded-sm outline-offset-4 hover:outline hover:outline-2 hover:outline-emerald-400 ${contentEditMode.selectedKey === key ? 'outline outline-2 outline-emerald-500' : ''}` : undefined}
  >{text(key, fallback)}</span>
  const heading = (key: string, fallback: string) => <h2 className="home-heading">{editable(key, fallback)}</h2>
  const action = (labelKey: string, label: string, urlKey: string, href: string, secondary = false) => <Link
    href={safeHref(content?.[urlKey], href)} prefetch={false}
    data-home-action-label={labelKey} data-home-action-url={urlKey} data-home-action-url-scope="content"
    className={secondary ? 'home-button home-button-outline' : 'home-button'}
  >{editable(labelKey, label)}</Link>
  const primaryHref = safeHref(hero?.primaryActionValue, '/order-by-date')
  const secondaryHref = safeHref(hero?.secondaryActionValue, '/category')
  const catalogCategories = desktopCategories || categories
  const orderByDate = catalogCategories.find(category => category.slug === 'order-by-date') || { slug: 'order-by-date', name: 'Order by Date', href: '/order-by-date', image: '/images/order-by-date.png' }
  const browseCategories = [orderByDate, ...catalogCategories.filter(category => category.slug !== 'order-by-date')]
  const bannerImage = content?.weddingBannerImage || weddingImage || NYC_WEDDING_IMAGES['pkg-premium']
  const product = (item: MobilePopularItem) => <Link key={item.id} href={item.slug ? nycItemPath(item.slug) : '/category'} prefetch={false} className="home-product">
    <div className="relative aspect-[4/3] bg-white">{item.picture ? <Image src={item.picture} alt={item.name} fill sizes="(max-width:599px) 50vw, (max-width:767px) 33vw, 25vw" quality={62} className="object-contain p-2" /> : <div className="absolute inset-0 grid place-items-center text-xs text-gray-400">Photo coming soon</div>}</div>
    <div className="home-product-copy"><p className="font-bold">{item.name}</p><p className="home-product-price">From {formatCurrency(item.cost)}</p></div>
  </Link>

  return <div data-home-layout="mobile" data-sc-parity="20260921" className={`${styles.home} fpr-home bg-white text-[#0B1F3A]`}>
    <div data-home-section="hero" className={heroEditMode ? `relative ${heroEditMode.selected ? 'outline outline-[3px] outline-emerald-500 outline-offset-[-3px]' : 'hover:outline hover:outline-2 hover:outline-emerald-400 hover:outline-offset-[-2px]'}` : undefined}
      onClickCapture={heroEditMode ? event => {
        event.preventDefault()
        event.stopPropagation()
        const anchor = (event.target as HTMLElement).closest('a')
        heroEditMode.onSelect(anchor ? (anchor.getAttribute('href') === primaryHref ? 'primary' : 'secondary') : 'image')
      } : undefined}
    >
      <HeroSection mobile image={hero?.mobileImageUrl || undefined} primaryHref={primaryHref} secondaryHref={secondaryHref} content={content} focalX={hero?.focalX} focalY={hero?.focalY} />
    </div>

    <section data-home-section="trust" className="home-wrap py-5"><div className="grid grid-cols-3 divide-x rounded-2xl border bg-[#FAFAF8] py-4">
      {[Home, Sparkles, Truck].map((Icon, index) => <div key={index} className="px-2 text-center"><Icon className="mx-auto mb-2 h-5 w-5 text-[#E07B00]" aria-hidden="true" /><p className="text-xs font-bold">{editable(`trust${index+1}Label`, ['Local & Family Owned','Clean, Quality Equipment','Delivery & Setup Available'][index])}</p></div>)}
    </div></section>

    <section data-home-section="planning" className="home-wrap py-6"><div className="rounded-3xl bg-[#0B1F3A] p-6 text-white">
      {heading('planningEventHeading','Planning an Event?')}<p className="mt-2 mb-5 text-white/85">{editable('planningEventBody',"Choose your event date to see what's available.")}</p>{action('planningEventButton','SELECT EVENT DATE','planningEventUrl','/order-by-date')}
    </div></section>

    <HomeYouTube />
    <HomeCategoryGrid categories={browseCategories} mobile categoryEditMode={categoryEditMode} content={content} />

    {bounceItems.length > 0 && <section data-home-section="bounce" className="home-wrap py-9">
      <p className="text-xs font-bold uppercase tracking-widest text-[#C85F00]">{editable('bounceEyebrow','Kid Favorite')}</p>{heading('bounceHeading','Bounce Houses & Water Slides')}<p className="mt-2 text-gray-600">{editable('bounceBody','Make your party unforgettable, browse our most fun rentals')}</p>
      <div className="home-products mt-5">{bounceItems.map(product)}</div><div className="mt-5">{action('bounceButton','VIEW ALL BOUNCE HOUSES & WATER SLIDES','bounceUrl','/category/bounce-house-rentals',true)}</div>
    </section>}

    <StorefrontDesigner />

    <section data-home-section="steps" className="bg-[#FFF8E8] py-11"><div className="home-wrap">
      <div className="text-center"><p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#C85F00]">{editable('rentingEasyEyebrow','Simple from start to finish')}</p>{heading('rentingEasyHeading','Renting Is Easy')}<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">{editable('rentingEasyBody','Pick what you need online. We handle the rental logistics.')}</p></div>
      <div className="home-steps mt-6">{[CalendarCheck,MousePointerClick,Truck].map((Icon,index) => <div key={index} className="home-step">
        <span className="absolute right-4 top-3 text-[11px] font-black text-[#C85F00]/50" aria-hidden="true">0{index+1}</span><div className="home-step-icon"><Icon className="h-7 w-7 text-[#F4C542]" aria-hidden="true" /></div>
        <div className="pr-7"><h3 className="font-extrabold">{editable(`step${index+1}Label`,['Pick Your Date','Choose Your Rentals','We Deliver'][index])}</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">{editable(`step${index+1}Body`,['Check your event date and delivery schedule.','Choose equipment and review your order details.','Our crew delivers and collects your rentals.'][index])}</p></div>
      </div>)}</div>
      <div className="home-steps-action mt-6">{action('stepsButton','CHECK MY DATE','stepsUrl','/order-by-date')}</div>
    </div></section>

    <section data-home-section="reviews" className="py-8"><div className="home-wrap">{heading('reviewsHeading','Friendly Service in Downstate New York')}</div><ReviewCarousel showHeading={false} /></section>

    {packages.length > 0 && <section data-home-section="packages" className="home-wrap py-10">
      {heading('packagesHeading','Wedding & Event Packages')}<p className="mt-2 mb-5 text-gray-600">{editable('packagesBody','Compare the listed equipment and services. Delivery fees and tax are separate.')}</p>
      <div className="home-grid">{packages.map(pkg => <Link key={pkg.id} href={`/wedding-packages?package=${encodeURIComponent(pkg.id)}`} prefetch={false} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {pkg.image && <div className="relative aspect-[4/3]"><Image src={pkg.image} alt={pkg.name} fill sizes="(max-width:767px) 90vw, 30vw" className="object-cover" /></div>}
        <div className="p-5"><h3 className="text-lg font-bold">{pkg.name}</h3><p className="mt-2 text-sm">Up to {pkg.guests} guests</p><p className="mt-2 text-xl font-bold">{pkg.price === null ? 'Request a quote' : formatCurrency(pkg.price)}</p>{pkg.items && <ul className="mt-3 list-disc pl-4 text-sm text-gray-600">{pkg.items.slice(0,5).map((item,index) => <li key={index}>{item}</li>)}</ul>}</div>
      </Link>)}</div>
      <div className="mt-5">{action('packagesButton','VIEW ALL WEDDING PACKAGES','packagesUrl','/weddings')}</div>
    </section>}

    <section data-home-section="wedding" className="home-wrap py-9"><div className="home-split rounded-3xl bg-[#FAF4EA] p-6">
      {bannerImage && <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl"><Image src={bannerImage} alt="Wedding rentals" data-home-image-key="weddingBannerImage" fill sizes="(max-width:767px) 90vw, 45vw" className="object-cover" /></div>}
      <div>{heading('weddingBannerHeading','Planning a Wedding or Large Event?')}<p className="my-4">{editable('weddingBannerBody','Explore our premium wedding rental packages.')}</p>{action('weddingBannerButton','VIEW WEDDING RENTALS','weddingBannerUrl','/weddings')}</div>
    </div></section>

    <section data-home-section="event" className="home-wrap py-10"><p className="text-xs font-bold uppercase tracking-widest text-[#C85F00]">{editable('eventPlanningEyebrow','A Complete Solution')}</p>{heading('eventPlanningHeading','Full-Service Event Planning')}<p className="my-5 max-w-3xl text-gray-600">{editable('eventPlanningBody','Talk with our Riverdale team about your equipment, layout, delivery and setup needs.')}</p>{action('eventPlanningButton','Learn About Event Planning','eventPlanningUrl','/event-planning')}</section>

    <section data-home-section="seo" className="home-wrap py-9">{heading('seoHeading','Party Rentals in Riverdale & Downstate New York')}<p className="mt-3 text-sm leading-6 text-gray-600">{editable('seoBody','Explore tents, tables, chairs, inflatables and event rentals for Riverdale, selected Bronx neighborhoods and Lower Westchester. Choose your event date to check availability and review the delivery estimate for your address.')}</p>{seoSection}<Link href="/service-area#delivery-estimate" className="font-bold text-[#C85F00] underline">Check your delivery fee</Link></section>
  </div>
}
