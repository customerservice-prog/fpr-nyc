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

function harness({graphics='webgl2',extensionAvailable=true,contextLost=false,cleanupFailure='',launch={source:'test'}}={}) {
  const states=[], listeners=new Map(), effects=[], cleanups=[]; let cursor=0, frame
  const assigned=[]
  function element(inertAttribute=null){
    const attributes=new Map(inertAttribute===null?[]:[['inert',inertAttribute]])
    return {style:{},children:[],parentElement:null,getAttribute:key=>attributes.get(key)??null,setAttribute:(key,value)=>attributes.set(key,value),removeAttribute:key=>attributes.delete(key),get inert(){return attributes.has('inert')},set inert(value){if(value)attributes.set('inert','');else attributes.delete('inert')}}
  }
  function append(parent,child){parent.children.push(child);child.parentElement=parent;return child}
  const body=element(),root=append(body,element()),nested=append(root,element()),overlayParent=append(nested,element()),overlay=append(overlayParent,element())
  const background=[append(overlayParent,element()),append(nested,element()),append(root,element()),append(body,element('already-disabled'))]
  const document={documentElement:{style:{}},body}
  const probeCalls=[]
  let graphicsReleases=0
  const graphicsContext={isContextLost:()=>contextLost,getExtension:name=>{
    assert.equal(name,'WEBGL_lose_context')
    if(cleanupFailure==='extension')throw new Error('Optional release extension unavailable')
    return extensionAvailable?{loseContext:()=>{graphicsReleases++;if(cleanupFailure==='release')throw new Error('Optional context release failed')}}:null
  }}
  document.createElement=tag=>{
    assert.equal(tag,'canvas')
    probeCalls.push(tag)
    return {getContext:type=>{
      probeCalls.push(type)
      if(graphics==='throws')throw new Error('Graphics context blocked')
      return type===graphics?graphicsContext:null
    }}
  }
  const opener={isConnected:true,focus:()=>{document.activeElement=opener}}
  document.activeElement=opener
  let closeControl,backCalls=0
  const window={ location:{origin:'https://friendlypartyrentalnyc.com',assign:url=>assigned.push(url)},history:{state:null,pushState(state){this.state=state},back(){backCalls++}},scrollY:0,scrollTo(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)} }
  const react={useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef:()=>({current:null}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),createElement:(type,props,...children)=>{if(type==='iframe'){frame={contentWindow:{}};props.ref.current=frame}if(type==='button'&&props.ref){closeControl={isConnected:true,focus:()=>{document.activeElement=closeControl}};props.ref.current=closeControl}if(type==='div'&&props.ref)props.ref.current=overlay;return{type,props,children}}}
  const viewHelper=load('lib/nycRentSketchView.ts',{}, {document})
  const Launcher=load('components/public/DesignYourEventLauncher.tsx', {'react':react,'next/link':'link','lucide-react':{X:'close'},'@/lib/nycRentSketch':helper,'@/lib/nycRentSketchView':viewHelper,'@/lib/rentsketchBooking':booking},{window,document,setTimeout:()=>1,clearTimeout(){}}).default
  function render(){cleanups.splice(0).forEach(fn=>fn());cursor=0;const tree=Launcher();effects.splice(0).forEach(fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup)});return tree}
  render();listeners.get('open-design-your-event')({detail:launch});render()
  const message=(data,source=frame.contentWindow,origin='https://rentsketch.com')=>listeners.get('message')({data,source,origin})
  return {message,assigned,render,probeCalls,get graphicsReleases(){return graphicsReleases},keydown:event=>listeners.get('keydown')?.(event),get activeElement(){return document.activeElement},get closeControl(){return closeControl},opener,background,overlay,ancestors:[overlayParent,nested,root,body],get backCalls(){return backCalls},get hasKeyboardListener(){return listeners.has('keydown')}}
}

