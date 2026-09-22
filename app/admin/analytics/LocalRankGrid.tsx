'use client'

import { useEffect, useMemo, useState } from 'react'

type Point={id:string;row:number;col:number;lat:number;lng:number;rank:number|null;competitor?:string}
type Scan={configured:boolean;provider:string|null;keyword:string;gridSize:number;radiusMiles:number;scannedAt:string|null;points:Point[];metrics:{averageRank:number|null;top3:number;top10:number;found:number};reason?:string}

const DEFAULT_KEYWORDS=['party rentals','tent rentals','party tent rentals','table rentals','chair rentals','table and chair rentals','wedding rentals','bounce house rentals','water slide rentals','photo booth rentals']
function tone(rank:number|null){if(rank===null)return 'bg-slate-700 text-white';if(rank<=3)return 'bg-emerald-600 text-white';if(rank<=7)return 'bg-amber-300 text-slate-950';if(rank<=15)return 'bg-orange-500 text-white';return 'bg-red-600 text-white'}

export default function LocalRankGrid(){
 const [keyword,setKeyword]=useState(DEFAULT_KEYWORDS[0]),[gridSize,setGridSize]=useState(7),[radius,setRadius]=useState(12)
 const [data,setData]=useState<Scan|null>(null),[loading,setLoading]=useState(false),[selected,setSelected]=useState<Point|null>(null)
 async function load(run=false){
  setLoading(true)
  try{
   const q=new URLSearchParams({keyword,gridSize:String(gridSize),radiusMiles:String(radius)})
   const r=await fetch('/api/admin/local-rank?'+q.toString(),{method:run?'POST':'GET'})
   const j=await r.json()
   setData(j)
  }finally{setLoading(false)}
 }
 useEffect(()=>{void load(false)},[])
 const ordered=useMemo(()=>[...(data?.points||[])].sort((a,b)=>a.row-b.row||a.col-b.col),[data])
 return <section className="space-y-5" data-sc-local-rank-grid>
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
   <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
    <div><div className="text-xs font-bold uppercase tracking-[.16em] text-green-700">Local Search Rankings</div><h2 className="mt-1 text-xl font-bold text-slate-900">Greenville GeoGrid</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Measure Friendly Party Rental’s Google Maps position from a grid of search locations around Greenville. The center is an approximate city reference point, not a warehouse address.</p></div>
    <div className="flex flex-wrap gap-2">
     <select value={keyword} onChange={e=>setKeyword(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">{DEFAULT_KEYWORDS.map(k=><option key={k}>{k}</option>)}</select>
     <select value={gridSize} onChange={e=>setGridSize(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm">{[3,5,7,9,11,13].map(n=><option key={n} value={n}>{n}×{n}</option>)}</select>
     <select value={radius} onChange={e=>setRadius(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm">{[5,8,12,16,20,25].map(n=><option key={n} value={n}>{n} mi</option>)}</select>
     <button onClick={()=>void load(true)} disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading?'Scanning…':'Run Scan'}</button>
    </div>
   </div>
  </div>
  {!data?.configured&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold text-amber-950">Live local-rank provider is not connected</h3><p className="mt-1 text-sm text-amber-900">{data?.reason||'The grid is ready, but no live ranking provider is configured.'}</p><p className="mt-2 text-xs text-amber-800">No simulated, estimated or placeholder rankings are displayed.</p></div>}
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Average Rank',data?.metrics.averageRank?.toFixed(1)||'—'],['Top 3 Coverage',(data?.metrics.top3??0)+'%'],['Top 10 Coverage',(data?.metrics.top10??0)+'%'],['Points Found',String(data?.metrics.found??0)]].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">{a}</div><div className="mt-1 text-2xl font-bold text-slate-900">{b}</div></div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
   <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex justify-between gap-4"><div><h3 className="font-bold text-slate-900">{keyword}</h3><p className="text-xs text-slate-500">{data?.scannedAt?'Last scan '+new Date(data.scannedAt).toLocaleString():'No completed scan yet'}</p></div><div className="text-xs text-slate-500">1–3 green · 4–7 yellow · 8–15 orange · 16+ red</div></div>
    {ordered.length?<div className="mx-auto grid gap-2" style={{gridTemplateColumns:`repeat(${data?.gridSize||gridSize},minmax(42px,1fr))`,maxWidth:720}}>{ordered.map(p=><button key={p.id} onClick={()=>setSelected(p)} className={'aspect-square rounded-xl text-sm font-bold shadow-sm '+tone(p.rank)} title={`${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}>{p.rank??'20+'}</button>)}</div>:<div className="grid h-72 place-items-center text-center text-slate-400"><div><div className="mb-2 text-4xl">⌖</div><p className="font-semibold text-slate-600">No ranking scan stored yet</p><p className="mt-1 text-sm">Connect a live provider before running a Greenville GeoGrid scan.</p></div></div>}
   </div>
   <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Point Details</h3>{selected?<div className="mt-4 space-y-3 text-sm"><div><span className="text-slate-500">Rank</span><div className="text-3xl font-bold">#{selected.rank??'20+'}</div></div><div><span className="text-slate-500">Coordinates</span><div>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</div></div><div><span className="text-slate-500">Top competitor</span><div>{selected.competitor||'—'}</div></div></div>:<p className="mt-3 text-sm text-slate-500">Select a grid point after a live scan to inspect the result.</p>}</div>
  </div>
 </section>
}
