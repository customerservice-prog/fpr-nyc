export const dynamic='force-dynamic'

import { NextRequest,NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveDriverAccess } from '@/lib/driverAccess'
import { POST as checkout } from '@/app/api/checkout/route'

export async function POST(request:NextRequest){
 const access=await resolveDriverAccess(request)
 if(!access)return NextResponse.json({error:'Sign in to the driver app again.'},{status:401})
 if(access.authMode==='staff')return NextResponse.json({error:'Driver staff accounts cannot process payments.'},{status:403})
 let body:any;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 const {orderId,amount,saveCard}=body
 if(typeof orderId!=='string'||typeof amount!=='number'||!Number.isFinite(amount)||amount<0.5||Math.abs(amount*100-Math.round(amount*100))>.000001){
  return NextResponse.json({error:'Enter a payment of at least $0.50 in dollars and cents.'},{status:400})
 }
 const order=await prisma.order.findUnique({where:{id:orderId}})
 if(!order)return NextResponse.json({error:'Order not found.'},{status:404})
 if(!access.isAdmin&&order.driverId!==access.driverId&&order.pickupDriverId!==access.driverId)return NextResponse.json({error:'This order is assigned to another driver.'},{status:403})
 if(['canceled','cancelled','quote','incomplete'].includes(order.status))return NextResponse.json({error:'This order is not available for driver payment.'},{status:409})
 if(Math.round(amount*100)>Math.round((order.totalAmount-order.amountPaid)*100))return NextResponse.json({error:'Amount exceeds the remaining balance. Refresh the order.'},{status:400})
 return checkout(new NextRequest(new URL('/api/checkout',request.url),{
  method:'POST',headers:request.headers,body:JSON.stringify({orderId,amount,saveCard:saveCard===true}),
 }))
}
