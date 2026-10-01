import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'
import { lookupRentSketchOrder } from '@/lib/rentsketchOrderAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function secureMatch(actual: string, expected: string) {
  if (!actual || actual.length !== expected.length) return false
  try { return timingSafeEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8')) } catch { return false }
}
function esc(value: unknown) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
function money(value: unknown) {
  const n=Number(value)
  return Number.isFinite(n) ? '$'+n.toFixed(2) : 'Confirm pricing'
}

export async function POST(req: NextRequest) {
  const secret=String(process.env.RENTSKETCH_WEBHOOK_SECRET||'')
  if(!secret)return NextResponse.json({error:'RentSketch webhook is not configured'},{status:503})
  const raw=await req.text(),supplied=req.headers.get('x-rentsketch-signature')||''
  const expected=createHmac('sha256',secret).update(raw).digest('hex')
  if(!secureMatch(supplied,expected))return NextResponse.json({error:'Invalid webhook signature'},{status:401})

  let payload:any
  try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
  const d=payload?.data||{}
  const created=Date.parse(payload?.createdAt||'')
  if(!Number.isFinite(created)||Math.abs(Date.now()-created)>5*60*1000)return NextResponse.json({error:'Expired request'},{status:401})

  if(payload?.type==='event_pass.order_check'||payload?.type==='event_pass.order_lookup'){
    return NextResponse.json({
      ok:true,
      accessEmailVersion:1,
      orderAccessVersion:1,
      ...(payload.type==='event_pass.order_lookup'?{order:await lookupRentSketchOrder(d)}:{})
    })
  }
  if(payload?.type==='event_pass.email_check'){
    return NextResponse.json({ok:true,emailReady:false,accessEmailVersion:1})
  }
  if(payload?.type==='event_pass.access_email'){
    return NextResponse.json({error:'NYC RentSketch recovery email is not enabled yet'},{status:503})
  }
  if(payload?.type!=='quote_request.created')return NextResponse.json({ok:true,ignored:true})

  const customerName=String(d.customerName||'RentSketch customer').slice(0,160)
  const customerEmail=String(d.customerEmail||'').slice(0,254)
  const customerPhone=String(d.customerPhone||'').slice(0,50)
  const eventDate=String(d.eventDate||'').slice(0,40)
  const eventType=String(d.eventType||'').slice(0,100)
  const requestId=String(d.id||'').slice(0,100)
  const designId=String(d.designId||'').slice(0,100)
  const plannerSource=String(d.plannerSource||'friendly-nyc').slice(0,120)
  const guests=d.guestCount==null?'Not provided':String(d.guestCount)
  const property=d.property&&typeof d.property==='object'?d.property:{}
  const address=String(property.address||'').slice(0,240)
  const lineItems=Array.isArray(d.lineItems)?d.lineItems.slice(0,75):[]
  const estimate=d.estimateTotal==null?null:Number(d.estimateTotal)
  const dateValue=/^\d{4}-\d{2}-\d{2}$/.test(eventDate)?new Date(eventDate+'T12:00:00Z'):null
  const safeId='rentsketch_nyc_'+requestId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)
  const lines=lineItems.map((item:any)=>`${Number(item?.qty)||1} x ${String(item?.label||'Rental item')} — ${money(item?.amount)}`)
  const message=[
    '[RENTSKETCH NYC QUOTE REQUEST]',
    'Request: '+requestId,
    'Design: '+designId,
    'Source: '+plannerSource,
    'Event type: '+(eventType||'Not provided'),
    'Guests: '+guests,
    'Event address: '+(address||'Not provided'),
    'Submitted estimate: '+money(estimate),
    '',
    ...lines,
    '',
    String(d.notes||'').slice(0,8000),
  ].filter(Boolean).join('\n')

  await prisma.contactMessage.upsert({
    where:{id:safeId},
    update:{},
    create:{
      id:safeId,
      name:customerName,
      email:customerEmail||BUSINESS.email,
      phone:customerPhone||null,
      eventDate:dateValue,
      message,
    }
  })

  const html=`<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172536">
    <h2>New NYC RentSketch quote request</h2>
    <p><strong>Customer:</strong> ${esc(customerName)}</p>
    <p><strong>Email:</strong> ${esc(customerEmail||'Not provided')}</p>
    <p><strong>Event date:</strong> ${esc(eventDate||'Not provided')}</p>
    <p><strong>Guests:</strong> ${esc(guests)}</p>
    <p><strong>Event address:</strong> ${esc(address||'Not provided')}</p>
    <p><strong>Submitted estimate:</strong> ${esc(money(estimate))}</p>
    <pre style="white-space:pre-wrap;background:#f5f7f8;padding:14px;border-radius:10px">${esc(message)}</pre>
  </div>`
  try{await sendEmail({to:BUSINESS.email,subject:'NYC RentSketch quote request — '+customerName,html,replyTo:customerEmail||undefined})}
  catch(error){console.error('NYC RentSketch inquiry saved but staff email notification failed')}

  return NextResponse.json({ok:true,saved:true})
}
