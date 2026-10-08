export const dynamic='force-dynamic'

import { NextRequest,NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasStaffPermission } from '@/lib/staffPermissions'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'

function reviewer(session:any){
 const user=session?.user as {name?:string;email?:string}|undefined
 return String(user?.name||user?.email||'NYC staff').slice(0,120)
}
async function staff(){
 const session=await getServerSession(authOptions)
 if(!session)return {error:NextResponse.json({error:'Unauthorized'},{status:401})}
 if(!hasStaffPermission((session.user as {role?:string}).role,'orders'))return {error:NextResponse.json({error:'Forbidden'},{status:403})}
 return {session}
}
function view(row:any){
 return {
  id:row.id,orderId:row.orderId,orderNumber:row.order?.orderNumber||'',customerName:row.order?.customer?[row.order.customer.firstName,row.order.customer.lastName].filter(Boolean).join(' '):'',
  customerEmail:row.order?.customer?.email||null,eventDate:row.order?.eventDate||null,status:row.status,requestType:row.requestType,
  itemName:row.itemName,quantity:row.quantity,customerMessage:row.customerMessage,decisionNote:row.decisionNote,
  reviewedByName:row.reviewedByName,createdAt:row.createdAt,decidedAt:row.decidedAt,
 }
}

export async function GET(request:NextRequest){
 const auth=await staff();if('error'in auth)return auth.error
 const status=request.nextUrl.searchParams.get('status')||'pending'
 const rows=await prisma.orderChangeRequest.findMany({
  where:status==='all'?{}:{status},
  include:{order:{select:{orderNumber:true,eventDate:true,customer:{select:{firstName:true,lastName:true,email:true}}}}},
  orderBy:{createdAt:'asc'},take:100,
 })
 return NextResponse.json({requests:rows.map(view)})
}

export async function POST(request:NextRequest){
 const auth=await staff();if('error'in auth)return auth.error
 const body=await request.json().catch(()=>({}))
 const id=String(body?.requestId||'').trim()
 const action=String(body?.action||'').toLowerCase()
 const note=String(body?.decisionNote||'').trim().slice(0,1000)
 if(!id||!['handled','declined'].includes(action))return NextResponse.json({error:'Choose a valid request and action.'},{status:400})

 const row=await prisma.orderChangeRequest.findUnique({where:{id},include:{order:{include:{customer:true}}}})
 if(!row)return NextResponse.json({error:'Request not found.'},{status:404})
 if(row.status!=='pending')return NextResponse.json({error:'This request has already been reviewed.'},{status:409})
 const now=new Date(),reviewedByName=reviewer(auth.session)
 const updated=await prisma.orderChangeRequest.update({
  where:{id},data:{status:action,decisionNote:note||null,reviewedByName,decidedAt:now,appliedAt:action==='handled'?now:null},
 })

 const email=row.order.customer.email
 if(email&&!/@imported\.friendlypartyrental\.local$/i.test(email)&&!/^no-email-/i.test(email)){
  try{
   await sendEmail({
    to:email,
    subject:'Your Friendly Party Rental NYC order request was reviewed',
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>Order #${row.order.orderNumber}</h2><p>We reviewed your request:</p><p><strong>${row.itemName}</strong><br>${row.customerMessage||''}</p><p>Status: <strong>${action==='handled'?'Handled by our team':'Declined / not changed'}</strong></p>${note?'<p>'+note+'</p>':''}<p>Questions? Call or text ${BUSINESS.phone}.</p></div>`,
    text:`Order #${row.order.orderNumber} request reviewed. Status: ${action}. ${note||''}`,
   })
  }catch{}
 }
 return NextResponse.json({success:true,request:view({...updated,order:row.order})})
}
