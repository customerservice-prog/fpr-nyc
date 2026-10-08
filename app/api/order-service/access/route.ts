export const dynamic='force-dynamic'

import { randomInt, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'
import {
 NYC_ORDER_MAX_CODE_ATTEMPTS,NYC_ORDER_SERVICE_COOKIE,NYC_ORDER_SERVICE_SESSION_TTL_SECONDS,
 NYC_ORDER_VERIFICATION_TTL_MS,createNycOrderServiceSession,hashNycOrderLookup,hashNycOrderOtp,
 hashNycOrderRequestIp,normalizeNycOrderNumber,nycOrderHashesEqual,nycOrderServiceSecurityReady,
 verifyNycOrderServiceSession,
} from '@/lib/nycOrderServiceSecurity'

const WINDOW_MS=10*60*1000,MAX_ORDER_LOOKUPS=4,MAX_IP_LOOKUPS=12
const privateHeaders={'Cache-Control':'no-store, private'}

function genericRequestMessage(){
 return 'If that order can be verified online, a 6-digit code was sent to the email already on the reservation.'
}
function safeOrder(order:any){
 return {
  orderNumber:order.orderNumber,status:order.status,eventDate:order.eventDate,eventEndDate:order.eventEndDate,
  eventAddress:order.eventAddress,eventCity:order.eventCity,eventState:order.eventState,eventZip:order.eventZip,
  deliveryType:order.deliveryType,eventTimeSlot:order.eventTimeSlot,pickupTimeSlot:order.pickupTimeSlot,
  totalAmount:Number(order.totalAmount||0),amountPaid:Number(order.amountPaid||0),balanceDue:Math.max(Number(order.balanceDue||0),0),
  contractSigned:Boolean(order.contractSignedAt),delivered:Boolean(order.deliveredAt),pickedUp:Boolean(order.pickedUpAt),
  items:(order.items||[]).map((i:any)=>({itemName:i.itemName,quantity:i.quantity,total:Number(i.total||0)})),
 }
}
async function currentOrder(request:NextRequest){
 const session=verifyNycOrderServiceSession(request.cookies.get(NYC_ORDER_SERVICE_COOKIE)?.value)
 if(!session)return null
 return prisma.order.findFirst({where:{id:session.orderId,customerId:session.customerId},include:{items:true}})
}

export async function GET(request:NextRequest){
 const order=await currentOrder(request)
 return order?NextResponse.json({ok:true,order:safeOrder(order)},{headers:privateHeaders}):NextResponse.json({ok:false},{status:401,headers:privateHeaders})
}

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}))
 const action=String(body?.action||'')

 if(action==='request_code'){
  if(!nycOrderServiceSecurityReady())return NextResponse.json({ok:false,error:'Secure order access is temporarily unavailable.'},{status:503})
  const orderNumber=normalizeNycOrderNumber(body?.orderNumber)
  const lookupHash=hashNycOrderLookup(orderNumber),ipHash=hashNycOrderRequestIp(request.headers)
  const challengeId=randomUUID(),code=String(randomInt(0,1_000_000)).padStart(6,'0')
  if(!lookupHash)return NextResponse.json({ok:false,error:'Secure order access is temporarily unavailable.'},{status:503})

  const since=new Date(Date.now()-WINDOW_MS)
  const [lookupCount,ipCount]=await Promise.all([
   prisma.assistantOrderVerification.count({where:{lookupHash,createdAt:{gte:since}}}),
   ipHash?prisma.assistantOrderVerification.count({where:{requestIpHash:ipHash,createdAt:{gte:since}}}):Promise.resolve(0),
  ])
  const limited=lookupCount>=MAX_ORDER_LOOKUPS||ipCount>=MAX_IP_LOOKUPS
  const order=!limited&&orderNumber?await prisma.order.findFirst({
   where:{orderNumber:{equals:orderNumber,mode:'insensitive'}},
   select:{id:true,customerId:true,customer:{select:{email:true,firstName:true}}},
  }):null
  const deliverable=Boolean(order?.customer?.email&&!/@imported\.friendlypartyrental\.local$/i.test(order.customer.email)&&!/^no-email-/i.test(order.customer.email))
  const codeHash=hashNycOrderOtp(challengeId,deliverable?code:randomUUID())
  if(!codeHash)return NextResponse.json({ok:false,error:'Secure order access is temporarily unavailable.'},{status:503})

  await prisma.assistantOrderVerification.create({data:{
   id:challengeId,lookupHash,orderId:deliverable?order!.id:null,customerId:deliverable?order!.customerId:null,
   codeHash,requestIpHash:ipHash||null,status:limited?'rate_limited':deliverable?'created':'not_eligible',
   expiresAt:new Date(Date.now()+NYC_ORDER_VERIFICATION_TTL_MS),
  }})

  if(deliverable&&!limited){
   try{
    await sendEmail({
     to:order!.customer.email,
     subject:'Your Friendly Party Rental NYC verification code',
     html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Secure order access</h2><p>Hi ${order!.customer.firstName||'there'},</p><p>Your one-time code is:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p><p>Questions? Call or text ${BUSINESS.phone}.</p></div>`,
     text:`Friendly Party Rental NYC verification code: ${code}\n\nExpires in 10 minutes.`,
    })
    await prisma.assistantOrderVerification.update({where:{id:challengeId},data:{status:'sent'}})
   }catch{
    await prisma.assistantOrderVerification.update({where:{id:challengeId},data:{status:'delivery_failed'}})
   }
  }
  return NextResponse.json({ok:true,challengeId,message:genericRequestMessage()},{headers:privateHeaders})
 }

 if(action==='verify_code'){
  const challengeId=String(body?.challengeId||'').trim(),code=String(body?.code||'').trim()
  if(!/^\d{6}$/.test(code))return NextResponse.json({ok:false,error:'That code is invalid or expired.'},{status:400})
  const challenge=await prisma.assistantOrderVerification.findUnique({where:{id:challengeId}})
  if(!challenge||challenge.status!=='sent'||!challenge.orderId||!challenge.customerId||challenge.consumedAt||challenge.expiresAt.getTime()<=Date.now()||challenge.failedAttempts>=NYC_ORDER_MAX_CODE_ATTEMPTS){
   return NextResponse.json({ok:false,error:'That code is invalid or expired.'},{status:400})
  }
  const entered=hashNycOrderOtp(challenge.id,code)
  if(!nycOrderHashesEqual(entered,challenge.codeHash)){
   await prisma.assistantOrderVerification.update({where:{id:challenge.id},data:{failedAttempts:{increment:1}}})
   return NextResponse.json({ok:false,error:'That code is invalid or expired.'},{status:400})
  }
  const token=createNycOrderServiceSession(challenge.orderId,challenge.customerId)
  if(!token)return NextResponse.json({ok:false,error:'Secure order access is temporarily unavailable.'},{status:503})
  await prisma.assistantOrderVerification.update({where:{id:challenge.id},data:{status:'consumed',consumedAt:new Date()}})
  const response=NextResponse.json({ok:true},{headers:privateHeaders})
  response.cookies.set(NYC_ORDER_SERVICE_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:NYC_ORDER_SERVICE_SESSION_TTL_SECONDS})
  return response
 }

 if(action==='logout'){
  const response=NextResponse.json({ok:true},{headers:privateHeaders})
  response.cookies.set(NYC_ORDER_SERVICE_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0})
  return response
 }

 return NextResponse.json({ok:false,error:'Invalid action'},{status:400})
}
