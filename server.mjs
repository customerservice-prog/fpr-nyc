import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(__dirname,'dist');
const port=Number(process.env.PORT||3000);

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

async function handleLead(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const raw=await readBody(req);
    const body=JSON.parse(raw||'{}');
    const required=['name','email','eventDate','city','items'];
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
      source:String(body.source||'downstate-site').slice(0,100)
    };

    let delivered=false;
    if(process.env.LEAD_WEBHOOK_URL){
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
          text:`Name: ${clean.name}\nEmail: ${clean.email}\nPhone: ${clean.phone}\nEvent date: ${clean.eventDate}\nCity: ${clean.city}\nGuests: ${clean.guests}\nItems: ${clean.items}\nSource: ${clean.source}`
        })
      });
      delivered=r.ok;
    }

    if(!delivered) return json(res,503,{error:'Lead delivery is not configured yet'});
    return json(res,200,{ok:true});
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