import { startOfDay,endOfDay } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { holdsStockWhere,rentalPeriod } from '@/lib/nycInventory'

export class NycRentSketchInventoryError extends Error{
 constructor(public status:number,public code:string,message:string){super(message);this.name='NycRentSketchInventoryError'}
}
function clean(value:unknown,max=180){return typeof value==='string'?value.trim().slice(0,max):''}
function parseDate(value:unknown,label:string){
 const s=clean(value,20)
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new NycRentSketchInventoryError(400,'invalid_inventory_date','A valid '+label+' is required.')
 const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw new NycRentSketchInventoryError(400,'invalid_inventory_date','A valid '+label+' is required.')
 return {s,d}
}
function slug(value:unknown){const s=clean(value).toLowerCase();return /^[-a-z0-9]{1,180}$/.test(s)?s:''}

export async function nycRentSketchInventorySnapshot(input:{eventDate?:unknown,eventEndDate?:unknown,slugs?:unknown,excludeOrderId?:unknown}){
 const start=parseDate(input.eventDate,'event date'),end=input.eventEndDate?parseDate(input.eventEndDate,'event end date'):start
 if(end.s<start.s)throw new NycRentSketchInventoryError(400,'invalid_inventory_range','Event end date cannot be before the event date.')
 const slugs=Array.isArray(input.slugs)?Array.from(new Set(input.slugs.map(slug).filter(Boolean))).slice(0,250):[]
 if(!slugs.length)throw new NycRentSketchInventoryError(400,'inventory_products_required','Choose exact NYC rental SKUs to check.')
 const excludeOrderId=clean(input.excludeOrderId,100)||null
 const period=rentalPeriod(start.d,1,end.d)
 const [rows,closed]=await Promise.all([
  prisma.item.findMany({where:{slug:{in:slugs}},select:{id:true,slug:true,name:true,cost:true,quantity:true,status:true,displayToCustomer:true,bookableAfter:true}}),
  prisma.closedDate.findFirst({where:{date:{gte:startOfDay(period.start),lte:endOfDay(period.end)}},select:{id:true}}),
 ])
 const ids=rows.map(r=>r.id)
 const lines=ids.length?await prisma.orderItem.findMany({
  where:{
   itemId:{in:ids},
   order:{
    ...(excludeOrderId?{id:{not:excludeOrderId}}:{}),
    status:{notIn:['canceled','cancelled','draft','incomplete']},
    eventDate:{lte:period.end},
    AND:[holdsStockWhere(),{OR:[{eventEndDate:{gte:period.start}},{eventEndDate:null,eventDate:{gte:period.start}}]}],
   },
  },
  select:{itemId:true,quantity:true},
 }):[]
 const booked=new Map<string,number>()
 for(const line of lines)if(line.itemId)booked.set(line.itemId,(booked.get(line.itemId)||0)+line.quantity)
 const bySlug=new Map(rows.map(r=>[r.slug.toLowerCase(),r]))
 const items:any[]=[],missingSlugs:string[]=[]
 for(const s of slugs){
  const item=bySlug.get(s)
  if(!item){missingSlugs.push(s);continue}
  const active=item.displayToCustomer&&item.status==='Available'&&!closed&&(!item.bookableAfter||item.bookableAfter.getTime()<=period.start.getTime())
  const available=active?Math.max(0,item.quantity-(booked.get(item.id)||0)):0
  items.push({slug:item.slug,itemId:item.id,name:item.name,available,catalogQuantity:item.quantity,unitPrice:Number(item.cost||0),status:active?(available>0?'available':'unavailable'):'blocked'})
 }
 return {inventoryVersion:1,generatedAt:new Date().toISOString(),eventDate:start.s,eventEndDate:end.s,items,missingSlugs}
}