test('actual launch handler selects usable graphics immediately and preserves the rental contract',()=>{
  function iframe(tree){
    if(!tree||typeof tree!=='object')return null
    if(tree.type==='iframe')return tree
    for(const child of tree.children||[]){const found=iframe(child);if(found)return found}
    return null
  }
  const launch={source:'device_preview',view:'3d',product:'Rainbow Castle Bounce House',productSlug:'crayon-bounce-house',productType:'inflatable'}
  for(const [graphics,expectedView,calls,releases] of [
    ['webgl2','3d',['canvas','webgl2'],1],
    ['webgl','3d',['canvas','webgl2','webgl'],1],
    ['none','2d',['canvas','webgl2','webgl'],0],
    ['throws','2d',['canvas','webgl2'],0],
  ]){
    const h=harness({graphics,launch})
    const url=new URL(iframe(h.render()).props.src)
    for(const [key,value] of Object.entries({tenant:'friendly-nyc',source:'device_preview',view:expectedView,product:'Rainbow Castle Bounce House',productSlug:'crayon-bounce-house',focus:'inflatable',autoplace:'1',parentOrigin:'https://friendlypartyrentalnyc.com'}))assert.equal(url.searchParams.get(key),value,graphics+': '+key)
    assert.deepEqual(h.probeCalls,calls)
    assert.equal(h.graphicsReleases,releases)
  }
  const explicit=harness({graphics:'throws',launch:{...launch,view:'2d'}})
  assert.equal(new URL(iframe(explicit.render()).props.src).searchParams.get('view'),'2d')
  assert.deepEqual(explicit.probeCalls,[],'an explicit 2D request must not allocate a graphics context')
  const withoutReleaseExtension=harness({graphics:'webgl',extensionAvailable:false,launch})
  assert.equal(new URL(iframe(withoutReleaseExtension.render()).props.src).searchParams.get('view'),'3d')
  assert.equal(withoutReleaseExtension.graphicsReleases,0)
  for(const cleanupFailure of ['extension','release']){
    const usable=harness({graphics:'webgl2',cleanupFailure,launch})
    assert.equal(new URL(iframe(usable.render()).props.src).searchParams.get('view'),'3d','optional cleanup failure cannot reject a valid context')
  }
  const lost=harness({graphics:'webgl2',contextLost:true,launch})
  assert.equal(new URL(iframe(lost.render()).props.src).searchParams.get('view'),'2d','a returned but lost context cannot provide 3D')
  assert.equal(lost.graphicsReleases,1)
})

test('keyboard opens on the close control, Escape closes and restores the same opener',()=>{
  const h=harness()
  assert.equal(h.activeElement,h.closeControl)
  assert.equal(h.hasKeyboardListener,true)
  h.keydown({key:'Enter',defaultPrevented:false,preventDefault(){throw new Error('unrelated keys must be left alone')}})
  assert.equal(h.backCalls,0)
  h.keydown({key:'Escape',defaultPrevented:true,preventDefault(){throw new Error('handled keys must be left alone')}})
  assert.equal(h.backCalls,0)
  let prevented=false
  h.keydown({key:'Escape',defaultPrevented:false,preventDefault(){prevented=true}})
  assert.equal(prevented,true)
  assert.equal(h.backCalls,1)
  assert.equal(h.render(),null)
  assert.equal(h.activeElement,h.opener)
  assert.equal(h.hasKeyboardListener,false)
})

test('a nested designer leaves its ancestor path usable and restores exact background inert states',()=>{
  const h=harness()
  assert.equal(h.background.length,4)
  for(const node of h.background)assert.equal(node.inert,true,'background siblings at every ancestor level must be inert')
  for(const node of [h.overlay,...h.ancestors])assert.equal(node.inert,false,'the designer and its ancestor path must remain usable')
  h.keydown({key:'Escape',defaultPrevented:false,preventDefault(){}})
  assert.equal(h.render(),null)
  for(const node of h.background.slice(0,3))assert.equal(node.getAttribute('inert'),null,'previously interactive siblings must be restored')
  assert.equal(h.background[3].getAttribute('inert'),'already-disabled','preexisting inert attributes must be preserved exactly')
  assert.equal(h.activeElement,h.opener)
})

test('error and success panels keep close and recovery handlers inside scrollable mobile content',()=>{
  function find(tree,predicate){
    if(!tree||typeof tree!=='object')return null
    if(predicate(tree))return tree
    for(const child of tree.children||[]){const found=find(child,predicate);if(found)return found}
    return null
  }
  for(const state of ['error','success']){
    const h=harness(),reason='A long diagnostic message '.repeat(40)
    h.message(state==='error'?{type:'rentsketch.error',tenant:'friendly-nyc',reason}:{type:'rentsketch.quoteRequested',tenant:'friendly-nyc'})
    const tree=h.render(),panel=find(tree,node=>node.props?.key===state)
    assert.ok(panel)
    assert.match(panel.props.className,/overflow-y-auto overscroll-contain/)
    assert.match(panel.children[0].props.className,/min-h-full/)
    const close=find(tree,node=>node.props?.['aria-label']==='Close Event Designer')
    assert.ok(close,'The close control stays outside scrollable panel content')
    assert.match(close.props.className,/min-w-11 min-h-11/)
    if(state==='error'){
      assert.match(find(panel,node=>node.props?.key==='msg').children[0],/continue planning in 2D/)
      assert.equal(find(panel,node=>node.props?.key==='reason').children[0],reason.trim())
      const retry=find(panel,node=>node.children?.includes('Open in 2D'))
      assert.match(retry.props.className,/min-h-11/)
      retry.props.onClick()
      assert.equal(new URL(find(h.render(),node=>node.type==='iframe').props.src).searchParams.get('view'),'2d')
    }else{
      const returning=find(panel,node=>node.props?.key==='return')
      assert.match(returning.props.className,/min-h-11/)
      returning.props.onClick()
      assert.equal(h.render(),null)
      assert.equal(h.activeElement,h.opener)
    }
  }
})

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
