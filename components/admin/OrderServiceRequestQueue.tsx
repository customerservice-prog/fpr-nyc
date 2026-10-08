'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type RequestRow={
 id:string;orderId:string;orderNumber:string;customerName:string;customerEmail:string|null;eventDate:string|null;
 status:string;requestType:string;itemName:string;quantity:number;customerMessage:string|null;decisionNote:string|null;
 reviewedByName:string|null;createdAt:string;decidedAt:string|null;
}

function typeLabel(type:string){
 return ({
  add_item:'Add rentals',remove_item:'Remove/change rentals',change_address:'Address change',
  change_schedule:'Schedule change',cancel_order:'Cancellation request',other:'Other request',
 } as Record<string,string>)[type]||type.replace(/_/g,' ')
}

export default function OrderServiceRequestQueue(){
 const [rows,setRows]=useState<RequestRow[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('')
 async function load(quiet=false){
  if(!quiet)setLoading(true);setError('')
  try{
   const r=await fetch('/api/admin/order-service-requests?status=pending',{cache:'no-store'})
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'Could not load requests.')
   setRows(Array.isArray(d.requests)?d.requests:[])
  }catch(e){setError(e instanceof Error?e.message:'Could not load requests.')}
  finally{if(!quiet)setLoading(false)}
 }
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(true),30000);return()=>window.clearInterval(timer)},[])
 async function review(row:RequestRow,action:'handled'|'declined'){
  const note=window.prompt(action==='handled'?'Add an optional note for the customer after you make any needed order change:':'Optional reason for declining this request:','')
  if(note===null)return
  if(action==='handled'&&!window.confirm('Mark this request handled only after you made any required change on the full order. Continue?'))return
  setBusy(row.id)
  try{
   const r=await fetch('/api/admin/order-service-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:row.id,action,decisionNote:note})})
   const d=await r.json()
   if(!r.ok||!d.success)throw new Error(d.error||'Could not review request.')
   setRows(current=>current.filter(x=>x.id!==row.id))
   toast.success(action==='handled'?'Request marked handled':'Request declined')
  }catch(e){toast.error(e instanceof Error?e.message:'Could not review request.')}
  finally{setBusy('')}
 }
 return <section className="admin-card mb-5 border-l-4 border-amber-500">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Verified customer requests</p><h2 className="mt-1 text-lg font-bold text-dark">Existing-order requests waiting for review</h2><p className="mt-1 text-sm text-body">Customers verified by email can ask for changes here. Nothing changes automatically.</p></div>
   <button type="button" className="btn-outline text-xs" disabled={loading||!!busy} onClick={()=>void load()}>Refresh</button>
  </div>
  {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {loading?<p className="mt-4 text-sm text-body">Loading requests…</p>:rows.length===0?<p className="mt-4 rounded bg-gray-50 p-3 text-sm text-body">No pending verified customer requests.</p>:
   <div className="mt-4 space-y-3">{rows.map(row=><div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><p className="font-bold text-dark">Order #{row.orderNumber} · {row.customerName||'Customer'}</p><p className="mt-1 text-xs text-body">{typeLabel(row.requestType)} · {new Date(row.createdAt).toLocaleString()}</p>{row.customerMessage&&<p className="mt-3 whitespace-pre-wrap text-sm">{row.customerMessage}</p>}</div>
     <Link className="btn-outline text-xs" href={'/admin/orders/'+row.orderId}>Open full order</Link>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
     <button disabled={!!busy} className="btn-admin text-xs" onClick={()=>void review(row,'handled')}>Mark handled</button>
     <button disabled={!!busy} className="btn-outline text-xs text-red-700" onClick={()=>void review(row,'declined')}>Decline</button>
    </div>
   </div>)}</div>}
 </section>
}
