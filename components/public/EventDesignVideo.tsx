'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/gtag'

const DEMO_SECONDS = 32

export default function EventDesignVideo() {
 const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null)
 const startedTracked=useRef(false),completedTracked=useRef(false)
 const [load,setLoad]=useState(false),[playError,setPlayError]=useState(false),[completed,setCompleted]=useState(false)
 useEffect(()=>{
  if(!host.current)return
  const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)setLoad(true);else video.current?.pause()},{rootMargin:'150px',threshold:0.1})
  observer.observe(host.current);return()=>observer.disconnect()
 },[])
 useEffect(()=>{
  const el=video.current;if(!load||!el)return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const play=()=>{if(!reduced)el.play().then(()=>setPlayError(false)).catch(()=>setPlayError(true))}
  const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)play();else el.pause()},{threshold:0.25})
  observer.observe(el);el.addEventListener('loadeddata',play)
  return()=>{observer.disconnect();el.removeEventListener('loadeddata',play);el.pause()}
 },[load])

 const trackStarted=()=>{if(startedTracked.current)return;startedTracked.current=true;trackEvent('rentsketch_demo_started',{source:'sc_quick_demo',duration_seconds:DEMO_SECONDS})}
 const trackCompleted=()=>{if(completedTracked.current)return;completedTracked.current=true;setCompleted(true);trackEvent('rentsketch_demo_completed',{source:'sc_quick_demo',duration_seconds:DEMO_SECONDS})}
 const action=(name:'layout_help'|'check_date')=>trackEvent('rentsketch_demo_cta_click',{source:'sc_quick_demo',action:name})

 return <div ref={host} className="overflow-hidden rounded-2xl border border-white/20 bg-[#061324] shadow-xl" data-sc-designer-video="20260922" data-rentsketch-demo>
  <div className="flex flex-wrap justify-between gap-2 px-4 py-3 text-xs text-white/80"><strong>See the RentSketch idea in 32 seconds</strong><span>Quick demo · no account needed</span></div>
  <video ref={video} src={load?'/videos/event-design-walkthrough-v2.mp4':undefined} poster="/videos/event-design-walkthrough-v2.jpg" muted loop playsInline controls preload={load?'metadata':'none'} className="aspect-video w-full" aria-label="32-second RentSketch animated 2D and 3D event planning walkthrough" onPlay={trackStarted} onTimeUpdate={()=>{const el=video.current;if(!el)return;const duration=el.duration;if(el.currentTime>=DEMO_SECONDS-.6||(Number.isFinite(duration)&&duration>0&&el.currentTime>=duration-.6))trackCompleted()}}/>
  {playError&&<button type="button" onClick={()=>video.current?.play().catch(()=>{})} className="m-3 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0B1F3A]">Play walkthrough</button>}
  <div data-sc-demo-handoff data-demo-complete={completed?'true':'false'} className="grid gap-5 border-t border-white/15 bg-[#0B1F3A] p-5 md:grid-cols-[1.25fr_.75fr] md:items-center md:p-6">
   <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F4C542]">{completed?'You just saw the workflow':'Quick look first'}</p><h3 className="mt-2 text-xl font-black text-white md:text-2xl">Want help turning this into your Riverdale layout?</h3><p className="mt-2 text-sm leading-6 text-white/75">Tell our Riverdale team your guest count, date and equipment ideas. We can help plan the rental layout and confirm what is actually available. Online Riverdale RentSketch designer access is not active yet.</p></div>
   <div className="grid gap-2">
    <Link href="/contact_us" onClick={()=>action('layout_help')} className="flex min-h-12 items-center justify-center rounded-xl bg-[#F4C542] px-4 py-3 text-center text-sm font-extrabold text-[#0B1F3A]">Get Riverdale Layout Help</Link>
    <Link href="/order-by-date" onClick={()=>action('check_date')} className="flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-4 py-3 text-center text-sm font-extrabold text-white">Check My Event Date</Link>
   </div>
  </div>
  <p className="px-4 py-3 text-xs leading-5 text-white/70">Rendered from RentSketch models, not a recording of the controls. Layouts are illustrative; our team confirms equipment, dimensions, availability and pricing.</p>
 </div>
}
