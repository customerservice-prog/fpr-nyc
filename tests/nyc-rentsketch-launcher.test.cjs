const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(path, deps = {}, globals = {}) {
  const context = { exports: {}, URLSearchParams, console, ...globals, require: name => deps[name] || require(name) }
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, context)
  return context.exports
}
const helper = load('lib/nycRentSketch.ts')
const booking = load('lib/rentsketchBooking.ts')

test('only actual standalone tent rentals receive tent preview actions',()=>{
  for(const name of ['20x20 Pole Tent','20x30 Pole Tent','20x40 Pole Tent','30 x 30 Pole Tent','30 x 45 Pole Tent','30 x 60 Pole Tent','40 x 40 Pole Tent','40x60 Pole Tent','40 x 80 Pole Tent','40 x 100 Pole Tent','20 x 20 Frame Tent','20 x 30 Frame Tent','20 x 40 Frame Tent','30x40 Classic Frame Tent','10 x 10 EZ Pop Up Canopy Tent','10 x 20 EZ Pop Up Canopy Tent'])assert.equal(helper.isActualTentItem(name),true,name)
  for(const name of ['10x10 Pop-Up Sidewall',"20' Side Wall Tent","20' Side Wall with Windows",'Tent Misting 10x10 Pop Up Tent','20x20 Tent Package – 4 Tables & 32 Chairs','20x30 Tent + 8 Tables + 64 Chairs Package','30x30 Tent Package – 8 Tables & 80 Chairs','Linen Tent Package','Tent Accessory 20x20',...['20x20','20x30','20x40','30x30','30x45','30x60','40x40','40x60','40x80','40x100'].map(size=>'Tent Lighting ('+size+')')])assert.equal(helper.isActualTentItem(name),false,name)
  const card=fs.readFileSync('components/public/ItemCard.tsx','utf8')
  const page=fs.readFileSync('app/(public)/items/[...slug]/page.tsx','utf8')
  assert.match(card,/const isTent=!isPackage&&isActualTentItem\(name\)/)
  assert.match(page,/const isStandaloneTent = isActualTentItem\(item.name\)/)
})

test('planner URLs preserve NYC tenant, inflatable contract, parent origin and 2D retry', () => {
  const plain = new URL(helper.nycRentSketchDesignerUrl('home_designer_section'))
  assert.equal(plain.searchParams.get('tenant'), 'friendly-nyc')
  const preview = new URL(helper.nycRentSketchEmbedUrl({source:'starter',name:'Rainbow Castle Bounce House',slug:'crayon-bounce-house',productType:'inflatable',view:'2d',parentOrigin:'https://friendlypartyrentalnyc.com',retry:1}))
  for (const [key,value] of Object.entries({tenant:'friendly-nyc',embed:'1',product:'Rainbow Castle Bounce House',productSlug:'crayon-bounce-house',focus:'inflatable',autoplace:'1',view:'2d',parentOrigin:'https://friendlypartyrentalnyc.com',retry:'1',source:'starter'})) assert.equal(preview.searchParams.get(key),value,key)
  assert.equal(preview.searchParams.has('productName'),false)
})

test('rental CTA has a usable NYC launch URL before hydration', () => {
  const CTA = load('components/public/DesignYourEventCTA.tsx', {'@/lib/nycRentSketch':helper,'next/link':()=>null}).default
  const html = renderToStaticMarkup(React.createElement(CTA,{source:'starter',product:'Water Slide',productSlug:'tidal-wave-inflatable-water-slide',productType:'inflatable'}))
  assert.match(html, /href="https:\/\/rentsketch.com\/designer\/\?tenant=friendly-nyc/)
  assert.match(html, /productSlug=tidal-wave-inflatable-water-slide/)
})

function harness() {
  const states=[], listeners=new Map(), effects=[], cleanups=[]; let cursor=0, frame
  const assigned=[]
  const window={ location:{origin:'https://friendlypartyrentalnyc.com',assign:url=>assigned.push(url)},history:{pushState(){},back(){}},scrollY:0,scrollTo(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)} }
  const react={useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef:()=>({current:null}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),createElement:(type,props,...children)=>{if(type==='iframe'){frame={contentWindow:{}};props.ref.current=frame}return{type,props,children}}}
  const document={documentElement:{style:{}},body:{style:{}}}
  const Launcher=load('components/public/DesignYourEventLauncher.tsx', {'react':react,'next/link':'link','lucide-react':{X:'close'},'@/lib/nycRentSketch':helper,'@/lib/rentsketchBooking':booking},{window,document,setTimeout:()=>1,clearTimeout(){}}).default
  function render(){cleanups.splice(0).forEach(fn=>fn());cursor=0;const tree=Launcher();effects.splice(0).forEach(fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup)});return tree}
  render();listeners.get('open-design-your-event')({detail:{source:'test'}});render()
  const message=(data,source=frame.contentWindow,origin='https://rentsketch.com')=>listeners.get('message')({data,source,origin})
  return {message,assigned,render}
}

test('embedded booking accepts only its own NYC iframe and validates the selection',()=>{
  const h=harness()
  const selection={version:1,tenant:'friendly-nyc',designId:'test-layout-123',eventDate:'2026-11-14',items:[{slug:'20x20-pole-tent-package',quantity:1}]}
  const data={type:'rentsketch.bookingRequested',tenant:'friendly-nyc',booking:selection}
  h.message(data,{},'https://rentsketch.com')
  h.message(data,undefined,'https://evil.example')
  h.message({...data,tenant:'friendly'})
  h.message({...data,booking:{...selection,tenant:'friendly'}})
  assert.equal(h.assigned.length,0)
  h.message(data)
  assert.equal(h.assigned.length,1)
  const accepted=JSON.parse(decodeURIComponent(h.assigned[0].split('#layout=')[1]))
  assert.equal(accepted.tenant,'friendly-nyc')
  assert.equal(accepted.source,'test')
  assert.equal(accepted.items[0].quantity,1)
})

test('generic designer errors offer a 2D retry without inventing a rental selection',()=>{
  const h=harness()
  h.message({type:'rentsketch.error',tenant:'friendly-nyc',reason:'3D unavailable'})
  function find(tree,predicate){
    if(!tree||typeof tree!=='object')return null
    if(predicate(tree))return tree
    for(const child of tree.children||[]){const found=find(child,predicate);if(found)return found}
    return null
  }
  const fallback=find(h.render(),node=>node.type==='button'&&node.children.includes('Open in 2D'))
  assert.ok(fallback,'a generic event plan must offer the same 2D fallback as a rental preview')
  fallback.props.onClick()
  const frame=find(h.render(),node=>node.type==='iframe')
  const url=new URL(frame.props.src)
  for(const [key,value] of Object.entries({tenant:'friendly-nyc',source:'test',view:'2d',embed:'1',parentOrigin:'https://friendlypartyrentalnyc.com',retry:'1'}))assert.equal(url.searchParams.get(key),value,key)
  for(const key of ['product','productSlug','tent','tentSlug','focus','autoplace'])assert.equal(url.searchParams.has(key),false,key)
})
