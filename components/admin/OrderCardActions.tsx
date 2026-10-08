'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { canIssueRefunds, canProcessPayments, hasStaffPermission } from '@/lib/staffPermissions'

export type OrderQuickAction = 'cancel' | 'refund' | 'restrict' | 'note'
type Action = OrderQuickAction
type Payment = { id: string; amount: number; method: string; status?: string; pendingAmount?: number | null; stripePaymentId?: string | null; notes?: string | null; createdAt: string }
type Order = { id: string; orderNumber: string; status: string; customerId: string; internalNotes?: string | null; amountPaid: number; customer: { firstName: string; lastName: string; email?: string; phone?: string }; payments: Payment[] }
const ACTIONS: { id: Action; emoji: string; label: string }[] = [
  { id: 'cancel', emoji: '❌', label: 'Cancel' },
  { id: 'refund', emoji: '💸', label: 'Refund' },
  { id: 'restrict', emoji: '🚫', label: 'Do Not Rent' },
  { id: 'note', emoji: '📝', label: 'Note' },
]
const REASONS = ['Payment Issue', 'Chargeback', 'Equipment Damage', 'Equipment Not Returned', 'Unsafe Property / Site', 'Abusive / Threatening Conduct', 'Fraud Concern', 'Repeated Policy Violations', 'Unauthorized Use', 'Other']
const TITLES: Record<Action, string> = { cancel: 'Cancel order', refund: 'Refund a payment', restrict: 'Add customer to Do Not Rent', note: 'Add internal note' }

// Existing refund records identify their original payment in their staff note.
// Stripe remains authoritative and rejects amounts beyond its refundable balance.
function remaining(payment: Payment, payments: Payment[]) {
  const refunded = payments.filter(p => p.method === 'refund' && p.notes?.includes(`payment ${payment.id}`)).reduce((sum,p) => sum + (p.status === 'pending' ? (p.pendingAmount || 0) : Math.max(-p.amount,0)),0)
  return Math.max(Math.round((payment.amount-refunded)*100)/100,0)
}

