import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Approximate Riverdale service-area reference point for a local visibility grid.
// It is not a warehouse/storefront coordinate and must never be presented as one.
const CENTER={lat:34.8526,lng:-82.3940}
type P={id:string;row:number;col:number;lat:number;lng:number;rank:number|null;competitor?:string}

async function allowed(){return Boolean((await getServerSession(authOptions))?.user)}
function read(req:NextRequest){
  const s=req.nextUrl.searchParams
  return {
    keyword:s.get('keyword')||'party rentals',
    gridSize:Math.min(13,Math.max(3,Number(s.get('gridSize'))||7)),
    radiusMiles:Math.min(25,Math.max(1,Number(s.get('radiusMiles'))||12)),
  }
}
function blank(x:ReturnType<typeof read>,reason?:string){
  const configured=Boolean(process.env.SERPAPI_KEY)
  return {configured,provider:configured?'SerpApi':null,...x,scannedAt:null,points:[],metrics:{averageRank:null,top3:0,top10:0,found:0},reason}
}
function move(n:number,e:number){return {lat:CENTER.lat+n/69,lng:CENTER.lng+e/(69*Math.cos(CENTER.lat*Math.PI/180))}}
function ours(x:any){return String(x?.title||'').toLowerCase().includes('friendly party rental')}
async function scan(keyword:string,p:P,key:string){
  const params={engine:'google_maps',q:keyword,ll:`@${p.lat},${p.lng},14z`,type:'search',hl:'en',gl:'us',api_key:key}
  const url='https://serpapi.com/search.json?'+new URLSearchParams(params).toString()
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)})
  if(!r.ok)throw new Error('Ranking provider request failed')
  const j=await r.json()
  if(j.error)throw new Error(String(j.error))
  const list=Array.isArray(j.local_results)?j.local_results:[]
  const i=list.findIndex(ours)
  return {...p,rank:i<0?null:(Number(list[i]?.position)||i+1),competitor:list.find((v:any)=>!ours(v))?.title}
}
function metrics(ps:P[]){
  const f=ps.filter(p=>p.rank!==null),n=ps.length||1
  return {
    averageRank:f.length?f.reduce((s,p)=>s+(p.rank||0),0)/f.length:null,
    top3:Math.round(ps.filter(p=>p.rank!==null&&p.rank<=3).length/n*100),
    top10:Math.round(ps.filter(p=>p.rank!==null&&p.rank<=10).length/n*100),
    found:f.length,
  }
}
export async function GET(req:NextRequest){
  if(!(await allowed()))return NextResponse.json({error:'Unauthorized'},{status:401})
  const x=read(req)
  return NextResponse.json(blank(x,process.env.SERPAPI_KEY?undefined:'SERPAPI_KEY is not configured.'))
}
export async function POST(req:NextRequest){
  if(!(await allowed()))return NextResponse.json({error:'Unauthorized'},{status:401})
  const x=read(req),key=process.env.SERPAPI_KEY
  if(!key)return NextResponse.json(blank(x,'SERPAPI_KEY is not configured. No rankings were guessed or simulated.'),{status:503})
  const half=(x.gridSize-1)/2,step=(x.radiusMiles*2)/(x.gridSize-1),base:P[]=[]
  for(let row=0;row<x.gridSize;row++)for(let col=0;col<x.gridSize;col++){
    const c=move((half-row)*step,(col-half)*step)
    base.push({id:`${row}-${col}`,row,col,...c,rank:null})
  }
  try{
    const points:P[]=[]
    for(let i=0;i<base.length;i+=3)points.push(...await Promise.all(base.slice(i,i+3).map(p=>scan(x.keyword,p,key))))
    return NextResponse.json({configured:true,provider:'SerpApi',...x,scannedAt:new Date().toISOString(),points,metrics:metrics(points)})
  }catch(e){
    return NextResponse.json({...blank(x,e instanceof Error?e.message:'Scan failed'),configured:true,provider:'SerpApi'},{status:502})
  }
}
