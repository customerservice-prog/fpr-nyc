'use client'
import {useState} from 'react'
import Link from 'next/link'
import {SC_SERVICE_AREAS} from '@/lib/scServiceAreas'
export default function ServiceAreaDirectory(){
 const [search,setSearch]=useState('');const term=search.trim().toLowerCase()
 const filtered=SC_SERVICE_AREAS.filter(area=>(area.name+' '+area.zips.join(' ')).toLowerCase().includes(term))
 return <section id="communities" className="mx-auto max-w-6xl px-4 py-10" data-sc-service-directory>
  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1F3A]">Find your community</h2><p className="mt-2 text-sm text-gray-600">Open your local rental guide or search by city or ZIP code. Delivery is confirmed for your event address and date.</p></div><label className="text-sm font-semibold">City or ZIP<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Greer or 29650" className="mt-1 block w-full rounded-xl border p-3 sm:w-64"/></label></div>
  <p aria-live="polite" className="mb-4 text-sm text-gray-500">{filtered.length} matching communities</p>
  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(area=><li key={area.slug} className="break-words rounded-xl border bg-gray-50 text-sm leading-6"><Link href={area.href} prefetch={false} className="block rounded-xl p-4 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2"><span className="font-bold text-blue-800 underline">{area.name}, SC</span><span className="mt-1 block">Listed ZIP codes: {area.zips.join(', ')}</span><span className="mt-2 block text-xs">View rentals and delivery information →</span></Link></li>)}</ul>
  {!filtered.length&&<p className="rounded-xl bg-amber-50 p-5">Your town is not in this directory. Try the delivery fee checker or contact us to confirm service.</p>}
 </section>
}