export default function OrderCardActions({ orderId, orderNumber, status, onUpdated, compact = false, initialAction }: { orderId: string; orderNumber: string; status: string; onUpdated: () => Promise<void> | void; compact?: boolean; initialAction?: Action | null }) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const mayPay = canProcessPayments(role)
  const mayRefund = canIssueRefunds(role)
  const mayRestrict = hasStaffPermission(role, 'override_restrictions')
  const visibleActions = ACTIONS.filter((item) =>
    (item.id !== 'refund' || mayRefund) && (item.id !== 'restrict' || mayRestrict)
  )
  const [action, setAction] = useState<Action | null>(null), [order,setOrder] = useState<Order | null>(null)
  const [error,setError] = useState(''), [busy,setBusy] = useState(false), [reason,setReason] = useState('')
  const [paymentId,setPaymentId] = useState(''), [amount,setAmount] = useState(''), [confirmed,setConfirmed] = useState(false)
  const [category,setCategory] = useState(REASONS[0]), [restrictEmail,setRestrictEmail] = useState(false), [restrictPhone,setRestrictPhone] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null), submitting = useRef(false), opener = useRef<HTMLButtonElement | null>(null)
  const refundRequestId = useRef('')
  const shortcutOpened = useRef(false)
  useEffect(() => {
    if (!initialAction || shortcutOpened.current) return
    if (initialAction === 'refund' && !mayRefund) return
    shortcutOpened.current = true
    setAction(initialAction)
  }, [initialAction, mayRefund])
  useEffect(() => {
    if (!action) return
    let active = true
    refundRequestId.current = crypto.randomUUID()
    setOrder(null); setError(''); setReason(''); setAmount(''); setPaymentId(''); setConfirmed(false); setRestrictEmail(false); setRestrictPhone(false); setCategory(REASONS[0])
    dialog.current?.showModal()
    fetch(`/api/admin/orders/${orderId}`, { cache: 'no-store' }).then(async r => {
      const result = await r.json()
      if (!r.ok || !result.order) throw new Error(result.error || 'Could not load this order')
      if (active) setOrder(result.order)
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  },[action,orderId])
  function close() {
    if (submitting.current) return
    dialog.current?.close(); setAction(null); opener.current?.focus()
  }
  const payments = order?.payments.filter(p => p.amount > 0 && (!p.status || p.status === 'succeeded') && p.stripePaymentId?.startsWith('pi_')) || []
  const selected = payments.find(p=>p.id===paymentId)
  const maxRefund = selected && order ? remaining(selected,order.payments) : 0
  async function submit() {
    if (!order || !action || submitting.current) return
    if (!reason.trim()) { setError(action === 'note' ? 'Enter an internal note.' : 'Enter the reason for this action.'); return }
    if (action !== 'note' && !confirmed) { setError('Review and check the confirmation box first.'); return }
    const refundAmount = Number(amount)
    if (action === 'refund' && (!selected || !Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > maxRefund || Math.abs(refundAmount*100-Math.round(refundAmount*100))>.00001)) { setError('Choose a payment and enter a valid refund amount with no more than two decimal places.'); return }
    submitting.current = true; setBusy(true); setError('')
    try {
      let url = `/api/admin/orders/${orderId}`, method = 'PUT', payload: Record<string,unknown>
      const stamp = new Date().toLocaleString('en-US',{timeZone:'America/New_York'}) + ' ET'
      const note = [order.internalNotes, `[${action === 'cancel' ? 'Canceled from order' : 'Order note'} · ${stamp}] ${reason.trim()}`].filter(Boolean).join('\n')
      if (action === 'cancel') payload = { status:'canceled', internalNotes:note }
      else if (action === 'note') payload = { internalNotes:note }
      else if (action === 'refund') { url += '/refund'; method = 'POST'; payload = { paymentId,amount:refundAmount,reason:reason.trim(),requestId:refundRequestId.current } }
      else {
        url = '/api/admin/rental-restrictions'; method = 'POST'
        const identifiers: Record<string,string>[] = [{ type:'CUSTOMER_ID', customerId:order.customerId, value:`${order.customer.firstName} ${order.customer.lastName}` }]
        if (restrictEmail && order.customer.email) identifiers.push({type:'EMAIL',value:order.customer.email})
        if (restrictPhone && order.customer.phone) identifiers.push({type:'PHONE',value:order.customer.phone})
        payload = { reasonCategory:category,internalNotes:reason.trim(),sourceOrderId:order.id,sourceOrderNumber:order.orderNumber,sourceCustomerId:order.customerId,identifiers }
      }
      const response = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const result = await response.json()
      if (!response.ok || result.success === false) throw new Error(result.error || 'The action could not be completed')
      toast.success(action === 'cancel' ? 'Order canceled. No refund issued.' : action === 'refund' ? (result.pending ? 'Stripe is processing this refund. Track it in payment history.' : 'Refund completed. Order status unchanged.') : action === 'restrict' ? 'Do Not Rent restriction added.' : 'Internal note saved.')
      submitting.current = false; setBusy(false); close()
      try { await Promise.resolve(onUpdated()) } catch { toast.error('Action saved. Refresh the order to see the latest details.') }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete this action. Refresh the order to check its latest status before retrying.')
    } finally { submitting.current = false; setBusy(false) }
  }
  const validEmail = !!order?.customer.email && !/@imported\.friendlypartyrental\.local$|^no-email-/i.test(order.customer.email)
  return <>
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t text-xs" aria-label={`Actions for order ${orderNumber}`}>
      {!compact && <><Link href={`/admin/orders/${orderId}`} className="mr-1 min-h-10 inline-flex items-center font-semibold text-secondary hover:underline">View / Edit Order</Link>
      <span className="capitalize text-gray-500 mr-2">{status}</span>
      {mayPay && <Link href={`/admin/orders/${orderId}?action=card`} title="Take payment or charge the card on file" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 font-medium hover:bg-blue-50"><span aria-hidden="true">💳</span> Payment</Link>}</>}
      {visibleActions.map(a=><button key={a.id} type="button" disabled={a.id==='cancel'&&['canceled','cancelled'].includes(status)} title={`${TITLES[a.id]} · Order ${orderNumber}`} onClick={e=>{opener.current=e.currentTarget;setAction(a.id)}} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 font-medium disabled:opacity-40 ${a.id==='cancel'||a.id==='restrict'?'text-red-700 hover:bg-red-50':'text-gray-800 hover:bg-blue-50'}`}><span aria-hidden="true">{a.emoji}</span>{a.label}</button>)}
    </div>
    {action && <dialog ref={dialog} aria-label={`${TITLES[action]} · Order ${orderNumber}`} onCancel={e=>{e.preventDefault();close()}} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/60" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 border-b p-5"><div><h2 className="text-lg font-bold">{TITLES[action]}</h2><p className="mt-1 text-sm text-gray-600">Order {orderNumber}{order ? ` · ${order.customer.firstName} ${order.customer.lastName}` : ''}</p></div><button type="button" aria-label="Close order action" disabled={busy} onClick={close} className="rounded border px-3 py-2">✕</button></div>
      <form className="space-y-4 p-5 text-sm" onSubmit={e=>{e.preventDefault();void submit()}}>
        {!order && !error && <p role="status">Loading current order details…</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {order && <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          {action==='cancel'&&<p className="rounded-lg bg-amber-50 p-3">Canceling removes this order from the active schedule. It keeps its history and payments. No refund or customer message is sent by this action.</p>}
          {action==='refund'&&<><p>Choose the original Stripe payment to refund. Refunding does not cancel the order or reduce its rental total; an active order may show a balance afterward.</p>{payments.length ? <><label className="block font-medium">Payment<select className="mt-1 w-full rounded border p-2" required value={paymentId} onChange={e=>{setPaymentId(e.target.value);setAmount('');setConfirmed(false)}}><option value="">Choose a payment…</option>{payments.map(p=><option key={p.id} value={p.id} disabled={remaining(p,order.payments)<=0}>{new Date(p.createdAt).toLocaleDateString()} · {formatCurrency(p.amount)} paid · up to {formatCurrency(remaining(p,order.payments))} remaining</option>)}</select></label><label className="block font-medium">Refund amount ($)<input required type="number" min="0.01" step="0.01" max={maxRefund||undefined} value={amount} onChange={e=>{setAmount(e.target.value);setConfirmed(false)}} className="mt-1 w-full rounded border p-2"/></label></>:<p className="rounded bg-amber-50 p-3">No refundable Stripe payment is recorded on this order. Cash, check, and imported payments must be reviewed in the order’s payment history.</p>}<Link href={`/admin/orders/${orderId}#payment-history`} className="inline-block text-blue-700 underline">View all payments and refunds →</Link></>}
          {action==='restrict'&&<><p>The customer profile below will be added to Do Not Rent. Existing orders and payments stay unchanged. The reason is staff-only.</p><p className="rounded bg-gray-50 p-3 font-medium">Customer profile: {order.customer.firstName} {order.customer.lastName}</p>{validEmail&&<label className="flex items-start gap-2"><input type="checkbox" checked={restrictEmail} onChange={e=>{setRestrictEmail(e.target.checked);setConfirmed(false)}}/>Also restrict email: {order.customer.email}</label>}{order.customer.phone&&<label className="flex items-start gap-2"><input type="checkbox" checked={restrictPhone} onChange={e=>{setRestrictPhone(e.target.checked);setConfirmed(false)}}/>Also restrict phone: {order.customer.phone}</label>}<p className="text-xs text-gray-500">Address and other contacts are not included. Selected email or phone restrictions also apply when reused on another customer profile.</p><label className="block font-medium">Reason category<select value={category} onChange={e=>{setCategory(e.target.value);setConfirmed(false)}} className="mt-1 w-full rounded border p-2">{REASONS.map(r=><option key={r}>{r}</option>)}</select></label></>}
          {action==='note'&&<p>This adds a dated staff-only note and keeps existing notes.</p>}
          <label className="block font-medium">{action==='note'?'Internal note':'Reason / staff notes'}<textarea required rows={3} maxLength={action==='refund'?500:4000} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false)}} className="mt-1 w-full rounded border p-2"/></label>
          {action!=='note'&&<label className="flex items-start gap-2 rounded border p-3"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-0.5"/><span>{action==='cancel'?`I confirm canceling order ${orderNumber}.`:action==='refund'?`I confirm refunding ${formatCurrency(Number(amount)||0)} to the selected original payment method.`:'I confirm adding this customer and only the selected identifiers to Do Not Rent.'}</span></label>}
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={(action!=='note'&&!confirmed)||(action==='refund'&&(!selected||!Number(amount)))||(action==='cancel'&&['canceled','cancelled'].includes(order.status))} className="rounded-lg bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:bg-gray-300">{busy?'Saving…':action==='cancel'?'Confirm cancellation':action==='refund'?'Issue refund':action==='restrict'?'Add to Do Not Rent':'Save note'}</button><button type="button" onClick={close} className="rounded-lg border px-4 py-2.5">Back</button></div>
        </fieldset>}
      </form>
    </dialog>}
  </>
}
