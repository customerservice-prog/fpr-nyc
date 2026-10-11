const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
test('Riverdale design page keeps the walkthrough and exposes the same free planner flow as Friendly',()=>{
 const page=fs.readFileSync('app/(public)/design-your-event/page.tsx','utf8')
 assert.match(page,/id="quick-demo"/)
 assert.match(page,/32-second walkthrough/)
 assert.match(page,/<RentSketchBookingEntry/)
 assert.match(page,/nycRentSketchDesignerUrl/)
 assert.match(page,/Plan My Event — Free/)
 assert.match(page,/Review & Quote/)
 assert.match(page,/productSlug=\{item.slug\}/)
 assert.doesNotMatch(page,/nycOrderAccessUrl|rentsketch.com\/demo\//)
})

test('the RentSketch film exposes valid English descriptions for its complete 32-second timeline',()=>{
 const deps={
  '@/app/(public)/design-your-event/design.module.css':{},
  './eventDesignPlayback':{attachEventDesignPlayback:()=>{}},
  '@/lib/gtag':{trackEvent:()=>{}},
  '@/lib/nycRentSketch':{nycRentSketchDesignerUrl:()=> 'https://rentsketch.com/designer/?tenant=friendly-nyc'},
 }
 const context={exports:{},require:name=>deps[name]||require(name)}
 const code=ts.transpileModule(fs.readFileSync('components/public/EventDesignVideo.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 vm.runInNewContext(code,context)
 const html=renderToStaticMarkup(React.createElement(context.exports.default))
 assert.match(html,/<track kind="captions" src="\/videos\/event-design-walkthrough-v2.vtt" srcLang="en" label="English descriptions"\/>/)
 const text=fs.readFileSync('public/videos/event-design-walkthrough-v2.vtt','utf8')
 assert.match(text,/^WEBVTT\n/)
 const cues=[...text.matchAll(/(\d\d):(\d\d\.\d{3}) --> (\d\d):(\d\d\.\d{3})\n([^\n]+)/g)]
 assert.equal(cues.length,6)
 let previousEnd=0
 for(const cue of cues){
  const start=Number(cue[1])*60+Number(cue[2]),end=Number(cue[3])*60+Number(cue[4])
  assert.equal(start,previousEnd,'descriptions must cover the next chapter without a gap')
  assert.ok(end>start&&end<=32)
  assert.ok(cue[5].trim())
  previousEnd=end
 }
 assert.equal(previousEnd,32)
 assert.match(text,/Review & Quote.*Friendly Party Rental NYC/)
 assert.match(text,/Rainbow Castle Bounce House/)
 assert.match(html,/Rainbow Castle Bounce House/)
 assert.doesNotMatch(text,/Crayon Bounce House/)
 assert.doesNotMatch(html,/Crayon Bounce House/)
})
