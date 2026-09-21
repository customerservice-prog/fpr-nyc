import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid } from 'lucide-react'
import { SC_CATEGORY_IMAGES } from '@/lib/scCategoryImages'
const choices = [
 ['Tents','/category/tent-rentals','tent-rentals'],
 ['Tables & Chairs','/category/table-chair-rentals','table-chair-rentals'],
 ['Bounce Houses','/category/bounce-house-rentals','bounce-house-rentals'],
 ['Linens','/category/linen-rentals','linen-rentals'],
 ['Photo Booths','/category/photobooth-rentals','photobooth-rentals'],
 ['Weddings','/weddings','weddings'],
 ['Event Planning','/event-planning','event-planning'],
 ['And More','/category',''],
]
export default function PlanningShortcuts() {
 return <section data-sc-planning-images="20260921" aria-label="What are you planning" className="border-b border-gray-100 bg-white px-4 py-8 md:py-10">
  <div className="mx-auto max-w-6xl"><h2 className="mb-6 text-center text-2xl font-bold text-dark">What are you planning?</h2>
   <div className="grid grid-cols-4 gap-x-3 gap-y-6 md:grid-cols-8 md:gap-5">{choices.map(([name,href,slug])=><Link href={href} prefetch={false} key={name} className="group flex min-w-0 flex-col items-center text-center">
    <span className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-50 ring-2 ring-gray-100 transition group-hover:ring-secondary md:h-24 md:w-24">
    {slug ? <Image src={slug==='event-planning'?'/images/event-planning/outdoor-tent-setup/image.png':SC_CATEGORY_IMAGES[slug]} alt={name} fill sizes="(max-width:767px) 64px,96px" className="object-cover"/>:<LayoutGrid className="m-auto mt-5 h-6 w-6 text-secondary md:mt-8 md:h-8 md:w-8"/>}</span>
    <span className="mt-3 text-xs font-bold leading-5 text-dark md:text-sm">{name}</span></Link>)}</div>
  </div>
 </section>
}
