'use client'

import { useEffect, useRef, useState, useCallback, createElement as h } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { parseBookingHandoff } from '@/lib/rentsketchBooking'
import { NYC_RENTSKETCH_TENANT, nycRentSketchEmbedUrl } from '@/lib/nycRentSketch'

const RENTSKETCH_ORIGIN = 'https://rentsketch.com'

type Status = 'loading' | 'ready' | 'error' | 'success'
type LaunchDetail = { view?: '2d'|'3d'; source?: string; tent?: string; tentSlug?: string; product?: string; productSlug?: string; productType?: 'tent'|'inflatable' }

function fireAnalytics(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag !== 'function') return
  w.gtag('event', eventName, params)
}

export default function DesignYourEventLauncher() {
  const [open,setOpen]=useState(false),[source,setSource]=useState('unknown'),[tent,setTent]=useState(''),[tentSlug,setTentSlug]=useState(''),[status,setStatus]=useState<Status>('loading'),[errorReason,setErrorReason]=useState(''),[retryCount,setRetryCount]=useState(0)
  const timeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null)
  const iframeRef=useRef<HTMLIFrameElement|null>(null)
  const closeButtonRef=useRef<HTMLButtonElement|null>(null)
  const overlayRef=useRef<HTMLDivElement|null>(null)
  const [productType,setProductType]=useState<'tent'|'inflatable'>('tent')
  const [previewView,setPreviewView]=useState<'3d'|'2d'>('3d')
  const isTentPreview=Boolean(tent||tentSlug)
  const closeOverlay=useCallback((fromPopstate?:boolean)=>{setOpen(false);setStatus('loading');setErrorReason('');setTent('');setTentSlug('');if(!fromPopstate&&typeof window!=='undefined'){const state=window.history.state as {designYourEvent?:boolean}|null;if(state&&state.designYourEvent)window.history.back()}},[])

  useEffect(()=>{
    if(!open||typeof document==='undefined')return
    const opener=document.activeElement as HTMLElement|null
    const background:Array<{element:HTMLElement;inertAttribute:string|null}>=[]
    let branch:Element|null=overlayRef.current
    while(branch&&branch!==document.body){
      const parent:Element|null=branch.parentElement
      if(!parent)break
      for(const sibling of Array.from(parent.children)){
        if(sibling===branch||!('inert' in sibling))continue
        const element=sibling as HTMLElement
        background.push({element,inertAttribute:element.getAttribute('inert')})
        element.inert=true
      }
      branch=parent
    }
    closeButtonRef.current?.focus({preventScroll:true})
    function handleKeydown(event:KeyboardEvent){
      if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();closeOverlay()}
    }
    window.addEventListener('keydown',handleKeydown)
    return()=>{
      window.removeEventListener('keydown',handleKeydown)
      for(const {element,inertAttribute} of background){
        if(inertAttribute===null)element.removeAttribute('inert')
        else element.setAttribute('inert',inertAttribute)
      }
      if(opener?.isConnected)opener.focus({preventScroll:true})
    }
  },[open,closeOverlay])

  useEffect(()=>{function handleOpen(e:Event){const detail=(e as CustomEvent<LaunchDetail>).detail||{},src=detail.source||'unknown';setSource(src);setTent(detail.product||detail.tent||'');setTentSlug(detail.productSlug||detail.tentSlug||'');setProductType(detail.productType==='inflatable'?'inflatable':'tent');setStatus('loading');setErrorReason('');setRetryCount(0);setPreviewView(detail.view==='2d'?'2d':'3d');setOpen(true);fireAnalytics('rentsketch_cta_clicked',{source:src,tent:detail.tent||undefined,tent_slug:detail.tentSlug||undefined});if(typeof window!=='undefined')window.history.pushState({designYourEvent:true},'')}window.addEventListener('open-design-your-event',handleOpen);return()=>window.removeEventListener('open-design-your-event',handleOpen)},[])
  useEffect(()=>{function handlePop(){setOpen(wasOpen=>{if(wasOpen){setStatus('loading');setErrorReason('')}return false})}window.addEventListener('popstate',handlePop);return()=>window.removeEventListener('popstate',handlePop)},[])
