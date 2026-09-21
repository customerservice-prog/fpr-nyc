'use client'
import { useState } from 'react'
const serviceAreas = [
  {
    region: 'Greenville Metro',
    cities: [
      'Greenville (29601, 29602, 29603, 29604, 29605, 29606, 29607, 29608, 29609, 29611, 29612, 29613, 29614, 29615, 29617)',
      'Taylors (29687)',
      'Piedmont (29673)',
      'Berea (29617)',
      'Simpsonville (29680)',
      'Anderson (29621)',
      'Spartanburg (29301)',
      'Travelers Rest (29690)',
      'Fountain Inn (29644)',
      'Mauldin (29662)',
      'Duncan (29334)',
      'Powdersville (29642)',
    ],
  },
  {
    region: 'Eastern Suburbs',
    cities: [
      'Williamston (29697)',
      'Pelzer (29669)',
      'Pickens (29671)',
      'Liberty (29657)',
      'Seneca (29678)',
      'Laurens (29360)',
      'Greer (29650)',
      'Easley (29640)',
    ],
  },
  {
    region: 'Southern & Western',
    cities: [
      'Clemson (29631)',
      'Woodruff (29388)',
      'Boiling Springs (29316)',
      'Inman (29349)',
      'Landrum (29356)',
      'Gray Court (29645)',
      'Central (29630)',
      'Six Mile (29682)',
      'Belton (29627)',
    ],
  },
  {
    region: 'Northern',
    cities: [
      'Honea Path (29654)',
      'Marietta (29661)',
      'Wade Hampton (29609)',
      'Judson (29611)',
      'Parker (29609)',
      'Gantt (29605)',
    ],
  },
]

export default function ServiceAreaDirectory(){const [search,setSearch]=useState('');const cities=Array.from(new Set(serviceAreas.flatMap(a=>a.cities))).sort();const filtered=cities.filter(city=>city.toLowerCase().includes(search.trim().toLowerCase()));return <section className="mx-auto max-w-6xl px-4 py-10"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold text-[#0B1F3A]">Find your community</h2><p className="mt-2 text-sm text-gray-600">Search the listed communities by city or ZIP code.</p></div><label className="text-sm font-semibold">City or ZIP<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Greer or 29650" className="mt-1 block w-full rounded-xl border p-3 sm:w-64"/></label></div><p aria-live="polite" className="mb-4 text-sm text-gray-500">{filtered.length} matching communities</p><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(city=><li key={city} className="break-words rounded-xl border bg-gray-50 p-4 text-sm leading-6">{city}</li>)}</ul>{!filtered.length&&<p className="rounded-xl bg-amber-50 p-5">Your town is not in this directory. Try the delivery fee checker above or contact us to confirm service.</p>}</section>}
