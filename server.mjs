import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(__dirname,'dist');
const port=Number(process.env.PORT||3000);
import crypto from 'node:crypto';

const mime={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.xml':'application/xml; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon'
};

function json(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

async function readBody(req){
  return await new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{
      data+=chunk;
      if(data.length>100000){reject(new Error('Body too large'));req.destroy();}
    });
    req.on('end',()=>resolve(data));
    req.on('error',reject);
  });
}


function mapPlanningEventType(value){
  const v=String(value||'').toLowerCase();
  if(v.includes('wedding')||v.includes('reception')) return 'Wedding';
  if(v.includes('corporate')) return 'Corporate event';
  if(v.includes('community')||v.includes('festival')||v.includes('fundraiser')) return 'Festival / fundraiser';
  if(v.includes('birthday')||v.includes('graduation')||v.includes('family')||v.includes('party')||v.includes('shower')||v.includes('anniversary')) return 'Private party / celebration';
  return 'Other / not sure yet';
}
function planningRelayPayload(clean){
  const notes=[
    '[DOWNSTATE RENTAL QUOTE]',
    'Original event type: '+(clean.eventType||'Not specified'),
    'Setup surface: '+(clean.surface||'Not specified'),
    'Requested rentals: '+clean.items,
    'Downstate source: '+clean.source,
    clean.utmSource ? 'UTM source: '+clean.utmSource : '',
    clean.utmMedium ? 'UTM medium: '+clean.utmMedium : '',
    clean.utmCampaign ? 'UTM campaign: '+clean.utmCampaign : '',
    clean.landingPage ? 'Landing page: '+clean.landingPage : '',
    clean.referrer ? 'Referrer: '+clean.referrer : ''
  ].filter(Boolean).join('\n');
  return {
    requestId:randomUUID(),
    eventType:mapPlanningEventType(clean.eventType),
    eventDate:clean.eventDate,
    guestCount:clean.guests,
    location:clean.city,
    venueStatus:'Still deciding',
    help:['Rentals'],
    name:clean.name,
    phone:clean.phone,
    email:clean.email,
    message:notes,
    website:''
  };
}
async function relayToFriendly(clean){
  const url=process.env.LEAD_RELAY_URL||'https://www.friendlypartyrental.com/api/event-planning';
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(planningRelayPayload(clean))});
  let data={};
  try{data=await response.json()}catch{}
  if(!response.ok) throw new Error((data&&data.error)||('Friendly relay returned '+response.status));
  return {ok:true,reference:data&&data.reference?String(data.reference):''};
}

async function saveToFriendlyPlanning(clean){
  const mapType=(value)=>{
    const v=String(value||'').toLowerCase();
    if(v.includes('wedding')) return 'Wedding';
    if(v.includes('corporate')) return 'Corporate event';
    if(v.includes('community')) return 'Festival / fundraiser';
    if(v.includes('school')||v.includes('church')) return 'Festival / fundraiser';
    if(v.includes('birthday')||v.includes('graduation')||v.includes('family')) return 'Private party / celebration';
    return 'Other / not sure yet';
  };
  const message=[
    '[DOWNSTATE RENTAL INQUIRY]',
    'Source: '+(clean.source||'fpr-nyc'),
    'Setup surface: '+(clean.surface||'Not specified'),
    'Items requested: '+clean.items,
    'UTM source: '+(clean.utmSource||''),
    'UTM medium: '+(clean.utmMedium||''),
    'UTM campaign: '+(clean.utmCampaign||''),
    'Landing page: '+(clean.landingPage||''),
    'Referrer: '+(clean.referrer||'')
  ].join('\n');
  const payload={
    requestId:crypto.randomUUID(),
    name:clean.name,
    email:clean.email,
    phone:clean.phone,
    eventType:mapType(clean.eventType),
    eventDate:clean.eventDate||'',
    guestCount:clean.guests||'',
    location:clean.city,
    venueStatus:'Still deciding',
    help:['Rentals'],
    message,
    website:''
  };
  const endpoint=process.env.FRIENDLY_INQUIRY_API||'https://www.friendlypartyrental.com/api/event-planning';
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data?.success) throw new Error(data?.error||('Friendly inquiry API returned '+response.status));
  return data.reference||null;
}

