export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const required=['name','email','eventDate','city','items'];
  for(const key of required){if(!String(body[key]||'').trim()) return res.status(400).json({error:`Missing ${key}`});}
  const clean={
    name:String(body.name).slice(0,120),email:String(body.email).slice(0,180),phone:String(body.phone||'').slice(0,80),
    eventDate:String(body.eventDate).slice(0,40),city:String(body.city).slice(0,120),items:String(body.items).slice(0,1600),
    guests:String(body.guests||'').slice(0,40),
      eventType:String(body.eventType||'').slice(0,100),
      surface:String(body.surface||'').slice(0,80),
      utmSource:String(body.utmSource||'').slice(0,120),
      utmMedium:String(body.utmMedium||'').slice(0,120),
      utmCampaign:String(body.utmCampaign||'').slice(0,160),
      landingPage:String(body.landingPage||'').slice(0,500),
      referrer:String(body.referrer||'').slice(0,500),source:String(body.source||'downstate-site').slice(0,100)
  };
  let delivered=false;
  if(process.env.LEAD_WEBHOOK_URL){
    const r=await fetch(process.env.LEAD_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(clean)});
    delivered=r.ok;
  }
  if(!delivered&&process.env.RESEND_API_KEY&&process.env.LEAD_TO_EMAIL){
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({
      from:process.env.LEAD_FROM_EMAIL||'Friendly Downstate <onboarding@resend.dev>',to:[process.env.LEAD_TO_EMAIL],
      subject:`Downstate quote lead — ${clean.city} — ${clean.eventDate}`,
      text:`Name: ${clean.name}\nEmail: ${clean.email}\nPhone: ${clean.phone}\nEvent date: ${clean.eventDate}\nCity: ${clean.city}\nGuests: ${clean.guests}\nEvent type: ${clean.eventType}\nSurface: ${clean.surface}\nItems: ${clean.items}\nUTM source: ${clean.utmSource}\nUTM medium: ${clean.utmMedium}\nUTM campaign: ${clean.utmCampaign}\nLanding page: ${clean.landingPage}`
    })});
    delivered=r.ok;
  }
  if(!delivered) return res.status(503).json({error:'Lead delivery is not configured yet'});
  return res.status(200).json({ok:true});
}
