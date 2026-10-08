'use client'

import { useEffect,useState } from 'react'
import { formatCurrency,formatDate } from '@/lib/utils'

type OrderView={
 orderNumber:string;status:string;eventDate:string;eventEndDate?:string|null;eventAddress?:string|null;eventCity?:string|null;eventState?:string|null;eventZip?:string|null;
 deliveryType:string;eventTimeSlot?:string|null;pickupTimeSlot?:string|null;totalAmount:number;amountPaid:number;balanceDue:number;
 contractSigned:boolean;delivered:boolean;pickedUp:boolean;items:Array<{itemName:string;quantity:number;total:number}>
}
type RequestRow={id:string;requestType:string;itemName:string;quantity:number;status:string;customerMessage:string|null;decisionNote:string|null;createdAt:string;decidedAt:string|null}

export default function MyOrderPage(){
 const [stage,setStage]=useState<'lookup'|'code'|'order'>('lookup')
 const [orderNumber,setOrderNumber]=useState(''),[challengeId,setChallengeId]=useState(''),[code,setCode]=useState('')
 const [order,setOrder]=useState<OrderView|null>(null),[requests,setRequests]=useState<RequestRow[]>([])
 const [requestType,setRequestType]=useState('add_item'),[message,setMessage]=useState(''),[itemName,setItemName]=useState(''),[quantity,setQuantity]=useState('1')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')

 async function loadOrder(){
  const r=await fetch('/api/order-service/access',{cache:'no-store'})
  if(!r.ok)return false
  const d=await r.json();setOrder(d.order);setStage('order')
  const rr=await fetch('/api/order-service/requests',{cache:'no-store'})
  if(rr.ok){const rd=await rr.json();setRequests(rd.requests||[])}
  return true
 }
 useEffect(()=>{void loadOrder()},[])

 async function requestCode(){
  if(!orderNumber.trim())return
  setBusy(true);setError('');setNotice('')
  try{
   const r=await fetch('/api/order-service/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'request_code',orderNumber})})
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not request a code.')
   setChallengeId(d.challengeId);setNotice(d.message);setStage('code')
  }catch(e){setError(e instanceof Error?e.message:'Could not request a code.')}
  finally{setBusy(false)}
 }
 async function verify(){
  setBusy(true);setError('')
  try{
   const r=await fetch('/api/order-service/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify_code',challengeId,code})})
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not verify code.')
   await loadOrder()
  }catch(e){setError(e instanceof Error?e.message:'Could not verify code.')}
  finally{setBusy(false)}
 }
 async function submitRequest(){
  if(!message.trim())return
  setBusy(true);setError('');setNotice('')
  try{
   const r=await fetch('/api/order-service/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    requestType,message,itemName:requestType==='add_item'?itemName:'',quantity:requestType==='add_item'?Number(quantity):0,
   })})
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not submit request.')
   setNotice(d.message||'Request submitted for staff review.');setMessage('');setItemName('');setQuantity('1')
   const rr=await fetch('/api/order-service/requests',{cache:'no-store'});if(rr.ok)setRequests((await rr.json()).requests||[])
  }catch(e){setError(e instanceof Error?e.message:'Could not submit request.')}
  finally{setBusy(false)}
 }
 async function logout(){
  await fetch('/api/order-service/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})})
  setOrder(null);setRequests([]);setStage('lookup');setCode('');setChallengeId('')
 }

 return <main className="mx-auto max-w-4xl px-4 py-10">
  <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
   <p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">Friendly Party Rental NYC</p>
   <h1 className="mt-2 text-3xl font-bold text-dark">My Order</h1>
   <p className="mt-2 text-sm text-body">Securely view your booked order and send change requests to the Riverdale / NYC team.</p>

   {error&&<p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
   {notice&&<p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

   {stage==='lookup'&&<div className="mt-6 max-w-md space-y-3">
    <label className="block text-sm font-semibold">Order number<input value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="Example: 9218" className="mt-1 w-full rounded-lg border px-3 py-3"/></label>
    <button disabled={busy||!orderNumber.trim()} onClick={()=>void requestCode()} className="btn-primary w-full disabled:opacity-50">{busy?'Sending…':'Email me a verification code'}</button>
    <p className="text-xs text-gray-500">For privacy, we only send the code to the email already saved on the reservation.</p>
   </div>}

   {stage==='code'&&<div className="mt-6 max-w-md space-y-3">
    <label className="block text-sm font-semibold">6-digit verification code<input inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 w-full rounded-lg border px-3 py-3 text-2xl tracking-[.25em]"/></label>
    <button disabled={busy||code.length!==6} onClick={()=>void verify()} className="btn-primary w-full disabled:opacity-50">{busy?'Verifying…':'Open my order'}</button>
    <button type="button" className="text-sm text-secondary underline" onClick={()=>{setStage('lookup');setCode('');setError('')}}>Use a different order number</button>
   </div>}

   {stage==='order'&&order&&<div className="mt-6 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-gray-50 p-4">
     <div><p className="text-sm text-gray-500">Order</p><p className="text-xl font-bold">#{order.orderNumber}</p><p className="mt-1 text-sm capitalize">{order.status}</p></div>
     <button onClick={()=>void logout()} className="text-sm text-secondary underline">Sign out</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
     <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Event date</p><p className="font-semibold">{formatDate(order.eventDate)}</p></div>
     <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Total</p><p className="font-semibold">{formatCurrency(order.totalAmount)}</p></div>
     <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Balance due</p><p className="font-semibold">{formatCurrency(order.balanceDue)}</p></div>
    </div>
    <section className="rounded-xl border p-4"><h2 className="font-bold">Current rentals</h2><div className="mt-3 divide-y">{order.items.map((item,i)=><div key={i} className="flex justify-between gap-3 py-2 text-sm"><span>{item.quantity} × {item.itemName}</span><span>{formatCurrency(item.total)}</span></div>)}</div></section>
    <section className="rounded-xl border p-4"><h2 className="font-bold">Request an order change</h2><p className="mt-1 text-xs text-gray-500">Submitting a request does not automatically change your order or price. Staff will review it first.</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Request type<select value={requestType} onChange={e=>setRequestType(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
       <option value="add_item">Add rentals</option><option value="remove_item">Remove or change rentals</option><option value="change_address">Change event address</option><option value="change_schedule">Change delivery / pickup timing</option><option value="cancel_order">Cancellation request</option><option value="other">Other</option>
      </select></label>
      {requestType==='add_item'&&<><label className="text-sm font-semibold">Item requested<input value={itemName} onChange={e=>setItemName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" placeholder="Example: 8 cocktail tables"/></label><label className="text-sm font-semibold">Quantity<input type="number" min="1" max="999" value={quantity} onChange={e=>setQuantity(e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label></>}
     </div>
     <label className="mt-3 block text-sm font-semibold">Details<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="mt-1 w-full rounded border px-3 py-2" placeholder="Tell us exactly what you want changed." /></label>
     <button disabled={busy||!message.trim()} onClick={()=>void submitRequest()} className="btn-primary mt-3 disabled:opacity-50">{busy?'Submitting…':'Submit for staff review'}</button>
    </section>
    <section className="rounded-xl border p-4"><h2 className="font-bold">Your recent requests</h2>{requests.length===0?<p className="mt-2 text-sm text-gray-500">No requests yet.</p>:<div className="mt-3 space-y-2">{requests.map(r=><div key={r.id} className="rounded-lg bg-gray-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{r.itemName}</strong><span className="capitalize">{r.status}</span></div><p className="mt-1 text-gray-600">{r.customerMessage}</p>{r.decisionNote&&<p className="mt-2 text-secondary">Staff note: {r.decisionNote}</p>}</div>)}</div>}</section>
   </div>}
  </div>
 </main>
}
