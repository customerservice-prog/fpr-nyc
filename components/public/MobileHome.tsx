'use client'
import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Home, Sparkles, Truck, CalendarCheck, MousePointerClick } from 'lucide-react'
import CategoryCard from './CategoryCard'
import HeroSection from './HeroSection'
import StorefrontDesigner from './StorefrontDesigner'
import WeddingPackageCard from './WeddingPackageCard'
import ReviewCarousel from './ReviewCarousel'
import HomeCategoryGrid from './HomeCategoryGrid'
import HomeWeddingBanner from './HomeWeddingBanner'
import styles from './MobileHome.module.css'
import HomeYouTube from './HomeYouTube'
import { SC_CATEGORY_IMAGES } from '@/lib/scCategoryImages'
import { formatCurrency } from '@/lib/utils'
interface MobileCategory {slug:string;name:string;href:string;image?:string}
interface MobilePopularItem {id:string;name:string;slug:string|null;cost:number;picture:string|null;status?:string|null;category?:{name:string|null}|null}
export interface MobileHomeProps {categories:MobileCategory[];desktopCategories?:MobileCategory[];popularItems:MobilePopularItem[];bounceItems:MobilePopularItem[];weddingImage?:string|null;device?:'mobile'|'tablet'|'desktop';packages:{id:string;name:string;price:number;guests:number;image?:string|null;items?:string[];popular?:boolean;signature?:boolean}[];seoSection:ReactNode;hero?:any;heroEditMode?:{selected:'image'|'primary'|'secondary'|null;onSelect:(target:'image'|'primary'|'secondary',coords?:{x:number;y:number})=>void};content?:Record<string,string>|null;contentEditMode?:{selectedKey:string|null;onSelect:(key:string)=>void};categoryEditMode?:{selectedSlug:string|null;onSelect:(slug:string)=>void}}
export default function MobileHome({categories,popularItems,bounceItems,packages,seoSection,hero,heroEditMode,content,contentEditMode,categoryEditMode}:MobileHomeProps){
 const text=(key:string,fallback:string)=>content?.[key]||fallback
 const order=categories.find(c=>c.slug==='order-by-date')||{slug:'order-by-date',name:'Order by Date',href:'/order-by-date',image:'/images/order-by-date.png'}
 const list=[order,...categories.filter(c=>c.slug!=='order-by-date')]
 const editable=(key:string,fallback:string)=><span onClick={contentEditMode?()=>contentEditMode.onSelect(key):undefined} className={contentEditMode?'cursor-text hover:outline hover:outline-blue-400':''}>{text(key,fallback)}</span>
 const savedImage=hero?.mobileImageUrl
 const cleanImage=typeof savedImage==='string'&&!savedImage.includes('mobile-hero-event-scene')?savedImage:undefined
 const product=(item:MobilePopularItem)=><Link key={item.id} href={item.slug?'/items/'+item.slug:'/category'} prefetch={false} className="home-product">
  <div className="relative aspect-[4/3] bg-white">{item.picture?<Image src={item.picture} alt={item.name} fill sizes="(max-width:599px) 50vw, (max-width:767px) 33vw, 25vw" className="object-contain p-2"/>:<div className="absolute inset-0 grid place-items-center text-xs text-gray-400">Photo coming soon</div>}</div>
  <div className="home-product-copy"><p className="font-bold">{item.name}</p><p className="home-product-price">From {formatCurrency(item.cost)}</p></div>
 </Link>
 return <div data-home-layout="mobile" data-sc-parity="20260921" className={`${styles.home} bg-white text-[#0B1F3A]`}>
  <div onClickCapture={heroEditMode?e=>{e.preventDefault();const link=(e.target as HTMLElement).closest('a');heroEditMode.onSelect(link?(link.textContent?.includes('CHECK MY DATE')?'primary':'secondary'):'image')}:undefined}><HeroSection mobile image={cleanImage} primaryHref={hero?.primaryActionValue} secondaryHref={hero?.secondaryActionValue}/></div>
  <section data-home-section="trust" className="home-wrap py-5"><div className="grid grid-cols-3 divide-x rounded-2xl border bg-[#FAFAF8] py-4">{[Home,Sparkles,Truck].map((Icon,i)=><div key={i} className="px-2 text-center"><Icon className="mx-auto mb-2 h-5 w-5 text-[#E07B00]"/><p className="text-xs font-bold">{editable(`trust${i+1}Label`,['Local & Family Owned','Clean, Quality Equipment','Delivery & Setup Available'][i])}</p></div>)}</div></section>
  <section data-home-section="planning" className="home-wrap py-6"><div className="rounded-3xl bg-[#0B1F3A] p-6 text-white"><h2 className="home-heading">{editable('planningEventHeading','Planning an Event?')}</h2><p className="mt-2 mb-5 text-white/85">{editable('planningEventBody',"Choose your event date to see what's available.")}</p><Link href="/order-by-date" prefetch={false} className="home-button">{editable('planningEventButton','SELECT EVENT DATE')}</Link></div></section>
  <HomeYouTube/>
  <HomeCategoryGrid categories={categories} mobile categoryEditMode={categoryEditMode}/>
  {popularItems.length>0&&<section data-home-section="popular" className="bg-[#FAFAF8] px-4 py-9"><h2 className="text-2xl font-bold">{editable('popularHeading','Popular Rentals')}</h2><p className="mt-2 text-sm leading-6 text-gray-600">Booked most often across recent Greenville orders, with a mix of rental categories.</p><div className="home-products mt-5">{popularItems.map(product)}</div><Link href="/popular-rentals" prefetch={false} className="mt-5 block rounded-xl border border-[#0B1F3A] p-3 text-center font-bold text-[#0B1F3A]">VIEW POPULAR RENTALS</Link></section>}
  {bounceItems.length>0&&<section data-home-section="bounce" className="px-4 py-9"><p className="text-xs font-bold uppercase tracking-widest text-[#C85F00]">{editable('bounceEyebrow','Kid Favorite')}</p><h2 className="mt-2 text-2xl font-bold">{editable('bounceHeading','Bounce Houses & Water Slides')}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{editable('bounceBody','Make your party unforgettable, browse our most fun rentals')}</p><div className="home-products mt-5">{bounceItems.slice(0,8).map(product)}</div><Link href="/category/bounce-house-rentals" prefetch={false} className="mt-5 block rounded-xl border border-[#0B1F3A] p-3 text-center font-bold text-[#0B1F3A]">{editable('bounceButton','VIEW ALL BOUNCE HOUSES & WATER SLIDES')}</Link></section>}
  <StorefrontDesigner/>
  <section data-home-section="steps" className="bg-[#FFF8E8] px-4 py-10"><h2 className="text-center text-2xl font-bold">{editable('rentingEasyHeading','Renting Is Easy')}</h2><div className="mt-6 grid gap-3">{[CalendarCheck,MousePointerClick,Truck].map((Icon,i)=><div key={i} className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-white p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0B1F3A] text-[#F4C542]"><Icon size={25}/></span><div><h3 className="font-bold">{editable(`step${i+1}Label`,['Pick Your Date','Choose Your Rentals','We Deliver'][i])}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{['Check your event date and delivery schedule.','Choose equipment and review your order details.','Our crew delivers and collects your rentals.'][i]}</p></div></div>)}</div></section>
  <ReviewCarousel/>
  {packages.length>0&&<section data-home-section="packages" className="px-4 py-9"><h2 className="text-2xl font-bold">{editable('packagesHeading','Wedding & Event Packages')}</h2><p className="mb-6 mt-2 text-sm leading-6 text-gray-600">Compare the listed equipment and services. Travel fees and tax are separate.</p><div className="grid gap-5">{packages.map((pkg,i)=><WeddingPackageCard key={pkg.id} {...pkg} items={pkg.items||[]} image={pkg.image||undefined} packageNumber={i+1}/>)}</div><Link href="/weddings" prefetch={false} className="mt-5 block rounded-xl bg-[#E07B00] p-3 text-center font-bold text-white">{editable('packagesButton','VIEW ALL WEDDING PACKAGES')}</Link></section>}
  <HomeWeddingBanner/>
  <section data-home-section="event" className="bg-[#FAF4EA] px-5 py-9"><p className="text-xs font-extrabold uppercase tracking-widest text-[#C85F00]">{editable('eventPlanningEyebrow','A Complete Solution')}</p><h2 className="mt-2 text-2xl font-bold">{editable('eventPlanningHeading','Full-Service Event Planning')}</h2><p className="my-4 leading-7 text-gray-600">Talk with our Greenville team about your equipment, layout, delivery and setup needs.</p><Link href="/event-planning" className="inline-block rounded-xl bg-[#0B1F3A] px-5 py-3 font-bold text-white">{editable('eventPlanningButton','Learn About Event Planning')}</Link></section>
  <section data-home-section="seo" className="px-4 py-8"><h2 className="text-2xl font-bold">Party Rentals in Greenville &amp; Upstate SC</h2>{seoSection}<Link href="/service-area#delivery-estimate" className="font-bold text-[#C85F00] underline">Check your delivery fee</Link></section>
 </div>
}
