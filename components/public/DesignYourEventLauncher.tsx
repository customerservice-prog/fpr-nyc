'use client'

import { useEffect, useRef, useState, useCallback, createElement as h } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

import { NYC_RENTSKETCH_TENANT } from '@/lib/nycRentSketch'

const RENTSKETCH_ORIGIN = 'https://rentsketch.com'

type Status = 'loading' | 'ready' | 'error' | 'success'
type LaunchDetail = { source?: string; tent?: string; tentSlug?: string }

function fireAnalytics(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag !== 'function') return
  w.gtag('event', eventName, params)
}

export default function DesignYourEventLauncher() {
  const [open,setOpen]=useState(false),[source,setSource]=useState('unknown'),[tent,setTent]=useState(''),[tentSlug,setTentSlug]=useState(''),[status,setStatus]=useState<Status>('loading'),[errorReason,setErrorReason]=useState(''),[retryCount,setRetryCount]=useState(0)
  const timeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null)
  const isTentPreview=Boolean(tent||tentSlug)
  const closeOverlay=useCallback((fromPopstate?:boolean)=>{setOpen(false);setStatus('loading');setErrorReason('');setTent('');setTentSlug('');if(!fromPopstate&&typeof window!=='undefined'){const state=window.history.state as {designYourEvent?:boolean}|null;if(state&&state.designYourEvent)window.history.back()}},[])

  useEffect(()=>{function handleOpen(e:Event){if(!NYC_RENTSKETCH_TENANT){window.location.assign('/design-your-event');return}const detail=(e as CustomEvent<LaunchDetail>).detail||{},src=detail.source||'unknown';setSource(src);setTent(detail.tent||'');setTentSlug(detail.tentSlug||'');setStatus('loading');setErrorReason('');setRetryCount(0);setOpen(true);fireAnalytics('rentsketch_cta_clicked',{source:src,tent:detail.tent||undefined,tent_slug:detail.tentSlug||undefined});if(typeof window!=='undefined')window.history.pushState({designYourEvent:true},'')}window.addEventListener('open-design-your-event',handleOpen);return()=>window.removeEventListener('open-design-your-event',handleOpen)},[])
  useEffect(()=>{function handlePop(){setOpen(wasOpen=>{if(wasOpen){setStatus('loading');setErrorReason('')}return false})}window.addEventListener('popstate',handlePop);return()=>window.removeEventListener('popstate',handlePop)},[])
  useEffect(()=>{if(typeof document==='undefined')return;if(!open)return;const scrollY=window.scrollY;const html=document.documentElement;const body=document.body;const prevHtmlOverflow=html.style.overflow;const prevBodyOverflow=body.style.overflow;const prevBodyPosition=body.style.position;const prevBodyTop=body.style.top;const prevBodyWidth=body.style.width;html.style.overflow='hidden';body.style.overflow='hidden';body.style.position='fixed';body.style.top='-'+scrollY+'px';body.style.width='100%';return()=>{html.style.overflow=prevHtmlOverflow;body.style.overflow=prevBodyOverflow;body.style.position=prevBodyPosition;body.style.top=prevBodyTop;body.style.width=prevBodyWidth;window.scrollTo(0,scrollY)}},[open])
  useEffect(()=>{if(!open)return;if(timeoutRef.current)clearTimeout(timeoutRef.current);if(isTentPreview)return;timeoutRef.current=setTimeout(()=>{setStatus(s=>{if(s!=='loading')return s;setErrorReason('RentSketch did not report ready within 12 seconds');fireAnalytics('rentsketch_designer_error',{source,reason:'parent_timeout'});return'error'})},12000);return()=>{if(timeoutRef.current)clearTimeout(timeoutRef.current)}},[open,retryCount,source,isTentPreview])

  useEffect(()=>{function handleMessage(event:MessageEvent){if(event.origin!==RENTSKETCH_ORIGIN)return;const data=event.data as {type?:string;reason?:unknown;mode?:string;tentId?:string;renderer?:string}|undefined,type=data&&data.type;if(type==='rentsketch.ready'){if(isTentPreview&&data?.mode!=='tent-preview')return;setErrorReason('');setStatus('ready');if(timeoutRef.current)clearTimeout(timeoutRef.current);fireAnalytics('rentsketch_designer_ready',{source,tent:tent||undefined,tent_id:data?.tentId,mode:data?.mode,renderer:data?.renderer})}else if(type==='rentsketch.error'){const reason=typeof data?.reason==='string'&&data.reason.trim()?data.reason.trim():'RentSketch reported an unknown preview error';setErrorReason(reason);setStatus('error');if(timeoutRef.current)clearTimeout(timeoutRef.current);console.error('RentSketch embedded designer error:',reason);fireAnalytics('rentsketch_designer_error',{source,tent:tent||undefined,reason})}else if(type==='rentsketch.designSaved')fireAnalytics('rentsketch_design_saved',{source});else if(type==='rentsketch.quoteRequested'){setStatus('success');fireAnalytics('rentsketch_quote_requested',{source})}}window.addEventListener('message',handleMessage);return()=>window.removeEventListener('message',handleMessage)},[source,tent,isTentPreview])

  if(!open)return null
  const designerSrc=(()=>{const p=new URLSearchParams();p.set('tenant',NYC_RENTSKETCH_TENANT||'');p.set('embed','1');if(isTentPreview){p.set('view','3d');p.set('focus','tent');p.set('autoplace','1');if(tent)p.set('tent',tent);if(tentSlug)p.set('tentSlug',tentSlug)}return'https://rentsketch.com/designer/?'+p.toString()})()
  const closeButton=h('button',{key:'close',type:'button','aria-label':'Close Event Designer',onClick:()=>closeOverlay(),className:'p-2 -mr-2 text-gray-600 hover:text-dark'},h(X,{size:24}))
  const title=tent?`3D Preview — ${tent}`:'Design Your Event'
  const topBar=h('div',{key:'topbar',className:'flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0 bg-white'},h('span',{key:'title',className:'font-bold text-dark'},title),closeButton)
  const loadingBadge=status==='loading'?h('div',{key:'loading',className:'absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/95 shadow px-4 py-2 pointer-events-none'},h('p',{className:'text-body text-sm'},isTentPreview?`Preparing ${tent||'tent'} in 3D...`:'Loading your Friendly Event Designer...')):null
  const errorPanel=status==='error'?h('div',{key:'error',className:'absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('p',{key:'msg',className:'text-dark font-semibold'},'We ran into a problem loading the Event Designer.'),errorReason?h('p',{key:'reason',className:'text-body text-sm max-w-xl break-words'},errorReason):null,h('div',{key:'actions',className:'flex flex-wrap justify-center gap-3'},h('button',{key:'retry',type:'button',onClick:()=>{setErrorReason('');setStatus('loading');setRetryCount(c=>c+1)},className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Try Again'),h(Link,{key:'browse',href:'/category',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Browse Rentals'),h(Link,{key:'contact',href:'/contact_us',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Contact Us'))):null
  const successPanel=status==='success'?h('div',{key:'success',className:'absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('h2',{key:'h',className:'text-2xl font-bold text-dark'},'Your design was sent to Friendly Party Rental!'),h('p',{key:'p',className:'text-body max-w-md'},'We will follow up to confirm final pricing and availability for your Greenville-area event.'),h('div',{key:'actions',className:'flex flex-wrap justify-center gap-3'},h(Link,{key:'browse',href:'/category',onClick:()=>closeOverlay(),className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Browse Rentals'),h('button',{key:'return',type:'button',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Return to Friendly Party Rental'),h(Link,{key:'contact',href:'/contact_us',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Contact Us'))):null
  const iframeEl=h('iframe',{key:'iframe-'+retryCount+'-'+tentSlug,src:designerSrc,title:tent?`${tent} 3D RentSketch Preview`:'Friendly Party Rental Event Designer',className:'absolute inset-0 w-full h-full border-0'+(status==='success'?' invisible':''),allow:'fullscreen'})
  const canvasArea=h('div',{key:'canvas',className:'relative flex-1 min-h-0'},iframeEl,loadingBadge,errorPanel,successPanel)
  return h('div',{className:'fixed inset-0 z-[100] bg-white flex flex-col',role:'dialog','aria-modal':'true','aria-label':tent?`${tent} 3D preview`:'Friendly Event Designer'},topBar,canvasArea)
}
