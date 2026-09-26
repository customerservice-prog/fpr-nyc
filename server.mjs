import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(__dirname,'dist');
const port=Number(process.env.PORT||3000);
const publicIndexable=process.env.PUBLIC_INDEXABLE==='true';
const leadRate=new Map();
function allowLead(req){
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
  const now=Date.now(), windowMs=10*60*1000, max=8;
  const recent=(leadRate.get(ip)||[]).filter(ts=>now-ts<windowMs);
  if(recent.length>=max){leadRate.set(ip,recent);return false}
  recent.push(now);leadRate.set(ip,recent);
  if(leadRate.size>1000) for(const [key,list] of leadRate) if(!list.some(ts=>now-ts<windowMs)) leadRate.delete(key);
  return true;
}

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
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});
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
    '[DOWNSTATE RENTAL INQUIRY]',
    'Original event type: '+(clean.eventType||'Not specified'),
    'Event address: '+clean.eventAddress,
    'City / neighborhood: '+clean.city,
    'ZIP: '+clean.eventZip,
    'Property / venue: '+clean.propertyType,
    'Setup surface: '+(clean.surface||'Not specified'),
    clean.setupDimensions ? 'Approx. usable setup size: '+clean.setupDimensions : '',
    clean.accessNotes ? 'Access / site notes: '+clean.accessNotes : '',
    'Requested rentals: '+clean.items,
    'Downstate source: '+clean.source,
    clean.utmSource ? 'UTM source: '+clean.utmSource : '',
    clean.utmMedium ? 'UTM medium: '+clean.utmMedium : '',
    clean.utmCampaign ? 'UTM campaign: '+clean.utmCampaign : '',
    clean.utmTerm ? 'UTM term: '+clean.utmTerm : '',
    clean.utmContent ? 'UTM content: '+clean.utmContent : '',
    clean.landingPage ? 'Landing page: '+clean.landingPage : '',
    clean.referrer ? 'Referrer: '+clean.referrer : ''
  ].filter(Boolean).join('\n');
  return {
    requestId:randomUUID(),
    eventType:mapPlanningEventType(clean.eventType),
    eventDate:clean.eventDate,
    guestCount:clean.guests,
    location:[clean.eventAddress,clean.city,clean.eventZip].filter(Boolean).join(', '),
    venueStatus:clean.propertyType==='Home / Backyard'?'Hosting at home':clean.propertyType==='Venue / Event Space'?'Have a venue in mind':'Still deciding',
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

async function handleLead(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!allowLead(req)) return json(res,429,{error:'Too many quote requests. Please try again shortly or call us.'});
  try{
    const raw=await readBody(req);
    const body=JSON.parse(raw||'{}');
    if(String(body.website||'').trim()) return json(res,200,{ok:true});

    const required=['name','email','phone','eventDate','eventAddress','city','eventZip','eventType','propertyType','items'];
    for(const key of required){
      if(!String(body[key]||'').trim()) return json(res,400,{error:`Missing ${key}`});
    }
    const clean={
      name:String(body.name).slice(0,120),
      email:String(body.email).slice(0,180),
      phone:String(body.phone||'').slice(0,80),
      eventDate:String(body.eventDate).slice(0,40),
      eventAddress:String(body.eventAddress||'').slice(0,220),
      city:String(body.city).slice(0,120),
      eventZip:String(body.eventZip||'').slice(0,10),
      propertyType:String(body.propertyType||'').slice(0,100),
      setupDimensions:String(body.setupDimensions||'').slice(0,100),
      accessNotes:String(body.accessNotes||'').slice(0,1200),
      minimumAcknowledged:String(body.minimumAcknowledged||'').slice(0,10),
      items:String(body.items).slice(0,1600),
      guests:String(body.guests||'').slice(0,40),
      eventType:String(body.eventType||'').slice(0,100),
      surface:String(body.surface||'').slice(0,80),
      utmSource:String(body.utmSource||'').slice(0,120),
      utmMedium:String(body.utmMedium||'').slice(0,120),
      utmCampaign:String(body.utmCampaign||'').slice(0,160),
      utmTerm:String(body.utmTerm||'').slice(0,200),
      utmContent:String(body.utmContent||'').slice(0,200),
      landingPage:String(body.landingPage||'').slice(0,500),
      referrer:String(body.referrer||'').slice(0,500),
      source:String(body.source||'downstate-site').slice(0,100)
    };

    if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(clean.email)) return json(res,400,{error:'Please enter a valid email address'});
    if(!/^[+()0-9.\- ]{7,25}$/.test(clean.phone)||clean.phone.replace(/\D/g,'').length<7) return json(res,400,{error:'Please enter a valid phone number'});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(clean.eventDate)) return json(res,400,{error:'Please choose a valid event date'});
    if(!/^\d{5}(?:-\d{4})?$/.test(clean.eventZip)) return json(res,400,{error:'Please enter a valid event ZIP code'});
    if(clean.minimumAcknowledged!=='yes') return json(res,400,{error:'Please acknowledge the Downstate minimum before submitting'});
    console.log('FPR_DOWNSTATE_LEAD '+JSON.stringify({receivedAt:new Date().toISOString(),...clean}));
    let delivered=false;
    let relayReference='';
    try{
      const relayed=await relayToFriendly(clean);
      delivered=relayed.ok;
      relayReference=relayed.reference||'';
      console.log('FPR_DOWNSTATE_CRM_SAVED '+JSON.stringify({reference:relayReference,email:clean.email,city:clean.city}));
    }catch(error){
      console.warn('FPR_DOWNSTATE_CRM_ERROR '+(error instanceof Error?error.message:'unknown error'));
    }

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
          text:`Name: ${clean.name}\nEmail: ${clean.email}\nPhone: ${clean.phone}\nEvent date: ${clean.eventDate}\nEvent address: ${clean.eventAddress}\nCity: ${clean.city}\nZIP: ${clean.eventZip}\nProperty / venue: ${clean.propertyType}\nApprox. setup size: ${clean.setupDimensions}\nAccess / site notes: ${clean.accessNotes}\nGuests: ${clean.guests}\nEvent type: ${clean.eventType}\nSurface: ${clean.surface}\nItems: ${clean.items}\nUTM source: ${clean.utmSource}\nUTM medium: ${clean.utmMedium}\nUTM campaign: ${clean.utmCampaign}\nUTM term: ${clean.utmTerm}\nUTM content: ${clean.utmContent}\nLanding page: ${clean.landingPage}\nSource: ${clean.source}`
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
  const headers={'Content-Type':mime[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
  if(ext==='.html'){headers['Cache-Control']='public, max-age=0, must-revalidate';if(!publicIndexable)headers['X-Robots-Tag']='noindex, nofollow';}
  else headers['Cache-Control']='public, max-age=3600';
  res.writeHead(file.endsWith('404.html')?404:200,headers);
  fs.createReadStream(file).pipe(res);
}

http.createServer(serve).listen(port,'0.0.0.0',()=>{
  console.log(`Friendly Party Rental Downstate listening on ${port}`);
});