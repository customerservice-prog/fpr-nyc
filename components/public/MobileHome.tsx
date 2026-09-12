'use client'

import Link from 'next/link'
import Image from 'next/image'; import { useRouter } from 'next/navigation'; import { trackEvent } from '@/lib/gtag'
import type { ReactNode } from 'react'
import ReviewCarousel from './ReviewCarousel'
import { formatCurrency } from '@/lib/utils'
import { ImageOff } from 'lucide-react'
import YouTubeFacade from './YouTubeFacade'

interface MobileCategory {
slug: string
name: string
href: string
image?: string
}

interface MobilePopularItem {
id: string
name: string
slug: string | null
cost: number
picture: string | null
status?: string | null
category?: { name: string | null } | null
}

interface MobileHomeProps {
categories: MobileCategory[]
popularItems: MobilePopularItem[]
bounceItems: MobilePopularItem[]
weddingImage?: string | null; packages: { id: string; name: string; price: number; guests: number; image?: string | null; popular?: boolean; signature?: boolean }[]
seoSection: ReactNode
hero?: {
mobileImageUrl?: string | null
primaryActionValue?: string | null
primaryPosLeft?: number | null
primaryPosTop?: number | null
primaryPosWidth?: number | null
primaryPosHeight?: number | null
secondaryActionValue?: string | null
secondaryPosLeft?: number | null
secondaryPosTop?: number | null
secondaryPosWidth?: number | null
secondaryPosHeight?: number | null
focalX?: number | null
focalY?: number | null
} | null
heroEditMode?: {
  selected: 'image' | 'primary' | 'secondary' | null
  onSelect: (target: 'image' | 'primary' | 'secondary', coords?: { x: number; y: number }) => void
} | null
  content?: Record<string, string> | null
  contentEditMode?: {
    selectedKey: string | null
    onSelect: (key: string) => void
  } | null
  categoryEditMode?: {
    selectedSlug: string | null
    onSelect: (slug: string) => void
  } | null
}

const HERO_IMAGE = '/images/mobile-hero-event-scene-v4.png'

function EditableText({ id, value, as: Tag, className, contentEditMode }: { id: string; value: string; as: any; className?: string; contentEditMode?: { selectedKey: string | null; onSelect: (key: string) => void } | null }) {
  const C: any = Tag
  if (!contentEditMode) {
    return <C className={className}>{value}</C>
  }
  const isSelected = contentEditMode.selectedKey === id
  const cls = (className || '') + ' ' + (isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2 cursor-pointer' : 'cursor-pointer hover:outline hover:outline-2 hover:outline-blue-300 hover:outline-offset-2')
  return (
    <C
      className={cls}
      onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); contentEditMode.onSelect(id) }}
    >
      {value}
    </C>
  )
}

