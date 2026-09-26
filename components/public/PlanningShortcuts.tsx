import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid } from 'lucide-react'
import { NY_PLANNING_SHORTCUTS } from '@/lib/nyHomeMedia'
// Same desktop DOM, 64px crops, labels, wrapping and spacing as NY DesktopHome.
export default function PlanningShortcuts() {
 return <section data-sc-planning-images="exact-ny-20260921" data-home-section="planning" className="border-b border-gray-100 bg-white py-10" aria-label="What are you planning">
  <div className="mx-auto max-w-6xl px-6">
   <h2 className="mb-8 text-center text-2xl font-bold text-dark">What are you planning?</h2>
   <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
    {NY_PLANNING_SHORTCUTS.map(shortcut => <Link key={shortcut.href} href={shortcut.href} prefetch={false} className="group flex w-28 flex-col items-center">
     <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#F6F4F2] ring-2 ring-transparent transition-all group-hover:ring-primary/40">
      {shortcut.image ? <Image src={shortcut.image} alt={shortcut.name} fill sizes="64px" className="object-cover"/> : <LayoutGrid className="h-7 w-7 text-primary" aria-hidden="true"/>}
     </span>
     <span className="mt-3 text-center text-sm font-medium leading-snug text-dark">{shortcut.name}</span>
    </Link>)}
   </div>
  </div>
 </section>
}
