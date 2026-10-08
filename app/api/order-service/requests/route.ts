export const dynamic='force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NYC_ORDER_SERVICE_COOKIE,verifyNycOrderServiceSession } from '@/lib/nycOrderServiceSecurity'

const TYPES=new Set(['add_item','remove_item','change_address','change_schedule','cancel_order','other'])
const labels:Record<string,string>={
 add_item:'Add rentals',remove_item:'Remove or change rentals',change_address:'Change event address',
 change_schedule:'Change delivery or pickup timing',cancel_order:'Cancellation request',other:'Other order request',
}
const privateHeaders={'Cache-Control':'no-store, private'}

export async function GET(request:NextRequest){
 const session=verifyNycOrderServiceSession(request.cookies.get(NYC_ORDER_SERVICE_COOKIE)?.value)
 if(!session)return NextResponse.json({error:'Verification required.'},{status:401,headers:privateHeaders})
 const rows=await prisma.orderChangeRequest.findMany({
  where:{orderId:session.orderId,customerId:session.customerId},
  orderBy:{createdAt:'desc'},take:25,
 })
 return NextResponse.json({requests:rows.map(row=>({
  id:row.id,requestType:row.requestType,itemName:row.itemName,quantity:row.quantity,status:row.status,
  customerMessage:row.customerMessage,decisionNote:row.decisionNote,createdAt:row.createdAt,decidedAt:row.decidedAt,
 }))},{headers:privateHeaders})
}

export async function POST(request:NextRequest){
 const session=verifyNycOrderServiceSession(request.cookies.get(NYC_ORDER_SERVICE_COOKIE)?.value)
 if(!session)return NextResponse.json({error:'Verification required.'},{status:401,headers:privateHeaders})
 const body=await request.json().catch(()=>({}))
 const requestType=String(body?.requestType||'other')
 const message=String(body?.message||'').trim().slice(0,2000)
 const itemName=String(body?.itemName||'').trim().slice(0,200)
 const quantity=Math.max(0,Math.min(999,Number.parseInt(String(body?.quantity||'0'),10)||0))
 if(!TYPES.has(requestType)||!message)return NextResponse.json({error:'Choose a request type and describe the change you need.'},{status:400,headers:privateHeaders})

 const order=await prisma.order.findFirst({where:{id:session.orderId,customerId:session.customerId},select:{
  id:true,orderNumber:true,customerId:true,status:true,pickedUpAt:true,eventDate:true,
 }})
 if(!order)return NextResponse.json({error:'Verified order is no longer available.'},{status:404,headers:privateHeaders})
 if(['canceled','cancelled','completed'].includes(order.status.toLowerCase())||order.pickedUpAt){
  return NextResponse.json({error:'This order is no longer eligible for online change requests.'},{status:409,headers:privateHeaders})
 }
 if(order.status.toLowerCase()!=='active'){
  return NextResponse.json({error:'This service is for booked orders. Please finish checkout first.'},{status:409,headers:privateHeaders})
 }

 const pendingCount=await prisma.orderChangeRequest.count({where:{orderId:order.id,status:'pending'}})
 if(pendingCount>=10)return NextResponse.json({error:'This order already has several requests waiting for review.'},{status:429,headers:privateHeaders})

 const duplicate=await prisma.orderChangeRequest.findFirst({where:{
  orderId:order.id,customerId:order.customerId,requestType,customerMessage:message,status:'pending',
 }})
 if(duplicate)return NextResponse.json({success:true,duplicate:true,request:{id:duplicate.id,status:duplicate.status}},{headers:privateHeaders})

 const created=await prisma.orderChangeRequest.create({data:{
  orderId:order.id,customerId:order.customerId,requestType,
  itemName:itemName||labels[requestType]||'Order request',quantity,
  quotedUnitPrice:0,estimatedSubtotal:0,customerMessage:message,status:'pending',
 }})
 return NextResponse.json({success:true,request:{id:created.id,status:created.status},message:'Request submitted for staff review. Your paid order has not changed yet.'},{headers:privateHeaders})
}
