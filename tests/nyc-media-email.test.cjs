const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, mocks={}, env={}) {
 const output = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(output,{module,exports:module.exports,process:{env},console:{log(){},warn(){},error(){}},Buffer,Date,URL,encodeURIComponent,fetch:mocks.__fetch||fetch,require(id){if(id==='__fetch')throw new Error('Unexpected import __fetch');if(id in mocks)return mocks[id];throw new Error('Unexpected import '+id)}},{filename:file})
 return module.exports
}
const location=load('lib/scEmail.ts')
const business={email:location.NYC_EMAIL_ADDRESS,emailHref:location.nycEmailHref(),name:'Friendly Party Rental',legalName:'Friendly Party Rental',phone:'315-884-1498',address:'Riverdale, NY'}
const response={json(body,options={}){return {body,status:options.status||200}}}
for(const subject of ['New contact inquiry','New order #QA-TEST','Re: [Downstate New York] Inquiry','[Downstate New York] Inquiry','[Downstate New York] [Downstate New York] Inquiry','hello\r\nBcc: invalid']) {
 test('subject tag is safe and idempotent: '+subject,()=>{
  const labeled=location.nycEmailSubject(subject)
  assert.ok(labeled.startsWith('[Downstate New York] '));assert.ok(!/[\r\n]/.test(labeled));assert.equal(location.nycEmailSubject(labeled),labeled)
 })
}
test('email link opens shared inbox with tagged subject and intact encoded body',()=>{
 const url=new URL(location.nycEmailHref('Question & date?','An example\nsecond line & text'))
 assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'customerservice@friendlypartyrental.com')
 assert.equal(url.searchParams.get('subject'),'[Downstate New York] Question & date?');assert.equal(url.searchParams.get('body'),'An example\nsecond line & text')
})
for(const html of ['<p>Example notification</p>','<!doctype html><html><head><title>Test</title></head><body><p>Hello</p></body></html>']) {
 test('location banner appears once in HTML '+html.slice(0,20),()=>{
  const branded=location.nycEmailHtml(html);assert.equal(location.nycEmailHtml(branded),branded);assert.ok(branded.includes('NYC / DOWNSTATE NEW YORK'));assert.ok(branded.includes('fpr-nyc-production.up.railway.app'))
  if(html.includes('<body>')) assert.ok(branded.indexOf('data-fpr-location')>branded.indexOf('<body>'))
 })
}
function mailModule(sendMail,env={},fetchImpl) {return load('lib/email.ts',{'nodemailer':{createTransport(){return {sendMail}}},'@/lib/nycEmail':location,'@/lib/utils':{BUSINESS:business,formatDateTime:()=>''},...(fetchImpl?{__fetch:fetchImpl}:{})},env)}
test('missing SMTP credentials never simulate a sent message',async()=>{
 let sends=0;const mail=mailModule(()=>sends++)
 await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/not configured/)
 assert.equal(sends,0)
})

