import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { BUSINESS, formatDate } from '@/lib/utils'

export type StaffSalesKind = 'payment' | 'quote' | 'receipt' | 'incomplete'
export type StaffSalesEvent = {
  eventKey:string; kind:StaffSalesKind; orderId?:string|null; orderNumber?:string|null;
  customerName?:string|null; customerEmail?:string|null; customerPhone?:string|null;
  eventDate?:Date|string|null; totalAmount?:number|null; amountPaid?:number|null;
  paymentAmount?:number|null; balanceDue?:number|null; checkoutStage?:string|null;
}
const money=(v:number)=>'$'+v.toFixed(2)
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))
export function staffSalesMessage(event:StaffSalesEvent){
  const customer=event.customerName?.trim()||'Customer'
  const label=event.orderNumber?'#'+event.orderNumber:'Website activity'
  const title=event.kind==='payment'?'Payment received':event.kind==='quote'?'Quote sent':event.kind==='receipt'?'Updated receipt sent':'Incomplete checkout'
  const subject='['+BUSINESS.name+' '+title+'] '+(event.kind==='payment'?money(event.paymentAmount||0)+' - ':'')+label
  const rows=[
    ['Customer',customer],['Email',event.customerEmail||'Not provided'],['Phone',event.customerPhone||'Not provided'],
    ['Event date',event.eventDate?formatDate(event.eventDate):'Not provided'],['Order',event.orderNumber||'Not assigned']
  ]
  if(typeof event.paymentAmount==='number')rows.push(['New payment',money(event.paymentAmount)])
  if(typeof event.amountPaid==='number')rows.push(['Total recorded paid',money(event.amountPaid)])
  if(typeof event.balanceDue==='number')rows.push(['Remaining balance',money(event.balanceDue)])
  const origin=(process.env.NEXTAUTH_URL||process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'')
  const url=event.orderId&&origin?origin+'/admin/orders/'+encodeURIComponent(event.orderId):origin+'/admin'
  return {subject,html:'<div style="font-family:Arial,sans-serif;max-width:650px"><h2>'+esc(title)+' — '+esc(BUSINESS.name)+'</h2><table>'+rows.map(([a,b])=>'<tr><th style="text-align:left;padding:6px">'+esc(a)+'</th><td style="padding:6px">'+esc(b)+'</td></tr>').join('')+'</table>'+(url?'<p><a href="'+esc(url)+'">Open admin</a></p>':'')+'</div>'}
}
export async function sendStaffSalesAlert(event:StaffSalesEvent){
  const email=staffSalesMessage(event)
  let alert:any
  try{alert=await prisma.staffEmailNotification.create({data:{eventKey:event.eventKey,kind:event.kind,orderId:event.orderId||null,subject:email.subject,html:email.html,status:'sending'}})}
  catch(error){if((error as any)?.code==='P2002')return false;throw error}
  let message='Email provider did not confirm sending'
  try{
    const result:any=await sendEmail({to:ownerNotificationRecipients(),subject:email.subject,html:email.html,idempotencyKey:event.eventKey})
    if(result?.success&&!result?.simulated){
      await prisma.staffEmailNotification.update({where:{id:alert.id},data:{status:'sent',sentAt:new Date(),provider:result.provider||null,messageId:result.messageId||null,lastError:null}})
      return true
    }
    if(result?.error instanceof Error)message=result.error.message
  }catch(error){message=error instanceof Error?error.message:String(error)}
  await prisma.staffEmailNotification.update({where:{id:alert.id},data:{status:'failed',lastError:message.slice(0,500)}})
  return false
}
