'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart, DEFAULT_SCHEDULING_DETAILS } from '@/components/public/CartContext'
import { trackEvent } from '@/lib/gtag'
import { RENTSKETCH_BOOKING_KEY, bookingDateKey } from '@/lib/rentsketchBooking'
import type { BookingCatalogItem } from '@/lib/rentsketchBooking'
import { parseCheckoutHandoff, resolveExactDesignCart, prepareDesignCheckout } from '@/lib/rentsketchBookingFlow'
import type { CheckoutHandoff } from '@/lib/rentsketchBookingFlow'

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date())
async function readCatalog(date: string, signal?: AbortSignal): Promise<BookingCatalogItem[]> {
  const response = await fetch('/api/items' + (date ? '?date=' + encodeURIComponent(date + 'T12:00:00') : ''), { cache:'no-store', signal })
  const body = await response.json()
  if (!response.ok || !Array.isArray(body.items)) throw new Error('We could not verify your rentals. Your cart has not changed. Please retry.')
  return body.items
}

export default function DesignBookingPage() {
  const router = useRouter()
  const { items, eventDate, loaded, applyDesignCart, setDurationTierId, setDeliveryType, setEventTimeSlot, setPickupTimeSlot, setExactTimeRequested, setSchedulingDetails } = useCart()
  const [handoff,setHandoff] = useState<CheckoutHandoff|null>(null), [date,setDate] = useState(''), [keepCart,setKeepCart] = useState(true)
  const [catalog,setCatalog] = useState<BookingCatalogItem[]>([]), [loading,setLoading] = useState(false), [continuing,setContinuing] = useState(false)
  const [error,setError] = useState(''), [retry,setRetry] = useState(0), [received,setReceived] = useState(false), [initiallyEmpty,setInitiallyEmpty] = useState(false)
  const autoAttempted = useRef(false), navigationStarted = useRef(false)

  useEffect(() => {
    if (!loaded) return
    function receive() {
      try {
        const raw = new URLSearchParams(location.hash.slice(1)).get('layout')
        let incoming: unknown
        if (raw) { if (raw.length > 24000) throw new Error('This plan needs help from our team. Please request a quote.'); incoming=JSON.parse(raw) }
        else {
          const saved=JSON.parse(sessionStorage.getItem(RENTSKETCH_BOOKING_KEY)||'null')
          if (!saved || !Number.isFinite(saved.receivedAt) || Date.now()<saved.receivedAt || Date.now()-saved.receivedAt>86400000) throw new Error('Open your saved RentSketch plan and choose Book Now to bring its rentals here.')
          incoming=saved.booking
        }
        const booking=parseCheckoutHandoff(incoming)
        sessionStorage.setItem(RENTSKETCH_BOOKING_KEY,JSON.stringify({booking,receivedAt:Date.now()}))
        history.replaceState(history.state,'',location.pathname)
        setHandoff(booking);setDate(booking.eventDate||bookingDateKey(eventDate));setInitiallyEmpty(items.length===0);setError('');autoAttempted.current=false
        if(raw)trackEvent('rentsketch_booking_review',{source:booking.source,design_id:booking.designId,rental_lines:booking.items.length})
      } catch(err) { setHandoff(null);setError(err instanceof Error?err.message:'Your plan could not be opened.') }
      setReceived(true)
    }
    receive();window.addEventListener('hashchange',receive);return()=>window.removeEventListener('hashchange',receive)
  },[loaded])

  useEffect(()=>{
    if(!handoff)return
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let active=true
    setLoading(true);setCatalog([]);setError('')
    readCatalog(date,controller.signal).then(result=>{if(active)setCatalog(result)}).catch(err=>{if(active)setError(err.name==='AbortError'?'The availability check timed out. Please retry.':err.message)}).finally(()=>{clearTimeout(timer);if(active)setLoading(false)})
    return()=>{active=false;clearTimeout(timer);controller.abort()}
  },[handoff,date,retry])
  const review=useMemo(()=>handoff?resolveExactDesignCart(handoff,catalog,keepCart?items:[],date):null,[handoff,catalog,keepCart,items,date])

  async function continueBooking(automatic=false) {
    if(!handoff||continuing||loading||navigationStarted.current)return
    if(!bookingDateKey(date)||date<today()){setError('Choose an upcoming event date first.');return}
    setContinuing(true);setError('')
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
    try {
      const latest=await readCatalog(date,controller.signal),checked=resolveExactDesignCart(handoff,latest,keepCart?items:[],date)
      setCatalog(latest)
      if(checked.issues.length){setError('Some rentals need confirmation. Nothing has been removed, substituted, or added to your cart.');return}
      prepareDesignCheckout(sessionStorage,handoff,date)
      applyDesignCart(checked.items,date,{designId:handoff.designId,source:handoff.source,eventDate:date,surfaceType:handoff.surfaceType,importedAt:Date.now(),itemIds:checked.imported.map(item=>item.id)})
      // RentSketch's quote is one-day standard service. Do not reuse a prior
      // cart's duration, exact-time fees, or scheduling selections silently.
      setDurationTierId(null);setDeliveryType(null);setEventTimeSlot('');setPickupTimeSlot(null);setExactTimeRequested(false);setSchedulingDetails(DEFAULT_SCHEDULING_DETAILS)
      navigationStarted.current=true
      trackEvent('rentsketch_checkout_started',{source:handoff.source,design_id:handoff.designId,automatic,value:checked.subtotal,currency:'USD',rental_lines:checked.imported.length})
      router.replace('/checkout')
    }catch(err){setError(err instanceof Error?(err.name==='AbortError'?'The final availability check timed out. Please retry.':err.message):'Your rentals could not be transferred. Please retry.')}
    finally{clearTimeout(timer);setContinuing(false)}
  }
  useEffect(()=>{
    if(!initiallyEmpty||!handoff||!date||date<today()||loading||continuing||error||!catalog.length||!review||review.issues.length||autoAttempted.current)return
    autoAttempted.current=true;void continueBooking(true)
  },[initiallyEmpty,handoff,date,loading,continuing,error,catalog,review])

  return <div className="max-w-3xl mx-auto px-4 py-8 md:py-12" data-rentsketch-checkout>
    <p className="text-sm font-semibold text-secondary mb-2">RentSketch → Friendly Party Rental NYC checkout</p>
    <h1 className="text-3xl md:text-4xl font-bold text-dark mb-3">Your plan. Your rentals. Ready to book.</h1>
    <p className="text-body mb-6">We check every selected item, quantity, color, and current rental price before adding your plan. Finish delivery details and payment in Friendly Party Rental NYC checkout.</p>
    {(!received||loading||continuing||navigationStarted.current)&&<p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 mb-5">{continuing||navigationStarted.current?'Adding your exact rentals and opening checkout…':'Checking your saved plan and live availability…'}</p>}
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5 text-red-900">{error}{handoff&&<button type="button" disabled={loading||continuing} className="underline ml-2 min-h-11" onClick={()=>{autoAttempted.current=false;setRetry(n=>n+1)}}>Try again</button>}</div>}
    {handoff&&!navigationStarted.current&&<>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mb-6">
        <label htmlFor="designBookingDate" className="block font-semibold text-dark mb-2">Event date</label>
        <input id="designBookingDate" type="date" min={today()} value={date} disabled={continuing} onChange={e=>{autoAttempted.current=false;setDate(e.target.value)}} className="w-full sm:w-auto min-h-12 rounded-lg border border-gray-300 bg-white px-3 text-base" />
        {!initiallyEmpty&&items.length>0&&<label className="flex items-start gap-3 mt-4 text-sm text-body"><input type="checkbox" checked={keepCart} disabled={continuing} onChange={e=>setKeepCart(e.target.checked)} className="mt-1 h-5 w-5"/><span><strong>Keep my other cart rentals</strong><br/>Matching items use the exact quantities from this design—not an added copy. Other rentals remain. Uncheck to replace the cart with this plan.</span></label>}
        {keepCart&&items.length>0&&eventDate&&date&&bookingDateKey(eventDate)!==date&&<p className="text-sm mt-3 text-amber-900">This event date applies to all rentals you keep in the cart. Review it before continuing.</p>}
      </div>
      {!loading&&catalog.length>0&&review&&<>
        <h2 className="text-xl font-bold text-dark mb-3">Your rentals</h2>
        <ul className="divide-y divide-gray-200 border-y border-gray-200 mb-5">{review.items.map(item=><li key={JSON.stringify([item.id,item.selectedColor||''])} className="flex items-center gap-3 py-4"><img src={item.picture||undefined} alt="" width={64} height={64} className="w-16 h-16 shrink-0 rounded-lg object-contain bg-white"/><div className="flex-1 min-w-0"><h3 className="font-semibold text-dark">{item.name}</h3>{item.selectedColor&&<p className="text-sm text-body">Color: {item.selectedColor}</p>}<p className="text-sm text-body">{item.quantity} × {money(item.price)}</p></div><strong className="shrink-0">{money(item.price*item.quantity)}</strong></li>)}</ul>
        {review.issues.length>0&&<div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5"><h3 className="font-bold mb-2">Please confirm these selections</h3>{review.issues.map(issue=><p key={issue} className="text-sm mb-2">{issue}</p>)}<p className="text-sm">Choose another date or send the complete plan for a quote. No item will be silently removed or substituted.</p></div>}
        <div className="flex justify-between gap-3 text-xl font-bold"><span>Rental subtotal</span><span>{money(review.subtotal)}</span></div>
        <p className="text-sm text-body mt-2 mb-6">Delivery, tax, duration, and optional services are confirmed at checkout. Adding items does not reserve inventory, create a booking, or charge your card.</p>
      </>}
      <button type="button" disabled={loading||continuing||!date||!catalog.length||!!review?.issues.length} onClick={()=>void continueBooking(false)} className="btn-primary rounded-xl w-full min-h-14 px-6 py-4 text-lg font-bold disabled:opacity-50">{continuing?'Opening checkout…':'Add These Rentals & Continue to Checkout'}</button>
    </>}
    <a href="https://rentsketch.com/designer/?tenant=friendly-nyc&source=booking_return" className="block text-center w-full mt-3 min-h-12 py-3 underline">Return to RentSketch</a>
    <p className="text-sm text-body text-center mt-4">Need a hand? <a className="underline" href="tel:3158841498">315-884-1498</a></p>
  </div>
}
