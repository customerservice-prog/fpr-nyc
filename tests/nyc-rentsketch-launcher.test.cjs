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
