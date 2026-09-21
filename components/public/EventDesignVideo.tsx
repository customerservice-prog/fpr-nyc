'use client'
import { useEffect, useRef, useState } from 'react'
export default function EventDesignVideo() {
 const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null)
 const [load,setLoad]=useState(false),[playError,setPlayError]=useState(false)
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
 return <div ref={host} className="overflow-hidden rounded-2xl border border-white/20 bg-[#061324] shadow-xl" data-sc-designer-video="20260921"><div className="flex flex-wrap justify-between gap-2 px-4 py-3 text-xs text-white/80"><strong>Watch an idea become an event</strong><span>RentSketch animated walkthrough</span></div><video ref={video} src={load?'/videos/event-design-walkthrough-v2.mp4':undefined} poster="/videos/event-design-walkthrough-v2.jpg" muted loop playsInline controls preload={load?'metadata':'none'} className="aspect-video w-full" aria-label="RentSketch animated 2D and 3D event planning walkthrough"/>{playError&&<button type="button" onClick={()=>video.current?.play().catch(()=>{})} className="m-3 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0B1F3A]">Play walkthrough</button>}<p className="px-4 py-3 text-xs leading-5 text-white/70">Rendered from RentSketch models, not a recording of the controls. Layouts are illustrative; our team confirms equipment, dimensions, availability and pricing.</p></div>
}
