'use client'

import { useEffect, useRef, useState, useCallback, createElement as h } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const RENTSKETCH_ORIGIN = 'https://rentsketch.com'

type Status = 'loading' | 'ready' | 'error' | 'success'
type LaunchDetail = { source?: string; tent?: string; tentSlug?: string }

function fireAnalytics(eventName:string, params:Record<string,unknown>={}) {
  if (typeof window==='undefined') return
  const w=window as unknown as {gtag?:(...args:unknown[])=>void}
  if(typeof w.gtag==='function') w.gtag('event',eventName,params)
}

export default function DesignYourEventLauncher(){
 const [open,setOpen]=useState(false),[source,setSource]=useState('unknown'),[tent,setTent]=useState(''),[tentSlug,setTentSlug]=useState(''),[status,setStatus]=useState<Status>('loading'),[retryCount,setRetryCount]=useState(0)
 const timeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null)
 const closeOverlay=useCallback((fromPopstate?:boolean)=>{setOpen(false);setStatus('loading');setTent('');setTentSlug('');if(!fromPopstate&&typeof window!=='undefined'){const state=window.history.state as {designYourEvent?:boolean}|null;if(state?.designYourEvent)window.history.back()}},[])
 useEffect(()=>{const fn=(e:Event)=>{const d=(e as CustomEvent<LaunchDetail>).detail||{},src=d.source||'unknown';setSource(src);setTent(d.tent||'');setTentSlug(d.tentSlug||'');setStatus('loading');setRetryCount(0);setOpen(true);fireAnalytics('rentsketch_cta_clicked',{source:src,tent:d.tent||undefined,tent_slug:d.tentSlug||undefined});window.history.pushState({designYourEvent:true},'')};window.addEventListener('open-design-your-event',fn);return()=>window.removeEventListener('open-design-your-event',fn)},[])
 useEffect(()=>{const fn=()=>setOpen(w=>{if(w)setStatus('loading');return false});window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn)},[])
 useEffect(()=>{if(!open)return;if(timeoutRef.current)clearTimeout(timeoutRef.current);timeoutRef.current=setTimeout(()=>setStatus(s=>s==='loading'?'error':s),12000);return()=>{if(timeoutRef.current)clearTimeout(timeoutRef.current)}},[open,retryCount])
 useEffect(()=>{const fn=(event:MessageEvent)=>{if(event.origin!==RENTSKETCH_ORIGIN)return;const type=(event.data as {type?:string}|undefined)?.type;if(type==='rentsketch.ready'){setStatus('ready');if(timeoutRef.current)clearTimeout(timeoutRef.current);fireAnalytics('rentsketch_designer_ready',{source,tent:tent||undefined})}else if(type==='rentsketch.designSaved')fireAnalytics('rentsketch_design_saved',{source});else if(type==='rentsketch.quoteRequested'){setStatus('success');fireAnalytics('rentsketch_quote_requested',{source})}};window.addEventListener('message',fn);return()=>window.removeEventListener('message',fn)},[source,tent])
 if(!open)return null
 const p=new URLSearchParams();p.set('tenant','friendly');p.set('embed','1');if(tent||tentSlug){p.set('view','3d');p.set('focus','tent');p.set('autoplace','1');if(tent)p.set('tent',tent);if(tentSlug)p.set('tentSlug',tentSlug)}
 const src='https://rentsketch.com/designer/?'+p.toString(), title=tent?`3D Preview — ${tent}`:'Design Your Event'
 return h('div',{className:'fixed inset-0 z-[100] bg-white flex flex-col',role:'dialog','aria-modal':'true','aria-label':title},
  h('div',{className:'flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0 bg-white'},h('span',{className:'font-bold text-dark'},title),h('button',{type:'button','aria-label':'Close Event Designer',onClick:()=>closeOverlay(),className:'p-2 -mr-2 text-gray-600 hover:text-dark'},h(X,{size:24}))),
  h('div',{className:'relative flex-1 min-h-0'},
   status==='loading'?h('div',{className:'absolute inset-0 flex items-center justify-center bg-white'},h('p',{className:'text-body text-sm'},tent?`Loading ${tent} in 3D...`:'Loading your Friendly Event Designer...')):null,
   status==='error'?h('div',{className:'absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('p',{className:'text-dark font-semibold'},'We ran into a problem loading the Event Designer.'),h('div',{className:'flex flex-wrap justify-center gap-3'},h('button',{type:'button',onClick:()=>{setStatus('loading');setRetryCount(c=>c+1)},className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Try Again'),h(Link,{href:'/category',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Browse Rentals'),h(Link,{href:'/contact_us',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Contact Us'))):null,
   status==='success'?h('div',{className:'absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('h2',{className:'text-2xl font-bold text-dark'},'Your design was sent to Friendly Party Rental!'),h('p',{className:'text-body max-w-md'},'We will follow up to confirm final pricing and availability for your event.'),h(Link,{href:'/category',onClick:()=>closeOverlay(),className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Browse Rentals')):null,
   h('iframe',{key:'iframe-'+retryCount+'-'+tentSlug,src,title:tent?`${tent} 3D RentSketch Preview`:'Friendly Party Rental Event Designer',className:'absolute inset-0 w-full h-full border-0'+(status==='success'?' invisible':''),allow:'fullscreen'})
  ))
}
