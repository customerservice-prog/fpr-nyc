const ZIP_FEES:Record<string,number>={
 '10463':79.99,'10471':79.99,
 '10467':99.99,'10468':99.99,'10470':99.99,
 '10701':119.99,'10703':119.99,'10704':119.99,'10705':119.99,'10707':119.99,'10708':119.99,'10709':119.99,'10710':119.99,
 '10550':119.99,'10552':119.99,'10553':119.99,'10803':119.99,
 '10801':139.99,'10804':139.99,'10805':139.99,
}
export class DeliveryQuoteError extends Error{status:number;constructor(message:string,status=400){super(message);this.name='DeliveryQuoteError';this.status=status}}
export function normalizeDeliveryZip(value:unknown):string{if(typeof value!=='string'||!/^\d{5}(?:-\d{4})?$/.test(value.trim()))throw new DeliveryQuoteError('Please enter a valid 5-digit ZIP code or ZIP+4.');return value.trim().slice(0,5)}
export function requireDeliveryMethod(value:unknown):void{if(value!=null&&value!==''&&value!=='delivery')throw new DeliveryQuoteError('Friendly Party Rental NYC is currently delivery-only. Customer warehouse pickup is not available. Please return to checkout and select delivery.')}
export interface DeliveryQuote{fee:number;distance:number;zip:string;isEstimate:false;distanceBasis:'zip-zone'}
export function requireMatchingDeliveryFee(value:unknown,quote:DeliveryQuote):void{if(typeof value!=='number'||!Number.isFinite(value)||Math.round(value*100)!==Math.round(quote.fee*100))throw new DeliveryQuoteError('Your NYC delivery quote needs to be refreshed. Please reload the payment page and review the updated total before continuing.',409)}
export async function getDeliveryQuote(value:unknown):Promise<DeliveryQuote>{const zip=normalizeDeliveryZip(value);const fee=ZIP_FEES[zip];if(fee==null)throw new DeliveryQuoteError('Online delivery is currently limited to selected Riverdale, Northwest Bronx and Lower Westchester ZIP codes. Please contact the NYC team to confirm service for this address.',400);return{fee,distance:0,zip,isEstimate:false,distanceBasis:'zip-zone'}}
