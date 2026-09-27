export class DeliveryQuoteError extends Error {
  status:number
  constructor(message:string,status=400){super(message);this.name='DeliveryQuoteError';this.status=status}
}

export function normalizeDeliveryZip(value:unknown):string {
  if(typeof value!=='string'||!/^\d{5}(?:-\d{4})?$/.test(value.trim())) {
    throw new DeliveryQuoteError('Please enter a valid 5-digit ZIP code or ZIP+4.')
  }
  return value.trim().slice(0,5)
}

export function requireDeliveryMethod(value:unknown):void {
  if(value!=null&&value!==''&&value!=='delivery') {
    throw new DeliveryQuoteError('Our NYC / Downstate location offers delivery only. Customer warehouse pickup is not available. Please select delivery.')
  }
}

const ZIP_FEES:Record<string,number>={
  '10463':150,'10471':150,
  '10701':175,'10703':175,'10704':175,'10705':175,'10710':175,
  '10550':175,'10552':175,'10553':175,
  '10708':175,'10707':175,'10709':175,
  '10801':200,'10804':200,'10805':200,'10803':200,
  '10583':225,'10538':225,'10543':225,
}

export interface DeliveryQuote {
  fee:number
  distance:number
  zip:string
  isEstimate:true
  distanceBasis:'configured-service-area'
}

export function calculateDeliveryFee(value:number|string):number {
  const zip=typeof value==='string'?normalizeDeliveryZip(value):''
  if(zip&&ZIP_FEES[zip]!=null)return ZIP_FEES[zip]
  throw new DeliveryQuoteError('Downstate delivery pricing is not configured for that ZIP yet. Please contact our office so we can confirm availability and the delivery fee.')
}

export function requireMatchingDeliveryFee(value:unknown,quote:DeliveryQuote):void {
  if(typeof value!=='number'||!Number.isFinite(value)||Math.round(value*100)!==Math.round(quote.fee*100)) {
    throw new DeliveryQuoteError('Your delivery quote needs to be refreshed. Please reload the payment page and review the updated total before continuing.',409)
  }
}

export async function getDeliveryQuote(value:unknown):Promise<DeliveryQuote> {
  const zip=normalizeDeliveryZip(value)
  const fee=ZIP_FEES[zip]
  if(fee==null) {
    throw new DeliveryQuoteError('This ZIP is outside the currently configured NYC / Downstate delivery area. Please contact Friendly Party Rental at 315-884-1498 so we can review the location.')
  }
  return {fee,distance:0,zip,isEstimate:true,distanceBasis:'configured-service-area'}
}