async function handleLead(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const raw=await readBody(req);
    const body=JSON.parse(raw||'{}');
    const required=['name','email','phone','eventDate','city','items'];
    for(const key of required){
      if(!String(body[key]||'').trim()) return json(res,400,{error:`Missing ${key}`});
    }
    const clean={
      name:String(body.name).slice(0,120),
      email:String(body.email).slice(0,180),
      phone:String(body.phone||'').slice(0,80),
      eventDate:String(body.eventDate).slice(0,40),
      city:String(body.city).slice(0,120),
      items:String(body.items).slice(0,1600),
      guests:String(body.guests||'').slice(0,40),
      eventType:String(body.eventType||'').slice(0,100),
      surface:String(body.surface||'').slice(0,80),
      utmSource:String(body.utmSource||'').slice(0,120),
      utmMedium:String(body.utmMedium||'').slice(0,120),
      utmCampaign:String(body.utmCampaign||'').slice(0,160),
      landingPage:String(body.landingPage||'').slice(0,500),
      referrer:String(body.referrer||'').slice(0,500),
      source:String(body.source||'downstate-site').slice(0,100)
    };

    console.log('FPR_DOWNSTATE_LEAD '+JSON.stringify({receivedAt:new Date().toISOString(),...clean}));
    let delivered=false;
    let reference=null;
    try{
      reference=await saveToFriendlyPlanning(clean);
      delivered=true;
      console.log('FPR_DOWNSTATE_CRM_SAVED '+JSON.stringify({reference,email:clean.email,city:clean.city}));
    }catch(err){
      console.error('FPR_DOWNSTATE_CRM_ERROR '+String(err?.message||err));
    }
    let relayReference='';
    try{
      const relayed=await relayToFriendly(clean);
      delivered=relayed.ok;
      relayReference=relayed.reference||'';
    }catch(error){console.warn('Friendly lead relay failed:',error instanceof Error?error.message:'unknown error')}

    if(!delivered&&process.env.LEAD_WEBHOOK_URL){
      const r=await fetch(process.env.LEAD_WEBHOOK_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(clean)
      });
      delivered=r.ok;
    }

    if(!delivered&&process.env.RESEND_API_KEY&&process.env.LEAD_TO_EMAIL){
      const r=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          from:process.env.LEAD_FROM_EMAIL||'Friendly Downstate <onboarding@resend.dev>',
          to:[process.env.LEAD_TO_EMAIL],
          reply_to:clean.email,
          subject:`Downstate quote lead — ${clean.city} — ${clean.eventDate}`,
          text:`Name: ${clean.name}\nEmail: ${clean.email}\nPhone: ${clean.phone}\nEvent date: ${clean.eventDate}\nCity: ${clean.city}\nGuests: ${clean.guests}\nEvent type: ${clean.eventType}\nSurface: ${clean.surface}\nItems: ${clean.items}\nUTM source: ${clean.utmSource}\nUTM medium: ${clean.utmMedium}\nUTM campaign: ${clean.utmCampaign}\nLanding page: ${clean.landingPage}\nSource: ${clean.source}`
        })
      });
      delivered=r.ok;
    }

    if(!delivered) return json(res,503,{error:'Lead delivery is not configured yet'});
    return json(res,200,{ok:true,reference:relayReference||null});
  }catch(err){
    console.error('Lead error',err);
    return json(res,400,{error:'Invalid request'});
  }
}

function serve(req,res){
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  if(url.pathname==='/health') return json(res,200,{ok:true});
  if(url.pathname==='/api/lead') return handleLead(req,res);

  let pathname=decodeURIComponent(url.pathname);
  if(pathname.endsWith('/')) pathname+='index.html';
  const normalized=path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let file=path.join(root,normalized);
  if(!file.startsWith(root)) return json(res,403,{error:'Forbidden'});
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(root,'404.html');

  const ext=path.extname(file).toLowerCase();
  const headers={'Content-Type':mime[ext]||'application/octet-stream'};
  if(ext==='.html') headers['Cache-Control']='public, max-age=0, must-revalidate';
  else headers['Cache-Control']='public, max-age=3600';
  res.writeHead(file.endsWith('404.html')?404:200,headers);
  fs.createReadStream(file).pipe(res);
}

http.createServer(serve).listen(port,'0.0.0.0',()=>{
  console.log(`Friendly Party Rental Downstate listening on ${port}`);
});