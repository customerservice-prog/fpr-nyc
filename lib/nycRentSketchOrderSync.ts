import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { nycRentSketchInventorySnapshot } from '@/lib/nycRentSketchInventory'

export class NycRentSketchOrderSyncError extends Error{
 constructor(public status:number,public code:string,message:string){super(message);this.name='NycRentSketchOrderSyncError'}
}
function text(value:unknown,max=180){return typeof value==='string'?value.trim().slice(0,max):''}
function slug(value:unknown){const s=text(value).toLowerCase();return /^[-a-z0-9]{1,180}$/.test(s)?s:''}
function qty(value:unknown){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=1000?n:null}

export async function syncNycRentSketchOrder(input:any){
 const orderId=text(input?.orderId,100)
 const email=text(input?.email,254).toLowerCase()
 const expectedUpdatedAt=text(input?.expectedUpdatedAt,80)
 const designId=text(input?.designId,100)
 const designRevision=Number(input?.designRevision)
 const mode=input?.mode==='submit'?'submit':'preview'
 const managed:string[]=Array.isArray(input?.managedSlugs)
  ? Array.from(new Set<string>((input.managedSlugs as unknown[]).map(value=>slug(value)).filter((value):value is string=>Boolean(value)))).slice(0,250)
  : []
 if(!orderId||!email||!expectedUpdatedAt||!designId||!Number.isInteger(designRevision)||designRevision<1||!managed.length){
  throw new NycRentSketchOrderSyncError(400,'invalid_sync_request','The NYC RentSketch order sync request is incomplete.')
 }
 const desired=new Map<string,number>()
 for(const raw of (Array.isArray(input?.desiredItems)?input.desiredItems.slice(0,250):[]) as any[]){
  const s=slug(raw?.slug),q=qty(raw?.quantity)
  if(!s||q===null||!managed.includes(s))throw new NycRentSketchOrderSyncError(400,'invalid_desired_sku','A synchronized NYC rental SKU or quantity is invalid.')
  desired.set(s,q)
 }

 const order=await prisma.order.findFirst({
  where:{id:orderId,customer:{email:{equals:email,mode:'insensitive'}}},
  include:{customer:true,items:{include:{item:{select:{id:true,slug:true,name:true,cost:true,displayToCustomer:true,status:true}}}}},
 })
 if(!order)throw new NycRentSketchOrderSyncError(404,'order_not_found','The NYC reservation could not be found.')
 if(String(order.status).toLowerCase()!=='active'||order.pickedUpAt)throw new NycRentSketchOrderSyncError(409,'order_not_editable','This reservation is not eligible for RentSketch changes.')
 const actualUpdatedAt=order.updatedAt.toISOString()
 if(actualUpdatedAt!==expectedUpdatedAt)throw new NycRentSketchOrderSyncError(409,'order_revision_conflict','Friendly Party Rental NYC changed this reservation after RentSketch loaded it. Reload before synchronizing.')

 const current=new Map<string,{itemId:string;slug:string;name:string;quantity:number}>()
 for(const line of order.items){
  if(!line.itemId||!line.item?.slug)continue
  const s=line.item.slug.toLowerCase(),row=current.get(s)||{itemId:line.itemId,slug:s,name:line.itemName||line.item.name,quantity:0}
  row.quantity+=Number(line.quantity||0);current.set(s,row)
 }
 const catalog=await prisma.item.findMany({where:{slug:{in:managed}},select:{id:true,slug:true,name:true,cost:true,displayToCustomer:true,status:true}})
 const catalogBySlug=new Map(catalog.map(i=>[i.slug.toLowerCase(),i]))
 const snapshot=await nycRentSketchInventorySnapshot({
  eventDate:order.eventDate.toISOString().slice(0,10),
  eventEndDate:(order.eventEndDate||order.eventDate).toISOString().slice(0,10),
  slugs:managed,excludeOrderId:order.id,
 })
 const availBySlug=new Map(snapshot.items.map((i:any)=>[String(i.slug).toLowerCase(),i]))
 const changes:any[]=[],unavailable:any[]=[],unmanaged:string[]=[]
 for(const s of managed){
  const item=catalogBySlug.get(s)
  if(!item){unmanaged.push(s);continue}
  const from=current.get(s)?.quantity||0,to=desired.get(s)||0
  if(from===to)continue
  const availability=availBySlug.get(s)
  if(to>from){
   const available=Number(availability?.available||0)
   if(!item.displayToCustomer||item.status!=='Available'||to>available){
    unavailable.push({slug:s,itemId:item.id,name:item.name,requested:to,available})
    continue
   }
  }
  changes.push({itemId:item.id,slug:s,name:item.name,fromQuantity:from,toQuantity:to,deltaQuantity:to-from,currentCatalogPrice:Number(item.cost||0),available:Number(availability?.available||0)})
 }
 const fingerprint=createHash('sha256').update(JSON.stringify([order.id,expectedUpdatedAt,designId,designRevision,managed.slice().sort(),[...desired.entries()].sort()])).digest('hex')
 const preview={ok:true,mode:'preview',fingerprint,orderId:order.id,orderNumber:order.orderNumber,orderUpdatedAt:actualUpdatedAt,changes,unavailable,unmanaged}
 if(mode==='preview')return preview
 if(unavailable.length)throw new NycRentSketchOrderSyncError(409,'inventory_conflict','One or more requested NYC rentals are not available for the reservation dates.')
 if(unmanaged.length)throw new NycRentSketchOrderSyncError(409,'catalog_conflict','One or more managed SKUs are no longer in the NYC catalog.')

 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`
  const locked=await tx.order.findUnique({where:{id:order.id},select:{updatedAt:true,status:true,pickedUpAt:true,customerId:true,orderNumber:true}})
  if(!locked||locked.updatedAt.toISOString()!==expectedUpdatedAt||locked.status!=='active'||locked.pickedUpAt){
   throw new NycRentSketchOrderSyncError(409,'order_revision_conflict','The NYC reservation changed while RentSketch was synchronizing. Reload and try again.')
  }
  const allIds=catalog.map(i=>i.id)
  const pending=allIds.length?await tx.orderChangeRequest.findMany({where:{orderId:order.id,requestType:'rentsketch_set_quantity',itemId:{in:allIds},status:'pending'},orderBy:{createdAt:'desc'}}):[]
  const pendingByItem=new Map<string,any>();for(const row of pending)if(row.itemId&&!pendingByItem.has(row.itemId))pendingByItem.set(row.itemId,row)
  const changedIds=new Set(changes.map(c=>c.itemId))
  const restored=allIds.filter(id=>!changedIds.has(id))
  if(restored.length)await tx.orderChangeRequest.updateMany({where:{orderId:order.id,requestType:'rentsketch_set_quantity',itemId:{in:restored},status:'pending'},data:{status:'superseded',decisionNote:'Latest RentSketch layout matches the booked quantity again.',decidedAt:new Date()}})
  const requests:any[]=[]
  for(const change of changes){
   const existing=pendingByItem.get(change.itemId)
   if(existing&&Number(existing.quantity)===change.toQuantity){requests.push(existing);continue}
   if(existing)await tx.orderChangeRequest.updateMany({where:{orderId:order.id,requestType:'rentsketch_set_quantity',itemId:change.itemId,status:'pending'},data:{status:'superseded',decisionNote:'Superseded by a newer saved RentSketch layout.',decidedAt:new Date()}})
   requests.push(await tx.orderChangeRequest.create({data:{
    orderId:order.id,customerId:order.customerId,requestType:'rentsketch_set_quantity',itemId:change.itemId,itemName:change.name,
    quantity:change.toQuantity,quotedUnitPrice:change.currentCatalogPrice,estimatedSubtotal:Math.round(change.currentCatalogPrice*change.toQuantity*100)/100,
    customerMessage:`RentSketch design ${designId} revision ${designRevision}; quantity ${change.fromQuantity} → ${change.toQuantity}; sync ${fingerprint.slice(0,16)}.`,status:'pending',
   }}))
  }
  return {ok:true,mode:'submit',fingerprint,orderId:order.id,orderNumber:order.orderNumber,orderUpdatedAt:actualUpdatedAt,changes,requests:requests.map(r=>({id:r.id,itemId:r.itemId,targetQuantity:r.quantity,status:r.status})),unavailable:[],unmanaged:[]}
 })
}
