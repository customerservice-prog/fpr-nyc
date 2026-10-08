export const dynamic='force-dynamic'

import { NextRequest,NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveDriverAccess } from '@/lib/driverAccess'
import { effectiveEventEndDate } from '@/lib/orderDates'

function dateOnly(date:Date){return date.toISOString().slice(0,10)}

export async function GET(request:NextRequest){
 const access=await resolveDriverAccess(request)
 if(!access)return NextResponse.json({error:'Unauthorized'},{status:401})
 const date=request.nextUrl.searchParams.get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:'Choose a valid route date.'},{status:400})
 const start=new Date(date+'T00:00:00.000Z'),end=new Date(date+'T23:59:59.999Z')
 if(!Number.isFinite(start.getTime()))return NextResponse.json({error:'Choose a valid route date.'},{status:400})

 const assignment=access.isAdmin?{}:{OR:[{driverId:access.driverId},{driverId:null},{pickupDriverId:access.driverId},{pickupDriverId:null}]}
 const orders=await prisma.order.findMany({
  where:{status:{notIn:['cancelled','canceled','quote','incomplete']},eventDate:{lte:end},AND:[assignment,{OR:[{eventEndDate:{gte:start}},{eventEndDate:null,eventDate:{gte:start,lte:end}}]}]},
  include:{customer:true,items:{select:{itemName:true,quantity:true}}},orderBy:[{routeSequence:'asc'},{eventDate:'asc'}],
 })
 const stops=orders.map(o=>{
  const startDay=dateOnly(o.eventDate),endDay=dateOnly(effectiveEventEndDate(o.eventDate,o.eventEndDate,o.rentalDays||1))
  const deliveryOnDate=startDay===date,pickupOnDate=endDay===date
  const deliveryAssigned=access.isAdmin||o.driverId===access.driverId,pickupAssigned=access.isAdmin||o.pickupDriverId===access.driverId
  const deliveryUnassigned=!access.isAdmin&&deliveryOnDate&&!o.driverId,pickupUnassigned=!access.isAdmin&&pickupOnDate&&!o.pickupDriverId
  return {
   id:o.id,orderNumber:o.orderNumber,status:o.status,deliveryType:o.deliveryType,eventDate:o.eventDate.toISOString(),eventEndDate:o.eventEndDate?.toISOString()||null,
   eventAddress:o.eventAddress,eventCity:o.eventCity,eventState:o.eventState,eventZip:o.eventZip,eventTimeSlot:o.eventTimeSlot,pickupTimeSlot:o.pickupTimeSlot,
   eventStartTime:o.eventStartTime,eventEndTime:o.eventEndTime,deliveryWindowStart:o.deliveryWindowStart,deliveryWindowEnd:o.deliveryWindowEnd,exactDeliveryRequested:o.exactDeliveryRequested,exactDeliveryTime:o.exactDeliveryTime,pickupType:o.pickupType,pickupRequiredByTime:o.pickupRequiredByTime,exactPickupTime:o.exactPickupTime,
   customerName:`${o.customer.firstName} ${o.customer.lastName}`,customerPhone:o.customer.phone,totalAmount:o.totalAmount,amountPaid:o.amountPaid,balanceDue:Math.max(Math.round((o.totalAmount-o.amountPaid)*100)/100,0),
   hasCardOnFile:!!(o.stripeCustomerId&&o.savedPaymentMethodId),contractSignedAt:o.contractSignedAt,contractSignatureName:o.contractSignatureName,contractUrl:`/driver/order/${o.id}/contract`,
   items:o.items,isDelivery:deliveryOnDate&&(deliveryAssigned||deliveryUnassigned),isPickup:pickupOnDate&&(pickupAssigned||pickupUnassigned),
   deliveryUnassigned,pickupUnassigned,canCompleteDelivery:deliveryOnDate&&deliveryAssigned,canCompletePickup:pickupOnDate&&pickupAssigned,canTakeActions:deliveryAssigned||pickupAssigned,
   routeSequence:o.routeSequence,pickupRouteSequence:o.pickupRouteSequence,deliveredAt:o.deliveredAt,pickedUpAt:o.pickedUpAt,deliveryPhoto:o.deliveryPhoto,pickupPhoto:o.pickupPhoto,notes:o.notes,
  }
 }).filter(s=>s.isDelivery||s.isPickup)
 return NextResponse.json({driver:{id:access.driverId,name:access.name},canManageOrders:access.isAdmin,authMode:access.authMode,date,stops})
}

export async function PATCH(request:NextRequest){
 const access=await resolveDriverAccess(request)
 if(!access)return NextResponse.json({error:'Unauthorized'},{status:401})
 let body:any;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
 const {orderId,action,photo,note}=body
 if(typeof orderId!=='string'||!['delivered','pickedUp','note'].includes(action))return NextResponse.json({error:'Invalid order action'},{status:400})
 if(action==='note'&&(typeof note!=='string'||!note.trim()||note.length>4000))return NextResponse.json({error:'Enter a note of 1–4000 characters.'},{status:400})
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`
  const order=await tx.order.findUnique({where:{id:orderId}})
  if(!order)return NextResponse.json({error:'Order not found'},{status:404})
  const deliveryMatches=access.isAdmin||order.driverId===access.driverId,pickupMatches=access.isAdmin||order.pickupDriverId===access.driverId
  if((action==='delivered'&&!deliveryMatches)||(action==='pickedUp'&&!pickupMatches)||(!deliveryMatches&&!pickupMatches))return NextResponse.json({error:'Not assigned to this order'},{status:403})
  if(['canceled','cancelled'].includes(order.status)&&action!=='note')return NextResponse.json({error:'This order is canceled. Refresh your route.'},{status:409})
  const data:Record<string,unknown>={}
  if(action==='note')data.internalNotes=[order.internalNotes,`[Driver app · ${access.name} · ${new Date().toISOString()}] ${note.trim()}`].filter(Boolean).join('\n')
  if(action==='delivered'){data.deliveredAt=order.deliveredAt||new Date();if(typeof photo==='string'&&photo)data.deliveryPhoto=photo}
  if(action==='pickedUp'){data.pickedUpAt=order.pickedUpAt||new Date();if(typeof photo==='string'&&photo)data.pickupPhoto=photo}
  await tx.order.update({where:{id:orderId},data})
  return NextResponse.json({success:true})
 })
}
