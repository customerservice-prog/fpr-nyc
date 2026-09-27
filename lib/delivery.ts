import { NYC_SERVICE_AREAS } from '@/lib/nycServiceAreas'

export class DeliveryQuoteError extends Error {
  status:number
  constructor(message:string,status=400){super(message);this.name='DeliveryQuoteError';this.status=status}
}

export function normalizeDeliveryZip(value:unknown):string{
  if(typeof value!=='string'||!/^\d{5}(?:-\d{4})?$/.test(value.trim())) throw new DeliveryQuoteError('Please enter a valid 5-digit ZIP code or ZIP+4.')
  return value.trim().slice(0,5)
}

export function requireDeliveryMethod(value:unknown):void{
  if(value!=null&&value!==''&&value!=='delivery') throw new DeliveryQuoteError('Friendly Party Rental NYC offers delivery only. Customer warehouse pickup is not available.')
}

function approvedZips(){return new Set(NYC_SERVICE_AREAS.flatMap(area=>area.zips))}

function configuredFees():Record<string,number>{
  const raw=process.env.NYC_DELIVERY_FEES_JSON
  if(!raw)return {}
  try{
    const parsed=JSON.parse(raw)
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {}
    const result:Record<string,number>={}
    for(const [zip,value] of Object.entries(parsed)){
      const fee=Number(value)
      if(/^\d{5}$/.test(zip)&&Number.isFinite(fee)&&fee>=0)result[zip]=Math.round(fee*100)/100
    }
    return result
  }catch{return {}}
}

export interface DeliveryQuote{fee:number;zip:string;isEstimate:false;distanceBasis:'configured-zip-fee'}

export function requireMatchingDeliveryFee(value:unknown,quote:DeliveryQuote):void{
  if(typeof value!=='number'||!Number.isFinite(value)||Math.round(value*100)!==Math.round(quote.fee*100)){
    throw new DeliveryQuoteError('Your delivery quote needs to be refreshed. Please reload the payment page and review the updated total before continuing.',409)
  }
}

export async function getDeliveryQuote(value:unknown):Promise<DeliveryQuote>{
  const zip=normalizeDeliveryZip(value)
  if(!approvedZips().has(zip)) throw new DeliveryQuoteError('This ZIP code is outside our current NYC / Lower Westchester delivery area. Please contact us so we can review the location.')
  const fees=configuredFees()
  if(!(zip in fees)) throw new DeliveryQuoteError('Delivery pricing for this ZIP has not been configured yet. Please contact us before checkout.',503)
  return {fee:fees[zip],zip,isEstimate:false,distanceBasis:'configured-zip-fee'}
}
