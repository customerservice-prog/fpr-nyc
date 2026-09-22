import { prisma } from '@/lib/prisma'
import { IMAGE_CACHE_BUST } from '@/lib/imageVersion'

export const POPULAR_CATEGORY_SLUGS = [
  'bounce-house-rentals','tent-rentals','table-chair-rentals','weddings',
  'photobooth-rentals','dance-floor-stage-rentals','foam-party-machine-rentals',
  'inflatable-movie-screen-rentals','yard-game-rentals',
] as const

const NON_FEATURED_NAME = /\b(upgrade|extra hour|add[- ]?on|replacement|part|accessory|charger|cassette|ink|card|laptop|centerpiece|cover only|cover upgrade|delivery|travel fee|setup fee|damage waiver)\b/i
const HAS_LETTER = /[a-z]/i

export const HOMEPAGE_ITEM_SELECT = {
  id:true,name:true,specialDisplayName:true,slug:true,cost:true,updatedAt:true,sortOrder:true,
  category:{select:{name:true,slug:true}},
} as const

export function isHomepageFeatureCandidate(item:any) {
  const displayName=String(item.specialDisplayName||item.name||'').trim()
  if(!displayName||displayName.length<3||!HAS_LETTER.test(displayName)) return false
  if(NON_FEATURED_NAME.test(displayName)) return false
  if(!item.slug||String(item.slug).trim().length<2) return false
  return true
}

/**
 * Single source of truth for Greenville Popular Rentals in both the public
 * homepage and Website Builder preview.
 *
 * Rank by distinct qualifying SC bookings over the previous 12 months.
 * Quantity is secondary so one large chair order cannot dominate.
 * At most two cards come from one category.
 */
export async function getHomepagePopularItems(limit=8) {
  const candidateRows=await prisma.item.findMany({
    where:{
      displayToCustomer:true,
      status:'Available',
      type:'Regular',
      category:{slug:{in:[...POPULAR_CATEGORY_SLUGS]}},
    },
    orderBy:{sortOrder:'asc'},
    take:120,
    select:HOMEPAGE_ITEM_SELECT,
  })
  const candidates=candidateRows.filter(isHomepageFeatureCandidate)
  if(!candidates.length) return []

  const since=new Date()
  since.setFullYear(since.getFullYear()-1)
  const history=await prisma.orderItem.findMany({
    where:{
      itemId:{in:candidates.map(item=>item.id)},
      order:{
        eventDate:{gte:since},
        status:{notIn:['canceled','cancelled','quote','draft','incomplete']},
      },
    },
    select:{itemId:true,quantity:true,orderId:true},
  })
  const stats=new Map<string,{quantity:number;orders:Set<string>}>()
  for(const row of history){
    if(!row.itemId) continue
    const stat=stats.get(row.itemId)||{quantity:0,orders:new Set<string>()}
    stat.quantity+=Math.max(row.quantity||0,0)
    stat.orders.add(row.orderId)
    stats.set(row.itemId,stat)
  }
  const ranked=[...candidates].sort((a,b)=>{
    const as=stats.get(a.id),bs=stats.get(b.id)
    const aScore=(as?.orders.size||0)*100+Math.min(as?.quantity||0,100)
    const bScore=(bs?.orders.size||0)*100+Math.min(bs?.quantity||0,100)
    return bScore-aScore||a.sortOrder-b.sortOrder||a.name.localeCompare(b.name)
  })
  const categoryCounts=new Map<string,number>()
  return ranked.filter(item=>{
    const key=item.category?.slug||'other'
    const count=categoryCounts.get(key)||0
    if(count>=2) return false
    categoryCounts.set(key,count+1)
    return true
  }).slice(0,limit).map(item=>({
    ...item,
    picture:item.slug?'/api/item-image/'+encodeURIComponent(item.slug)+'?v='+(item.updatedAt?new Date(item.updatedAt).toISOString():IMAGE_CACHE_BUST):null,
  }))
}