useEffect(()=>{if(typeof document==='undefined')return;if(!open)return;const scrollY=window.scrollY;const html=document.documentElement;const body=document.body;const prevHtmlOverflow=html.style.overflow;const prevBodyOverflow=body.style.overflow;const prevBodyPosition=body.style.position;const prevBodyTop=body.style.top;const prevBodyWidth=body.style.width;html.style.overflow='hidden';body.style.overflow='hidden';body.style.position='fixed';body.style.top='-'+scrollY+'px';body.style.width='100%';return()=>{html.style.overflow=prevHtmlOverflow;body.style.overflow=prevBodyOverflow;body.style.position=prevBodyPosition;body.style.top=prevBodyTop;body.style.width=prevBodyWidth;window.scrollTo(0,scrollY)}},[open])
  useEffect(()=>{if(!open)return;if(timeoutRef.current)clearTimeout(timeoutRef.current);timeoutRef.current=setTimeout(()=>{setStatus(s=>{if(s!=='loading')return s;setErrorReason('RentSketch did not report ready within 25 seconds');fireAnalytics('rentsketch_designer_error',{source,reason:'parent_timeout'});return'error'})},25000);return()=>{if(timeoutRef.current)clearTimeout(timeoutRef.current)}},[open,retryCount,source,isTentPreview])

  useEffect(()=>{if(!open)return;function handleMessage(event:MessageEvent){if(event.origin!==RENTSKETCH_ORIGIN||event.source!==iframeRef.current?.contentWindow)return;const data=event.data as {type?:string;tenant?:string;reason?:unknown;mode?:string;tentId?:string;renderer?:string;booking?:unknown}|undefined,type=data&&data.type;if(data?.tenant&&data.tenant!==NYC_RENTSKETCH_TENANT)return;if(type==='rentsketch.ready'){/* Generic designer readiness is not proof that a requested tent rendered. */if(isTentPreview&&data?.mode!==(productType==='inflatable'?'inflatable-preview':'tent-preview'))return;setErrorReason('');setStatus('ready');if(timeoutRef.current)clearTimeout(timeoutRef.current);fireAnalytics('rentsketch_designer_ready',{source,tent:tent||undefined,tent_id:data?.tentId,mode:data?.mode,renderer:data?.renderer})}else if(type==='rentsketch.error'){const reason=typeof data?.reason==='string'&&data.reason.trim()?data.reason.trim():'RentSketch reported an unknown preview error';setErrorReason(reason);setStatus('error');if(timeoutRef.current)clearTimeout(timeoutRef.current);console.error('RentSketch embedded designer error:',reason);fireAnalytics('rentsketch_designer_error',{source,tent:tent||undefined,reason})}else if(type==='rentsketch.bookingRequested'){try{const booking=parseBookingHandoff(data?.booking);booking.source=source;fireAnalytics('rentsketch_booking_requested',{source,design_id:booking.designId});window.location.assign('/design-your-event/book#layout='+encodeURIComponent(JSON.stringify(booking)))}catch{fireAnalytics('rentsketch_booking_error',{source,reason:'invalid_selection'})}}else if(type==='rentsketch.designSaved')fireAnalytics('rentsketch_design_saved',{source});else if(type==='rentsketch.quoteRequested'){setStatus('success');fireAnalytics('rentsketch_quote_requested',{source})}}window.addEventListener('message',handleMessage);return()=>window.removeEventListener('message',handleMessage)},[open,source,tent,isTentPreview,productType])

  if(!open)return null
  const designerSrc=nycRentSketchEmbedUrl({source,name:tent,slug:tentSlug,productType,view:previewView,parentOrigin:window.location.origin,retry:retryCount})
  const closeButton=h('button',{key:'close',ref:closeButtonRef,type:'button','aria-label':'Close Event Designer',onClick:()=>closeOverlay(),className:'p-2 -mr-1 min-w-11 min-h-11 text-gray-600 hover:text-dark'},h(X,{size:24}))
  const title='Friendly Party Rental NYC · RentSketch'
  const topBar=h('div',{key:'topbar',className:'flex items-center justify-between gap-2 px-3 h-11 border-b border-gray-200 flex-shrink-0 bg-white'},h('span',{key:'title',className:'min-w-0 truncate font-semibold text-sm text-dark'},title),h('a',{key:'pricing',href:'/design-your-event#pricing',target:'_blank',rel:'noopener',className:'ml-auto inline-flex min-h-11 items-center px-2 text-xs font-semibold text-gray-700 underline shrink-0','aria-label':'RentSketch pricing (opens a new tab)'},'Pricing'),closeButton)
  /* Keep the iframe visible while it is initializing so first-time customers can see and accept RentSketch Early Access instead of being trapped behind a loading overlay. */
  const loadingBadge=status==='loading'?h('div',{key:'loading',className:'absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/95 shadow px-4 py-2 pointer-events-none'},h('p',{className:'text-body text-sm'},isTentPreview?`Loading ${tent||'your rental'}…`:'Loading your Friendly Event Designer...')):null
  const errorPanel=status==='error'?h('div',{key:'error',className:'absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('p',{key:'msg',className:'text-dark font-semibold'},'We ran into a problem loading the Event Designer.'),errorReason?h('p',{key:'reason',className:'text-body text-sm max-w-xl break-words'},errorReason):null,h('div',{key:'actions',className:'flex flex-wrap justify-center gap-3'},h('button',{key:'retry',type:'button',onClick:()=>{setErrorReason('');setStatus('loading');setRetryCount(c=>c+1)},className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Try Again'),h('button',{key:'plan',type:'button',onClick:()=>{setPreviewView('2d');setErrorReason('');setStatus('loading');setRetryCount(c=>c+1)},className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Open in 2D'),h('a',{key:'full',href:designerSrc,target:'_blank',rel:'noopener',className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Open Full Screen'),h(Link,{key:'browse',href:'/category',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Browse Rentals'),h(Link,{key:'contact',href:'/contact_us',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Contact Us'))):null
  const successPanel=status==='success'?h('div',{key:'success',className:'absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center'},h('h2',{key:'h',className:'text-2xl font-bold text-dark'},'Your design was sent to Friendly Party Rental NYC!'),h('p',{key:'p',className:'text-body max-w-md'},'Our Riverdale team will follow up to confirm final pricing and availability for your NYC / Downstate event.'),h('div',{key:'actions',className:'flex flex-wrap justify-center gap-3'},h(Link,{key:'browse',href:'/category',onClick:()=>closeOverlay(),className:'btn-primary px-5 py-2 rounded-full font-semibold'},'Browse Rentals'),h('button',{key:'return',type:'button',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Return to Friendly Party Rental NYC'),h(Link,{key:'contact',href:'/contact_us',onClick:()=>closeOverlay(),className:'px-5 py-2 rounded-full font-semibold border border-gray-300 text-dark'},'Contact Us'))):null
  const iframeEl=h('iframe',{ref:iframeRef,key:'iframe-'+retryCount+'-'+tentSlug,src:designerSrc,title:tent?`${tent} RentSketch Preview`:'Friendly Party Rental NYC Event Designer',className:'absolute inset-0 w-full h-full border-0'+(status==='success'?' invisible':''),allow:'fullscreen'})
  const canvasArea=h('div',{key:'canvas',className:'relative flex-1 min-h-0'},iframeEl,loadingBadge,errorPanel,successPanel)
  return h('div',{ref:overlayRef,className:'fixed inset-0 z-[100] bg-white flex flex-col',style:{height:'100dvh',paddingTop:'env(safe-area-inset-top)'},role:'dialog','aria-modal':'true','aria-label':tent?`${tent} preview`:'Friendly Event Designer'},topBar,canvasArea)
}
