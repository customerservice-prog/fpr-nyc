import { createHmac, timingSafeEqual } from 'node:crypto'

export const NYC_ORDER_SERVICE_COOKIE = 'fpr_nyc_order_service'
export const NYC_ORDER_SERVICE_SESSION_TTL_SECONDS = 30 * 60
export const NYC_ORDER_VERIFICATION_TTL_MS = 10 * 60 * 1000
export const NYC_ORDER_MAX_CODE_ATTEMPTS = 5

type SessionPayload = { v:1; orderId:string; customerId:string; exp:number }

function secret() {
  const value=String(process.env.ASSISTANT_SESSION_SECRET||process.env.NEXTAUTH_SECRET||'').trim()
  return value.length>=16?value:null
}
export function nycOrderServiceSecurityReady(){return Boolean(secret())}
function hmac(value:string){const key=secret();return key?createHmac('sha256',key).update(value).digest('base64url'):null}
export function normalizeNycOrderNumber(value:unknown){return String(value||'').trim().replace(/^#/,'').replace(/\s+/g,'').toUpperCase().slice(0,64)}
export function hashNycOrderLookup(orderNumber:string){return hmac('nyc-order:'+normalizeNycOrderNumber(orderNumber))}
export function hashNycOrderOtp(challengeId:string,code:string){return hmac('nyc-otp:'+challengeId+':'+code)}
export function hashNycOrderRequestIp(headers:Headers){const ip=String(headers.get('x-forwarded-for')||headers.get('x-real-ip')||'unknown').split(',')[0].trim();return hmac('nyc-ip:'+ip)}
export function nycOrderHashesEqual(a:string|null|undefined,b:string|null|undefined){
 if(!a||!b)return false
 const x=Buffer.from(a),y=Buffer.from(b)
 return x.length===y.length&&timingSafeEqual(x,y)
}
export function createNycOrderServiceSession(orderId:string,customerId:string,now=Date.now()){
 const key=secret(); if(!key||!orderId||!customerId)return null
 const payload:SessionPayload={v:1,orderId,customerId,exp:now+NYC_ORDER_SERVICE_SESSION_TTL_SECONDS*1000}
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url')
 const sig=createHmac('sha256',key).update(encoded).digest('base64url')
 return encoded+'.'+sig
}
export function verifyNycOrderServiceSession(token:string|null|undefined,now=Date.now()):SessionPayload|null{
 const key=secret();if(!key||!token)return null
 const parts=token.split('.');if(parts.length!==2)return null
 const [encoded,sig]=parts,expected=createHmac('sha256',key).update(encoded).digest('base64url')
 if(!nycOrderHashesEqual(sig,expected))return null
 try{
  const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')) as SessionPayload
  if(payload?.v!==1||!payload.orderId||!payload.customerId||!Number.isFinite(payload.exp)||payload.exp<=now)return null
  return payload
 }catch{return null}
}
