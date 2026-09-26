'use client'

import { useState } from 'react'
import CategoryCard from '@/components/public/CategoryCard'
import { PUBLIC_CATEGORIES } from '@/lib/utils'

export default function CategoryBrowse({ pictures }: { pictures: Record<string,string> }) {
  const [search,setSearch]=useState('')
  const term=search.trim().toLowerCase()
  const filtered=PUBLIC_CATEGORIES.filter(category =>
    category.slug !== 'order-by-date' &&
    (category.name+' '+category.slug.replaceAll('-',' ')).toLowerCase().includes(term)
  )
  return <div className="max-w-7xl mx-auto px-4 py-12">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold text-dark">Browse All Rentals</h1><p className="mt-2 text-sm text-gray-600">Browse Greenville rental categories or search by what you need for your event.</p></div>
      <label className="text-sm font-semibold text-gray-700">Search categories
        <input type="search" placeholder="Tents, chairs, linens..." value={search} onChange={event=>setSearch(event.target.value)} className="mt-1 block w-full rounded border px-4 py-2 text-sm sm:w-64"/>
      </label>
    </div>
    <p className="mb-4 text-sm text-gray-500" role="status">{filtered.length} {filtered.length===1?'category':'categories'}</p>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {filtered.map(category=><CategoryCard key={category.slug} name={category.name} href={category.href} image={pictures[category.slug]||category.image}/>)}
    </div>
    {!filtered.length&&<div className="mt-8 rounded-xl border border-dashed bg-gray-50 p-6 text-sm text-gray-700">No category matches that search. Try a broader term or <a href="/order-by-date" className="font-bold text-blue-700 underline">start with your event date</a>.</div>}
  </div>
}