test('Resend sends transactional email without Gmail app password and preserves NYC envelope',async()=>{
 let smtpSends=0,request
 const mockFetch=async(url,options)=>{request={url,options,body:JSON.parse(options.body)};return {ok:true,status:200,async json(){return {id:'email_qa_mock'}},async text(){return ''}}}
 const mail=mailModule(()=>smtpSends++,{RESEND_API_KEY:'re_qa_not_real',RESEND_FROM:'Friendly Party Rental NYC <orders@friendlypartyrentalnyc.com>'},mockFetch)
 const result=await mail.sendEmail({to:'customerservice@fpr-nyc-production.up.railway.app',subject:'New contact inquiry',html:'<p>Test only</p>',replyTo:'customer@example.invalid'})
 assert.equal(result.success,true);assert.equal(result.provider,'resend');assert.equal(smtpSends,0)
 assert.equal(request.url,'https://api.resend.com/emails')
 assert.equal(request.body.to[0],business.email);assert.equal(request.body.reply_to[0],'customer@example.invalid')
 assert.equal(request.body.from,'Friendly Party Rental NYC <orders@friendlypartyrentalnyc.com>')
 assert.equal(request.body.subject,'[Downstate New York] New contact inquiry')
 assert.equal(request.body.headers['X-FPR-Location'],'nyc-downstate')
 assert.ok(request.body.html.includes('data-fpr-location'));assert.ok(request.body.text.startsWith('NYC / DOWNSTATE NEW YORK'))
})
test('Resend provider failure is propagated and never falls through to SMTP',async()=>{
 let smtpSends=0
 const mockFetch=async()=>({ok:false,status:403,async text(){return 'domain not verified'},async json(){return {}}})
 const mail=mailModule(()=>smtpSends++,{RESEND_API_KEY:'re_qa_not_real',RESEND_FROM:'Friendly Party Rental NYC <orders@friendlypartyrentalnyc.com>',EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'},mockFetch)
 await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/could not be delivered/)
 assert.equal(smtpSends,0)
})
test('provider failure is propagated instead of returning a false success',async()=>{
 const mail=mailModule(async()=>{throw Error('fake provider outage')},{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
 await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/could not be delivered/)
})
test('message headers, inbox, sender name and customer Reply-To identify SC',async()=>{
 let message;const mail=mailModule(async payload=>{message=payload;return {accepted:[payload.to],rejected:[],messageId:'qa-mock-only'}},{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
 const result=await mail.sendEmail({to:'customerservice@fpr-nyc-production.up.railway.app',subject:'New contact inquiry',html:'<p>Test only</p>',replyTo:'customer@example.invalid'})
 assert.equal(result.success,true);assert.equal(result.simulated,false)
 assert.equal(message.to,business.email);assert.equal(message.replyTo,'customer@example.invalid');assert.equal(message.from.name,'Friendly Party Rental - Downstate New York');assert.equal(message.from.address,'sender@example.invalid')
 assert.equal(message.subject,'[Downstate New York] New contact inquiry');assert.equal(message.headers['X-FPR-Location'],'greenville-sc');assert.ok(message.html.includes('data-fpr-location'));assert.ok(message.text.startsWith('NYC / DOWNSTATE NEW YORK'))
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/sc-email-preview.html',message.html);fs.writeFileSync('test-results/sc-email-envelope.json',JSON.stringify({from:message.from,to:message.to,replyTo:message.replyTo,subject:message.subject,headers:message.headers,actualEmailSent:false},null,2))
})
function contact(send) {
 const saved=[];const sent=[]
 const route=load('app/api/contact/route.ts',{'next/server':{NextResponse:response},'@/lib/prisma':{prisma:{contactMessage:{async create(record){saved.push(record)}}}},'@/lib/nycEmail':location,'@/lib/email':{contactFormEmail(){return {subject:'New contact inquiry',html:'<p>Mock inquiry</p>'}},async sendEmail(args){sent.push(args);return send(args)}}})
 return {route,saved,sent}
}
const inquiry={name:'QA Example',email:'qa@example.invalid',phone:'202-555-0100',message:'QA mock inquiry only, not a live submission.',elapsedMs:4000}
test('contact is retained and direct email offered when server sending is unavailable',async()=>{
 const {route,saved}=contact(async()=>{throw Error('unconfigured')});const r=await route.POST({json:async()=>inquiry})
 assert.equal(saved.length,1);assert.equal(r.status,202);assert.equal(r.body.saved,true);assert.equal(r.body.notificationSent,false);assert.ok(r.body.emailHref.includes('South%20Carolina'))
})
test('contact goes to central inbox and replies return to the actual submitter',async()=>{
 const {route,saved,sent}=contact(async()=>({success:true}));const r=await route.POST({json:async()=>inquiry})
 assert.equal(saved.length,1);assert.equal(r.status,200);assert.equal(r.body.notificationSent,true);assert.equal(sent[0].to,business.email);assert.equal(sent[0].replyTo,inquiry.email)
})
test('invalid contact email creates no record and sends nothing',async()=>{
 const {route,saved,sent}=contact(async()=>{});const r=await route.POST({json:async()=>({...inquiry,email:'bad\r\naddress'})})
 assert.equal(r.status,400);assert.equal(saved.length,0);assert.equal(sent.length,0)
})
test('public sender diagnostic contains no credentials and does not claim active SMTP',async()=>{
 const {route}=contact(async()=>{});const r=await route.GET();assert.equal(r.body.notificationsEnabled,false);assert.equal(r.body.email,business.email);assert.equal(Object.keys(r.body).length,3)
})
test('all category assets exist and five wedding previews are SC-local build snapshots',()=>{
 const categories=load('lib/scCategoryImages.ts').NYC_CATEGORY_IMAGES;assert.equal(Object.keys(categories).length,19);assert.ok(categories['order-by-date'])
 const weddings=load('lib/scWeddingImages.ts').NYC_WEDDING_IMAGES;assert.equal(new Set(Object.values(weddings)).size,5)
 for(const file of Object.values(categories))assert.ok(fs.existsSync(path.join('public',file)),file)
 for(const url of Object.values(weddings)){assert.ok(url.startsWith('/api/wedding-art/'));assert.ok(!url.includes('friendlypartyrental.com'))}
 const capture=fs.readFileSync('scripts/snapshot-ny-wedding-art.mjs','utf8');assert.ok(capture.includes('public'));assert.ok(capture.includes('ny-parity'));assert.ok(capture.includes('weddings'))
})
test('audited item references are revision-locked and have real image files',()=>{
 const media=load('lib/scItemMedia.ts').NYC_ITEM_MEDIA;assert.equal(Object.keys(media).length,29)
 for(const row of Object.values(media)){assert.ok(row.updatedAt);assert.equal(row.reference,true);assert.ok(fs.existsSync(path.join('public',row.path)))}
 const route=fs.readFileSync('app/api/item-image/[slug]/route.ts','utf8');assert.ok(route.includes('item.updatedAt.toISOString() === media.updatedAt'));assert.ok(route.includes('NYC_WEDDING_ITEM_TO_PACKAGE[slug]'));assert.ok(route.indexOf('NYC_WEDDING_ITEM_TO_PACKAGE[slug]')<route.indexOf('const media = NYC_ITEM_MEDIA[slug]'))
})
test('desktop planning pictures and original mobile video/category order are preserved',()=>{
 const mobile=fs.readFileSync('components/public/MobileHome.tsx','utf8');assert.ok(!mobile.includes('<PlanningShortcuts'));assert.ok(mobile.includes('<HomeYouTube/>'));assert.ok(mobile.includes('<HomeCategoryGrid'));assert.ok(mobile.indexOf('<HomeYouTube/>')<mobile.indexOf('<HomeCategoryGrid'))
 const desktop=fs.readFileSync('app/(public)/page.tsx','utf8');assert.ok(desktop.includes('<PlanningShortcuts />'))
})
test('customer-facing contact links no longer advertise a separate unconfigured SC mailbox',()=>{
 for(const file of ['components/public/Header.tsx','components/public/MobileHeader.tsx','components/public/Footer.tsx','app/(public)/contact_us/page.tsx','app/(public)/employment/page.tsx']) {
  const text=fs.readFileSync(file,'utf8');assert.ok(text.includes('BUSINESS.emailHref'),file);assert.ok(!text.includes('mailto:customerservice@fpr-nyc-production.up.railway.app'),file)
 }
})

for (const result of [{accepted:[],rejected:[]},{accepted:[],rejected:['recipient@example.invalid']},{accepted:['one@example.invalid'],rejected:['two@example.invalid']},undefined]) {
 test('empty or partially rejected SMTP response never counts as sent: '+JSON.stringify(result),async()=>{
  const mail=mailModule(async()=>result,{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
  await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/could not be delivered/)
 })
}
for (const [port,secure] of [['465',true],['587',false],['2525',false]]) {
 test('SMTP TLS mode matches submission port '+port,()=>{
  let options
  load('lib/email.ts',{'nodemailer':{createTransport(value){options=value;return {sendMail:async()=>({accepted:[],rejected:[]})}}},'@/lib/nycEmail':location,'@/lib/utils':{BUSINESS:business,formatDateTime:()=>''}}, {EMAIL_PORT:port})
  assert.equal(options.secure,secure);assert.equal(options.requireTLS,!secure)
  assert.equal(options.connectionTimeout,10000);assert.equal(options.socketTimeout,20000)
 })
}
