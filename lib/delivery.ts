// NYC/Downstate planning estimate. Origin is the Riverdale 10471 ZIP centroid reference,
// not a storefront, warehouse address or promise of road-mile distance.
// Delivery pricing must be reviewed before public launch and can be changed independently per NYC location.
const WAREHOUSE_ZIP='10471'
const WAREHOUSE_LAT=40.8996
const WAREHOUSE_LON=-73.9060
export class DeliveryQuoteError extends Error{status:number;constructor(message:string,status=400){super(message);this.name='DeliveryQuoteError';this.status=status}}
export function normalizeDeliveryZip(value:unknown):string{
 if(typeof value!=='string'||!/^\d{5}(?:-\d{4})?$/.test(value.trim()))throw new DeliveryQuoteError('Please enter a valid 5-digit ZIP code or ZIP+4.')
 return value.trim().slice(0,5)
}
export function requireDeliveryMethod(value:unknown):void{
 if(value!=null&&value!==''&&value!=='delivery')throw new DeliveryQuoteError('Our NYC / Downstate location offers delivery only. Customer warehouse pickup is not available. Please return to checkout and select delivery.')
}
export function calculateDeliveryFee(distance:number):number{
 if(!Number.isFinite(distance)||distance<0)throw new DeliveryQuoteError('Unable to calculate the delivery estimate.',503)
 if(distance<=5)return 29.99
 if(distance<=15)return 49.99
 return Math.round((89.99+(distance-15)*4)*100)/100
}
export interface DeliveryQuote{fee:number;distance:number;zip:string;isEstimate:true;distanceBasis:'zip-centroid-straight-line'}
export function requireMatchingDeliveryFee(value:unknown,quote:DeliveryQuote):void{
 if(typeof value!=='number'||!Number.isFinite(value)||Math.round(value*100)!==Math.round(quote.fee*100))throw new DeliveryQuoteError('Your delivery quote needs to be refreshed. Please reload the payment page and review the updated total before continuing.',409)
}
function haversineMiles(lat:number,lon:number):number{
 const toRad=(degrees:number)=>degrees*Math.PI/180
 const dLat=toRad(lat-WAREHOUSE_LAT),dLon=toRad(lon-WAREHOUSE_LON)
 const a=Math.sin(dLat/2)**2+Math.cos(toRad(WAREHOUSE_LAT))*Math.cos(toRad(lat))*Math.sin(dLon/2)**2
 const clamped=Math.min(1,Math.max(0,a))
 return 3958.8*2*Math.atan2(Math.sqrt(clamped),Math.sqrt(1-clamped))
}
export async function getDeliveryQuote(value:unknown,fetcher:typeof fetch=fetch):Promise<DeliveryQuote>{
 const zip=normalizeDeliveryZip(value)
 const result=(distance:number):DeliveryQuote=>({fee:calculateDeliveryFee(distance),distance:Math.round(distance*10)/10,zip,isEstimate:true,distanceBasis:'zip-centroid-straight-line'})
 if(zip===WAREHOUSE_ZIP)return result(0)
 try{
  const response=await fetcher(`https://api.zippopotam.us/us/${zip}`,{signal:AbortSignal.timeout(8000),cache:'no-store'})
  if(response.status===404)throw new DeliveryQuoteError('Could not locate that ZIP code. Please double-check it or contact us.')
  if(!response.ok)throw new DeliveryQuoteError('Delivery pricing is temporarily unavailable. Please retry before paying.',503)
  const data=await response.json(),place=data?.places?.[0],latitude=place?.latitude,longitude=place?.longitude
  if(latitude==null||longitude==null||String(latitude).trim()===''||String(longitude).trim()==='')throw new DeliveryQuoteError('Delivery pricing is temporarily unavailable. Please retry before paying.',503)
  const lat=Number(latitude),lon=Number(longitude)
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new DeliveryQuoteError('Delivery pricing is temporarily unavailable. Please retry before paying.',503)
  return result(haversineMiles(lat,lon))
 }catch(error){if(error instanceof DeliveryQuoteError)throw error;throw new DeliveryQuoteError('Delivery pricing is temporarily unavailable. Please retry before paying.',503)}
}
