import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()
const SOURCE = 'https://www.friendlypartyrental.com/api/items'
const APPLY = process.argv.includes('--apply')
const snapshot = JSON.parse(await fs.readFile(path.join(process.cwd(),'data','nyc-premium-price-snapshot-20260930.json'),'utf8'))

function cleanNycPrice(raw){
  const value=Number(raw)
  if(!Number.isFinite(value)||value<=0) throw new Error('Invalid NYC price '+raw)
  if(Number.isInteger(value)) return value
  if(value<10) return Math.ceil(value)
  if(value<100) return Math.round(value)
  if(value<500) return Math.round(value/5)*5
  if(value<1000) return Math.round(value/10)*10
  return Math.round(value/25)*25
}
const premium=new Map(snapshot.items.map(r=>[r.slug,cleanNycPrice(r.nycPrice)]))
const packages=new Map(snapshot.packageExclusion.excluded.map(r=>[r.slug,Number(r.syracusePrice)]))

const res=await fetch(SOURCE,{headers:{Accept:'application/json','User-Agent':'Friendly-Party-Rental-NYC-catalog-sync/1.0'},cache:'no-store'})
if(!res.ok) throw new Error('Syracuse catalog HTTP '+res.status)
const payload=await res.json()
if(!payload||!Array.isArray(payload.items)||payload.items.length===0) throw new Error('Syracuse catalog empty')
const sourceItems=payload.items
const slugs=new Set()
for(const item of sourceItems){
  if(!item?.slug||slugs.has(item.slug)) throw new Error('Missing/duplicate Syracuse slug '+item?.slug)
  slugs.add(item.slug)
  if(!Number.isInteger(Number(item.quantity))||Number(item.quantity)<0) throw new Error('Invalid quantity '+item.slug)
  if(!item.category?.slug) throw new Error('Missing category '+item.slug)
  if(!premium.has(item.slug)&&!packages.has(item.slug)) throw new Error('No approved NYC price rule for '+item.slug)
}

const categoryRows=new Map()
for(const item of sourceItems){
  const c=item.category
  if(!categoryRows.has(c.slug)) categoryRows.set(c.slug,{slug:c.slug,name:c.name||c.slug,pricingProfile:c.pricingProfile||'standard'})
}

console.log(JSON.stringify({apply:APPLY,sourceItemCount:sourceItems.length,categoryCount:categoryRows.size,nonPackageCount:premium.size,packageCount:packages.size},null,2))
if(!APPLY){ console.log('Dry run only'); await prisma.$disconnect(); process.exit(0) }

for(const c of categoryRows.values()){
  await prisma.category.upsert({
    where:{slug:c.slug},
    update:{name:c.name,pricingProfile:c.pricingProfile},
    create:{
      name:c.name,slug:c.slug,pricingProfile:c.pricingProfile,displayToCustomer:true,
      description:`${c.name} rentals from Friendly Party Rental NYC.`,
      picture:`https://www.friendlypartyrental.com/api/category-image/${encodeURIComponent(c.slug)}`
    }
  })
}
const categories=Object.fromEntries((await prisma.category.findMany()).map(c=>[c.slug,c.id]))

for(const s of sourceItems){
  const isPackage=packages.has(s.slug)
  const price=isPackage?packages.get(s.slug):premium.get(s.slug)
  const data={
    name:s.name,
    description:s.description??null,
    type:s.type||'Regular',
    cost:price,
    quantity:Number(s.quantity),
    displayToCustomer:s.displayToCustomer!==false,
    scheduleProfile:s.scheduleProfile??null,
    categoryId:categories[s.category.slug],
    status:s.status||'Available',
    bookableAfter:s.bookableAfter?new Date(s.bookableAfter):null,
    bookableAfterMessage:s.bookableAfterMessage??null,
    specialDisplayName:s.specialDisplayName??null,
    setupArea:s.setupArea??null,
    attendants:Number.isInteger(Number(s.attendants))?Number(s.attendants):null,
    ageGroup:s.ageGroup??null,
    colorOptions:Array.isArray(s.colorOptions)?s.colorOptions:[],
    taxable:s.taxable!==false,
    setupFee:s.setupFee==null?null:Number(s.setupFee),
    suggestedAddonIds:Array.isArray(s.suggestedAddonIds)?s.suggestedAddonIds:[],
  }
  const existing=await prisma.item.findUnique({where:{slug:s.slug},select:{id:true,picture:true}})
  if(existing){
    await prisma.item.update({where:{slug:s.slug},data})
  }else{
    await prisma.item.create({data:{...data,slug:s.slug,picture:`https://www.friendlypartyrental.com/api/item-image/${encodeURIComponent(s.slug)}`}})
  }
}

const nyc=await prisma.item.findMany({where:{slug:{in:[...slugs]}},select:{slug:true,cost:true,quantity:true,displayToCustomer:true}})
const by=new Map(nyc.map(x=>[x.slug,x]))
const missing=[],quantityMismatches=[],priceMismatches=[]
for(const s of sourceItems){
  const row=by.get(s.slug)
  if(!row){missing.push(s.slug);continue}
  if(row.quantity!==Number(s.quantity)) quantityMismatches.push({slug:s.slug,nyc:row.quantity,syracuse:Number(s.quantity)})
  const expected=packages.has(s.slug)?packages.get(s.slug):premium.get(s.slug)
  if(Number(row.cost)!==Number(expected)) priceMismatches.push({slug:s.slug,nyc:row.cost,expected})
}
if(missing.length||quantityMismatches.length||priceMismatches.length) throw new Error(JSON.stringify({missing,quantityMismatches,priceMismatches}))
const publicCount=nyc.filter(x=>x.displayToCustomer).length
console.log(JSON.stringify({synced:nyc.length,publicCount,missingCount:0,quantityMismatchCount:0,priceMismatchCount:0},null,2))
await prisma.$disconnect()