export default function MobileHome({ categories, popularItems, bounceItems, weddingImage, seoSection, packages, hero, heroEditMode, content, contentEditMode, categoryEditMode }: MobileHomeProps) { const router = useRouter(); const bounceCategory = categories.find((c) => c.slug === 'bounce-house-rentals'); const heroImageSrc = hero?.mobileImageUrl || HERO_IMAGE; const heroPrimaryHref = hero?.primaryActionValue || '/order-by-date'; const heroPrimaryPos = { left: `${hero?.primaryPosLeft ?? 17.6}%`, top: `${hero?.primaryPosTop ?? 35.8}%`, width: `${hero?.primaryPosWidth ?? 35}%`, height: `${hero?.primaryPosHeight ?? 6.7}%` }; const heroSecondaryHref = hero?.secondaryActionValue || '/category'; const heroSecondaryPos = { left: `${hero?.secondaryPosLeft ?? 53.1}%`, top: `${hero?.secondaryPosTop ?? 35.8}%`, width: `${hero?.secondaryPosWidth ?? 30.4}%`, height: `${hero?.secondaryPosHeight ?? 6.4}%` }; const heroFocalX = hero?.focalX ?? 0.5; const heroFocalY = hero?.focalY ?? 0.5; const handleCheckDate = () => { trackEvent('hero_check_date_click'); router.push(heroPrimaryHref) }; const handleBrowseRentals = () => { trackEvent('hero_browse_rentals_click') }
return (
<div>
<section className="relative w-full">
<div id="mobile-hero-cta" className="relative w-full" style={{ aspectRatio: '1024 / 1536' }} onClick={heroEditMode ? (e: any) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; heroEditMode.onSelect('image', { x, y }) } : undefined}><Image src={heroImageSrc} alt="Outdoor tent event at sunset with string lights, tables, and chairs set up for a celebration in Greenville, SC" fill priority sizes="100vw" className={heroEditMode && heroEditMode.selected === 'image' ? "object-cover ring-4 ring-blue-500" : "object-cover"} style={{ objectPosition: `${heroFocalX * 100}% ${heroFocalY * 100}%` }} />{heroEditMode && heroEditMode.selected === 'image' && (<div style={{ position: 'absolute', left: `${heroFocalX * 100}%`, top: `${heroFocalY * 100}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} className="w-6 h-6 rounded-full border-2 border-white bg-blue-500/70 shadow" />)}<button type="button" onClick={heroEditMode ? (e: any) => { e.preventDefault(); e.stopPropagation(); heroEditMode.onSelect('primary') } : handleCheckDate} aria-label="Check my event date availability" className={heroEditMode && heroEditMode.selected === 'primary' ? "absolute rounded-md ring-2 ring-blue-500" : "absolute rounded-md"} onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 4px white, 0 0 0 6px rgba(0,0,0,0.4)' }} onBlur={(e) => { e.currentTarget.style.boxShadow = '' }} style={heroPrimaryPos} /><Link href={heroSecondaryHref} onClick={heroEditMode ? (e: any) => { e.preventDefault(); e.stopPropagation(); heroEditMode.onSelect('secondary') } : handleBrowseRentals} aria-label="Browse all rental categories" prefetch={false} className={heroEditMode && heroEditMode.selected === 'secondary' ? "absolute rounded-md ring-2 ring-blue-500" : "absolute rounded-md"} onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 4px white, 0 0 0 6px rgba(0,0,0,0.4)' }} onBlur={(e) => { e.currentTarget.style.boxShadow = '' }} style={heroSecondaryPos} /></div>

</section>

<section className="px-4 py-6">
<EditableText id="shopCategoryHeading" as="h2" className="text-xl font-bold text-dark mb-4" value={content?.shopCategoryHeading || 'Shop by Category'} contentEditMode={contentEditMode} />
<div className="grid grid-cols-2 gap-3">
{categories.map((cat) => (
<Link key={cat.slug} href={cat.href} prefetch={false} onClick={categoryEditMode ? (e: any) => { e.preventDefault(); e.stopPropagation(); categoryEditMode.onSelect(cat.slug) } : undefined} className={categoryEditMode && categoryEditMode.selectedSlug === cat.slug ? "relative block rounded-xl overflow-hidden bg-gray-100 ring-2 ring-blue-500" : "relative block rounded-xl overflow-hidden bg-gray-100"} style={{ aspectRatio: '1 / 1' }}>
{cat.image ? (
<Image src={cat.image} alt={cat.name} fill sizes="50vw" className="object-cover" />
) : (
<div className="absolute inset-0 bg-gray-200" />
)}
<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
<span className="absolute bottom-2 left-2 right-2 text-white font-semibold text-sm drop-shadow">{cat.name}</span>
</Link>
))}
</div>
<Link href="/category" prefetch={false} className="block w-full text-center border-2 border-secondary text-secondary font-bold text-base py-3 rounded-lg mt-4">
<EditableText id="viewAllRentalsButton" as="span" value={content?.viewAllRentalsButton || 'VIEW ALL RENTALS'} contentEditMode={contentEditMode} />
</Link>
</section>

<section className="bg-secondary/10 border-y border-secondary/20 px-4 py-6 text-center">
<EditableText id="planningEventHeading" as="h2" className="text-lg font-bold text-dark mb-1" value={content?.planningEventHeading || 'Planning an Event?'} contentEditMode={contentEditMode} />
<EditableText id="planningEventBody" as="p" className="text-body text-sm mb-4" value={content?.planningEventBody || "Choose your event date to see what's available."} contentEditMode={contentEditMode} />
<Link href="/order-by-date" prefetch={false} className="inline-block w-full max-w-sm text-center bg-secondary text-white font-bold text-base py-4 rounded-lg shadow">
<EditableText id="planningEventButton" as="span" value={content?.planningEventButton || 'SELECT EVENT DATE'} contentEditMode={contentEditMode} />
</Link>
</section>

{bounceItems && bounceItems.length > 0 && ( <section className="py-6"> <div className="px-4 mb-3 flex items-center gap-2"> <span className="inline-block bg-accent text-white text-[10px] font-bold uppercase px-2 py-1 rounded"><EditableText id="bounceEyebrow" as="span" value={content?.bounceEyebrow || 'Kid Favorite'} contentEditMode={contentEditMode} /></span> <EditableText id="bounceHeading" as="h2" className="text-xl font-bold text-dark" value={content?.bounceHeading || 'Bounce Houses & Water Slides'} contentEditMode={contentEditMode} /> </div> <EditableText id="bounceBody" as="p" className="text-sm text-body px-4 mb-3" value={content?.bounceBody || 'Make your party unforgettable, browse our most fun rentals'} contentEditMode={contentEditMode} /> <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"> {bounceItems.map((item) => ( <Link key={item.id} href={item.slug ? `/items/${item.slug}` : '#'} prefetch={false} className="flex-shrink-0 w-[45%] snap-start bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"> <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}> {item.picture ? ( <Image src={item.picture} alt={item.name} fill sizes="45vw" className="object-cover" /> ) : ( <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-1 text-gray-400"> <ImageOff className="w-6 h-6" /> <span className="text-[9px] font-medium">Photo coming soon</span> </div> )} </div> <div className="p-3"> <p className="font-medium text-dark text-sm mb-1 truncate">{item.name}</p> <p className="text-sm font-bold text-dark">From {formatCurrency(item.cost)}</p> </div> </Link> ))} </div> <Link href="/category/bounce-house-rentals" prefetch={false} className="block w-full text-center border-2 border-secondary text-secondary font-bold text-base py-3 rounded-lg mt-4 mx-4" style={{ width: 'calc(100% - 2rem)' }}> <EditableText id="bounceButton" as="span" value={content?.bounceButton || 'VIEW ALL BOUNCE HOUSES & WATER SLIDES'} contentEditMode={contentEditMode} /> </Link> </section> )}{popularItems.length > 0 && (
<section className="py-6">
<EditableText id="popularHeading" as="h2" className="text-xl font-bold text-dark mb-4 px-4" value={content?.popularHeading || 'Popular Rentals'} contentEditMode={contentEditMode} />
<div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
{popularItems.map((item) => (
<Link
key={item.id}
href={item.slug ? `/items/${item.slug}` : '#'}
prefetch={false}
className="flex-shrink-0 w-[72%] snap-start bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
>
<div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
{item.picture ? (
<Image src={item.picture} alt={item.name} fill sizes="72vw" className="object-cover" />
) : (
<div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-1 text-gray-400">
<ImageOff className="w-6 h-6" />
<span className="text-[9px] font-medium">Photo coming soon</span>
</div>
)}
</div>
<div className="p-3">
<p className="font-medium text-dark text-sm mb-1 truncate">{item.name}</p>
<p className="text-sm font-bold text-dark">From {formatCurrency(item.cost)}</p>
{item.status && <p className="text-xs text-green-700 mt-0.5">{item.status}</p>}
</div>
</Link>
))}
</div>
</section>
)}

{packages.length > 0 && (<section className="bg-gradient-to-b from-pink-50 to-white py-8"><div className="px-4 mb-4"><EditableText id="packagesHeading" as="h2" className="text-xl font-bold text-dark" value={content?.packagesHeading || 'Wedding & Event Packages'} contentEditMode={contentEditMode} /><EditableText id="packagesBody" as="p" className="text-sm text-body mt-1" value={content?.packagesBody || 'All-in-one packages for weddings, ceremonies, and celebrations of any size.'} contentEditMode={contentEditMode} /></div><div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">{packages.map((pkg) => (<Link key={pkg.id} href={`/wedding-packages?package=${pkg.id}`} prefetch={false} className="flex-shrink-0 w-[72%] snap-start bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"><div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>{pkg.image ? (<Image src={pkg.image} alt={pkg.name} fill sizes="72vw" className="object-cover" />) : (<div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-3xl">🎉</div>)}{(pkg.popular || pkg.signature) && (<span className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold uppercase px-2 py-1 rounded">{pkg.signature ? 'Signature' : 'Most Popular'}</span>)}</div><div className="p-3"><p className="font-medium text-dark text-sm mb-1 truncate">{pkg.name}</p><p className="text-sm font-bold text-dark">{formatCurrency(pkg.price)}</p><p className="text-xs text-body mt-0.5">Up to {pkg.guests} guests</p></div></Link>))}</div><div className="px-4 mt-4"><Link href="/wedding-packages" prefetch={false} className="block w-full text-center border-2 border-secondary text-secondary font-bold text-sm py-3 rounded-lg"><EditableText id="packagesButton" as="span" value={content?.packagesButton || 'VIEW ALL WEDDING PACKAGES'} contentEditMode={contentEditMode} /></Link></div></section>)}<section className="bg-primary/20 py-8 px-4">
<EditableText id="rentingEasyHeading" as="h2" className="text-xl font-bold text-dark mb-6 text-center" value={content?.rentingEasyHeading || 'Renting Is Easy'} contentEditMode={contentEditMode} />
<div className="grid grid-cols-3 gap-3 text-center">
<div>
<div className="text-3xl mb-2">📅</div>
<EditableText id="step1Label" as="p" className="text-xs font-medium text-dark" value={content?.step1Label || 'Pick Your Date'} contentEditMode={contentEditMode} />
</div>
<div>
<div className="text-3xl mb-2">🛒</div>
<EditableText id="step2Label" as="p" className="text-xs font-medium text-dark" value={content?.step2Label || 'Choose Your Rentals'} contentEditMode={contentEditMode} />
</div>
<div>
<div className="text-3xl mb-2">🚚</div>
<EditableText id="step3Label" as="p" className="text-xs font-medium text-dark" value={content?.step3Label || 'We Deliver'} contentEditMode={contentEditMode} />
</div>
</div>
</section>
<ReviewCarousel />

<section className="relative w-full" style={{ height: '45vh' }}>
{weddingImage ? (
<Image src={weddingImage} alt="Wedding and large event rentals" fill sizes="100vw" className="object-cover" />
) : (
<div className="absolute inset-0 bg-gray-200" />
)}
<div className="absolute inset-0 bg-black/40" />
<div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
<EditableText id="weddingBannerHeading" as="h2" className="text-white text-xl font-bold mb-2 drop-shadow" value={content?.weddingBannerHeading || 'Planning a Wedding or Large Event?'} contentEditMode={contentEditMode} />
<EditableText id="weddingBannerBody" as="p" className="text-white/90 text-sm mb-4 drop-shadow" value={content?.weddingBannerBody || 'Explore our premium wedding rental packages.'} contentEditMode={contentEditMode} />
<Link href="/weddings" prefetch={false} className="inline-block bg-white text-dark font-bold text-sm px-6 py-3 rounded-lg shadow">
<EditableText id="weddingBannerButton" as="span" value={content?.weddingBannerButton || 'VIEW WEDDING RENTALS'} contentEditMode={contentEditMode} />
</Link>
</div>
</section>
<section className="bg-gray-50 py-6 px-4">
<div className="grid grid-cols-3 gap-2 text-center">
<div>
<div className="text-2xl mb-1">🏠</div>
<EditableText id="trust1Label" as="p" className="text-xs font-medium text-dark" value={content?.trust1Label || 'Local & Family Owned'} contentEditMode={contentEditMode} />
</div>
<div>
<div className="text-2xl mb-1">✨</div>
<EditableText id="trust2Label" as="p" className="text-xs font-medium text-dark" value={content?.trust2Label || 'Clean, Quality Equipment'} contentEditMode={contentEditMode} />
</div>
<div>
<div className="text-2xl mb-1">🚚</div>
<EditableText id="trust3Label" as="p" className="text-xs font-medium text-dark" value={content?.trust3Label || 'Delivery & Setup Available'} contentEditMode={contentEditMode} />
</div>
</div>
</section>

<section className="py-8 px-4 text-center bg-white"><EditableText id="eventPlanningEyebrow" as="p" className="text-[#E07B00] tracking-[0.2em] text-xs font-bold uppercase mb-1" value={content?.eventPlanningEyebrow || 'A Complete Solution'} contentEditMode={contentEditMode} /><EditableText id="eventPlanningHeading" as="h2" className="text-lg font-bold text-dark mb-3" value={content?.eventPlanningHeading || 'Full-Service Event Planning'} contentEditMode={contentEditMode} /><EditableText id="eventPlanningBody" as="p" className="text-body text-sm mb-4 max-w-sm mx-auto" value={content?.eventPlanningBody || 'We plan it and provide it, so there is no need to hire a separate event planner.'} contentEditMode={contentEditMode} /><Link href="/event-planning" prefetch={false} aria-label="Learn about our full-service event planning" className="btn-primary inline-block px-6 py-3 text-sm uppercase tracking-wide"><EditableText id="eventPlanningButton" as="span" value={content?.eventPlanningButton || 'Learn About Event Planning'} contentEditMode={contentEditMode} /></Link></section><section className="py-8 px-4 text-center"><EditableText id="youtubeEyebrow" as="p" className="text-[#E07B00] tracking-[0.2em] text-xs font-bold uppercase mb-1" value={content?.youtubeEyebrow || 'As Seen In Action'} contentEditMode={contentEditMode} /><EditableText id="youtubeHeading" as="h2" className="text-lg font-bold text-dark mb-4" value={content?.youtubeHeading || 'Watch Us on YouTube'} contentEditMode={contentEditMode} /><div className="relative w-full rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: '16 / 9' }}><YouTubeFacade videoId="LWQvMclQea4" title="Friendly Party Rental YouTube" className="absolute inset-0" /></div></section>{seoSection}
</div>
)
}
